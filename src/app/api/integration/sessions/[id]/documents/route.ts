import { NextRequest, NextResponse } from 'next/server';
import {
  deleteIntegrationSessionDocument,
  listIntegrationSessionDocuments,
  uploadIntegrationSessionDocument,
} from '@/lib/integration-client';
import { handleIntegrationRouteError } from '@/app/api/integration/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = await listIntegrationSessionDocuments(id);
    return NextResponse.json(response);
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to fetch session documents');
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = await request.formData();
    const file = input.get('file');
    const name = input.get('name');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const formData = new FormData();
    formData.set('file', file);
    if (typeof name === 'string' && name.trim()) {
      formData.set('name', name.trim());
    }

    const response = await uploadIntegrationSessionDocument(id, formData);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to upload session document');
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const documentId = request.nextUrl.searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }

    const response = await deleteIntegrationSessionDocument(id, documentId);
    return NextResponse.json(response);
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to delete session document');
  }
}
