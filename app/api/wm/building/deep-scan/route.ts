import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

interface DeepScanData {
    images: string[];
    drawings: string[];
    facts: Record<string, string>;
    cvuOutline: string | null;
    cvuFacts: Record<string, string>;
    source?: string;
    warning?: string;
}

const BLOCKED_PATTERNS = ["enable javascript and cookies", "cf_chl", "challenge-platform", "just a moment"];

function emptyData(source = "none"): DeepScanData {
    return { images: [], drawings: [], facts: {}, cvuOutline: null, cvuFacts: {}, source };
}

function cleanText(value: string | null | undefined): string {
    return (value || "").replace(/\s+/g, " ").trim();
}

function absolutize(url: string, baseUrl: string): string | null {
    try {
        return new URL(url, baseUrl).toString();
    } catch {
        return null;
    }
}

function addFact(facts: Record<string, string>, label: string | null | undefined, value: string | null | undefined) {
    const key = cleanText(label).replace(/[:#]+$/, "");
    const val = cleanText(value);
    if (!key || !val || key.length > 70 || val.length > 260) return;
    const lower = key.toLowerCase();
    if (["search", "menu", "login", "share", "more", "home"].includes(lower)) return;
    facts[key] = val;
}

function normalizeImages(images: string[]): string[] {
    const valid = Array.from(new Set(images)).filter((image) => {
        const lower = image.toLowerCase();
        return lower.startsWith("http")
            && !lower.includes("logo")
            && !lower.includes("avatar")
            && !lower.includes("sprite")
            && !lower.includes("spacer")
            && !lower.includes("blank")
            && !lower.includes("pixel")
            && !lower.includes("/icons/");
    });
    const best = new Map<string, { url: string; score: number }>();
    for (const image of valid) {
        const key = image
            .replace(/\/(?:thumb|small|medium|large|newsletter)(?:_[a-z0-9]+)?\//i, "/")
            .replace(/[?#].*$/, "");
        const lower = image.toLowerCase();
        const score = lower.includes("/large_") ? 4 : lower.includes("/medium_") ? 3 : lower.includes("/small_") ? 2 : lower.includes("/thumb_") ? 1 : 5;
        const old = best.get(key);
        if (!old || score > old.score) best.set(key, { url: image, score });
    }
    return Array.from(best.values()).map(x => x.url).slice(0, 36);
}

function parseHtml(targetUrl: string, html: string): DeepScanData {
    const data = emptyData("html");
    const $ = cheerio.load(html);

    const title = cleanText($("h1").first().text() || $("title").first().text());
    addFact(data.facts, "Title", title.replace(/\s*\|\s*.*$/, ""));

    const images: string[] = [];
    const drawings: string[] = [];
    const drawing_words = /\b(plan|floor plan|site plan|section|elevation|axonometric|diagram|detail|drawing)\b/i;
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) {
        const resolved = absolutize(ogImage, targetUrl);
        if (resolved) images.push(resolved);
    }

    $('a[href], img[src], img[data-src], img[data-lazy-src], source[srcset]').each((_, el) => {
        const node = $(el);
        const href = node.attr("href");
        const raw = node.attr("data-src") || node.attr("data-lazy-src") || node.attr("src") || node.attr("srcset")?.split(",")[0]?.trim().split(" ")[0]
            || (href && /\.(?:avif|jpe?g|png|webp)(?:\?|$)/i.test(href) ? href : null);
        if (!raw) return;
        const resolved = absolutize(raw, targetUrl);
        if (!resolved) return;
        images.push(resolved);
        const context = cleanText([
            node.attr("alt"),
            node.attr("title"),
            node.closest("figure").find("figcaption").text(),
            node.closest("a").attr("href"),
            node.parent().attr("class"),
        ].filter(Boolean).join(" "));
        if (drawing_words.test(context)) drawings.push(resolved);
    });

    $("tr").each((_, tr) => {
        const cells = $(tr).find("th,td");
        if (cells.length >= 2) addFact(data.facts, $(cells[0]).text(), $(cells[1]).text());
    });
    $("dt").each((_, dt) => addFact(data.facts, $(dt).text(), $(dt).next("dd").text()));
    $('.building-fact, .fact, .stat, .data-row, [class*="fact"], [class*="detail"], [class*="metric"]').each((_, el) => {
        const node = $(el);
        const label = node.find('.building-fact-label, .label, .title, h3, h4, h5, strong').first().text();
        const value = node.find('.building-fact-value, .value, .number, .text, span, p').last().text();
        addFact(data.facts, label, value);
    });
    $(".afd-specs__key").each((_, el) => {
        const node = $(el);
        const parent = node.parent().clone();
        parent.find(".afd-specs__key").remove();
        const key = cleanText(node.text());
        let value = cleanText(parent.text());
        if (key.toLowerCase().startsWith("area")) value = value.match(/[\d,.]+\s*(?:m2|m²|ft2|ft²|sqm|sq\.?\s*ft)/i)?.[0] || value;
        if (key.toLowerCase().startsWith("year")) value = value.match(/\b(?:19|20)\d{2}\b/)?.[0] || value;
        addFact(data.facts, key, value);
    });

    const outline = $('.tab-drawing img[src*="building-outlines"], img[src*="building-outlines"], img[src*="drawing"], img[src*="outline"]').first().attr("src");
    if (outline) {
        data.cvuOutline = absolutize(outline, targetUrl);
        if (data.cvuOutline) drawings.push(data.cvuOutline);
    }

    data.drawings = normalizeImages(drawings);
    data.cvuOutline ||= data.drawings[0] || null;
    data.cvuFacts = data.drawings.length ? { drawings: String(data.drawings.length), source: new URL(targetUrl).hostname } : {};
    data.images = normalizeImages(images).filter(image => !data.drawings.includes(image));
    return data;
}

function isBlockedHtml(html: string): boolean {
    const lower = html.toLowerCase();
    return BLOCKED_PATTERNS.some((pattern) => lower.includes(pattern));
}

async function fetchHtml(targetUrl: string): Promise<string | null> {
    const res = await fetch(targetUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Akashic/1.0",
            Accept: "text/html,application/xhtml+xml"
        },
        signal: AbortSignal.timeout(9000)
    });
    return await res.text();
}

async function browserExtract(targetUrl: string): Promise<DeepScanData> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(12000);
        page.setDefaultTimeout(12000);
        await page.setRequestInterception(true);
        page.on("request", (req) => {
            const type = req.resourceType();
            if (["font", "media", "stylesheet"].includes(type)) req.abort();
            else req.continue();
        });
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
        const html = await page.content();
        const data = parseHtml(targetUrl, html);
        data.source = "browser";
        return data;
    } finally {
        if (browser) await browser.close();
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl || !targetUrl.startsWith("http")) {
        return NextResponse.json({ error: "Missing or invalid URL" }, { status: 400 });
    }

    try {
        const url = new URL(targetUrl);
        const host = url.hostname.toLowerCase();
        if (host !== "archdaily.com" && host !== "www.archdaily.com") {
            return NextResponse.json({ error: "unsupported building source" }, { status: 400 });
        }

        const html = await fetchHtml(targetUrl).catch(() => null);
        if (html && !isBlockedHtml(html)) {
            const parsed = parseHtml(targetUrl, html);
            if (parsed.images.length || parsed.drawings.length || Object.keys(parsed.facts).length || parsed.cvuOutline) return NextResponse.json(parsed);
        }

        const browserData = await browserExtract(targetUrl).catch((error) => {
            const data = emptyData("browser-error");
            data.warning = error instanceof Error ? error.message : "Browser extraction failed";
            return data;
        });

        if (!browserData.images.length && !browserData.drawings.length && !Object.keys(browserData.facts).length && !browserData.cvuOutline) {
            browserData.warning ||= "No structured building data was found on the target page.";
        }
        return NextResponse.json(browserData);
    } catch (error: any) {
        console.error("Deep Scan API Error:", error);
        return NextResponse.json({ error: error.message || "Deep scan failed" }, { status: 500 });
    }
}
