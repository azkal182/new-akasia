import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getDefaultIntegrationDivisionId,
  IntegrationApiError,
  submitDivisionReport,
  type IntegrationReportRequest,
} from '@/lib/integration-client';

const reportPayloadSchema = z
  .object({
    scheduleId: z.string().min(1, 'scheduleId is required'),
    status: z.enum(['COMPLETED', 'COMPLETED_WITH_ISSUE', 'NOT_EXECUTED']),
    issueNote: z.string().optional(),
    replaceEvidence: z.boolean().optional(),
    evidences: z
      .array(
        z.union([
          z.object({
            type: z.literal('PHOTO'),
            url: z.string().url(),
            caption: z.string().optional(),
          }),
          z.object({
            type: z.literal('DOCUMENT'),
            url: z.string().url(),
            filename: z.string().min(1),
          }),
        ]),
      )
      .optional(),
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

export async function POST(request: NextRequest) {
  try {
    const divisionId = getDefaultIntegrationDivisionId();
    const body = await request.json();
    const payload = reportPayloadSchema.parse(body) as IntegrationReportRequest;

    const response = await submitDivisionReport(divisionId, payload);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid payload',
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof IntegrationApiError) {
      return NextResponse.json(error.payload ?? { error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Failed to submit integration report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
