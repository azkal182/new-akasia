import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { startIntegrationSession } from '@/lib/integration-client';
import { handleIntegrationRouteError } from '@/app/api/integration/utils';

const startSessionSchema = z.object({
  scheduleId: z.string().min(1, 'scheduleId is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = startSessionSchema.parse(body);
    const response = await startIntegrationSession(payload);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to start integration session');
  }
}
