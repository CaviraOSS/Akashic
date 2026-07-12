export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { UNDERSEA_CABLES, NUCLEAR_FACILITIES } from '@/lib/worldmonitor/geo';
import { PIPELINES } from '@/lib/worldmonitor/pipelines';
export async function GET() {
  return NextResponse.json({
    cables: UNDERSEA_CABLES,
    pipelines: PIPELINES,
    nuclear: NUCLEAR_FACILITIES
  });
}
