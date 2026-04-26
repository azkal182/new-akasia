import { NextRequest, NextResponse } from 'next/server';
import {
  getDefaultIntegrationDivisionId,
  getFieldToday,
  IntegrationApiError,
} from '@/lib/integration-client';

export async function GET(request: NextRequest) {
  try {
    const divisionId =
      request.nextUrl.searchParams.get('divisionId') ?? getDefaultIntegrationDivisionId();
    const response = await getFieldToday(divisionId);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof IntegrationApiError) {
      return NextResponse.json(error.payload ?? { error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch integration field schedules';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
