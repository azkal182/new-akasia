import { NextRequest, NextResponse } from 'next/server';
import { getDivisionSchedules, IntegrationApiError } from '@/lib/integration-client';

type RouteContext = {
  params: Promise<{ divisionId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { divisionId } = await context.params;
    const date = request.nextUrl.searchParams.get('date') ?? undefined;

    const response = await getDivisionSchedules(divisionId, date);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof IntegrationApiError) {
      return NextResponse.json(error.payload ?? { error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch integration division schedules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
