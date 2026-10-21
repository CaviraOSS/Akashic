import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const map_src = readFileSync(join(root, "components", "map", "MapGlobe.tsx"), "utf8");

const tile_urls = [...map_src.matchAll(/tiles:\s*\[([^\]]+)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/https?:[^"'\s]+/g)].map((u) => u[0]));

function tiles_for(id) {
    const m = map_src.match(new RegExp(`${id}:\\s*\\{\\s*tiles:\\s*\\[([^\\]]+)\\]`));
    return m ? [...m[1].matchAll(/https?:[^"'\s]+/g)].map((u) => u[0]) : [];
}

test("basemap styles do not use carto tiles that now require an api key", () => {
    assert.equal(
        tile_urls.some((u) => u.includes("basemaps.cartocdn.com") || u.includes("cartodb")),
        false,
        `carto urls still present: ${tile_urls.filter((u) => u.includes("carto")).join(", ")}`,
    );
});

test("dark and light raster tiles return real map images instead of a watermark", async () => {
    const dark = tiles_for("dark")[0];
    const light = tiles_for("light_gray")[0];
    assert.ok(dark, "missing dark basemap tile url");
    assert.ok(light, "missing light basemap tile url");
    assert.notEqual(dark, light);

    for (const tmpl of [dark, light]) {
        const url = tmpl.replaceAll("{z}", "3").replaceAll("{y}", "2").replaceAll("{x}", "3").replaceAll("@2x", "");
        const res = await fetch(url);
        assert.equal(res.ok, true, `${url} -> ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        assert.ok(buf.byteLength > 4000, `${url} is ${buf.byteLength} bytes; watermark tiles are ~2.5kb`);
    }
});
