export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { CONFLICT_ZONES, MILITARY_BASES } from '@/lib/worldmonitor/geo';
export async function GET() {
  return NextResponse.json({
    conflicts: CONFLICT_ZONES,
    bases: MILITARY_BASES
  });
}
