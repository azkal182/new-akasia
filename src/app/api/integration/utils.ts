import { NextResponse } from 'next/server';
import { z } from 'zod';
import { IntegrationApiError } from '@/lib/integration-client';

export function handleIntegrationRouteError(error: unknown, fallbackMessage: string) {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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

  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status: 500 });
}
