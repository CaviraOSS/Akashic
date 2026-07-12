import { NextResponse } from "next/server";


export async function GET() {
  try {
    
    const res = await fetch(
      "https://www.treasury.gov/ofac/downloads/sdn.csv",
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(30000) }
    );
    if (!res.ok) throw new Error(`ofac ${res.status}`);
    const text = await res.text();

    
    const lines = text.split("\n").filter(l => l.trim());
    const sanctions = lines.slice(0, 200).map((line, i) => {
      const cols = line.split('","').map(c => c.replace(/^"|"$/g, ""));
      return {
        id: cols[0] || `sdn-${i}`,
        name: cols[1] || "unknown",
        type: cols[2] || "entity",
        programs: cols[3] || "",
        remarks: cols[11] || "",
      };
    }).filter(s => s.name && s.name !== "unknown");

    return NextResponse.json({ sanctions, count: sanctions.length, source: "US Treasury OFAC SDN" });
  } catch (err) {
    console.warn("[WM] sanctions fetch failed:", err);
    return NextResponse.json({ sanctions: [], count: 0, error: String(err) });
  }
}
