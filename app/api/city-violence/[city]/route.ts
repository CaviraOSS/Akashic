export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCityViolence } from "@/lib/live/city-violence";
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ city: string }> }
) {
    try {
        const { city } = await params;
        const key = decodeURIComponent(city);
        const data = await getCityViolence(key);
        return NextResponse.json(data, {
            headers: {
                "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
            },
        });
    } catch (err) {
        console.error("[CityViolence API]", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
