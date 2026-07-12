import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const public_ip = (raw: string) => {
    const ip = raw.toLowerCase().replace(/^\[|\]$/g, "");
    if (isIP(ip) === 4) {
        const [a, b] = ip.split(".").map(Number);
        return !(
            a === 0 || a === 10 || a === 127 || a >= 224 ||
            (a === 100 && b >= 64 && b <= 127) ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 198 && (b === 18 || b === 19))
        );
    }
    if (isIP(ip) === 6) {
        return !(
            ip === "::" || ip === "::1" || ip.startsWith("::ffff:") ||
            ip.startsWith("fc") || ip.startsWith("fd") ||
            /^fe[89ab]/.test(ip) || ip.startsWith("2001:db8:")
        );
    }
    return false;
};

const assert_public_url = async (url: URL) => {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported url protocol");
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) {
        throw new Error("private network target blocked");
    }
    if (isIP(host)) {
        if (!public_ip(host)) throw new Error("private network target blocked");
        return;
    }
    let addrs: Array<{ address: string; family: number }> = [];
    let last_error: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            addrs = await lookup(host, { all: true, verbatim: true });
            if (addrs.length) break;
        } catch (error) {
            last_error = error;
        }
        await wait(120 * (attempt + 1));
    }
    if (!addrs.length) throw last_error || new Error("host could not be resolved");
    if (addrs.some(addr => !public_ip(addr.address))) throw new Error("private network target blocked");
};

export const public_fetch = async (input: string | URL, init: RequestInit = {}, max_redirects = 6) => {
    let url = input instanceof URL ? input : new URL(input);
    for (let step = 0; step <= max_redirects; step++) {
        await assert_public_url(url);
        const res = await fetch(url, { ...init, redirect: "manual" });
        if (![301, 302, 303, 307, 308].includes(res.status)) return res;
        const location = res.headers.get("location");
        if (!location) return res;
        await res.body?.cancel().catch(() => undefined);
        url = new URL(location, url);
    }
    throw new Error("too many redirects");
};
