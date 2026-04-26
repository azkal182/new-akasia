import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getIntegrationSession, submitIntegrationSession } from '@/lib/integration-client';
import { handleIntegrationRouteError } from '@/app/api/integration/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const submitSessionSchema = z
  .object({
    status: z.enum(['COMPLETED', 'COMPLETED_WITH_ISSUE']),
    issueNote: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.status === 'COMPLETED_WITH_ISSUE' && !value.issueNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'issueNote is required when status is COMPLETED_WITH_ISSUE',
        path: ['issueNote'],
      });
    }
  });

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = await getIntegrationSession(id);
    return NextResponse.json(response);
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to fetch integration session');
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const payload = submitSessionSchema.parse(body);
    const response = await submitIntegrationSession(id, payload);
    return NextResponse.json(response);
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to submit integration session');
  }
}
