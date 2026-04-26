import { NextRequest, NextResponse } from 'next/server';
import {
  deleteIntegrationSessionPhoto,
  listIntegrationSessionPhotos,
  uploadIntegrationSessionPhoto,
} from '@/lib/integration-client';
import { handleIntegrationRouteError } from '@/app/api/integration/utils';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const response = await listIntegrationSessionPhotos(id);
    return NextResponse.json(response);
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to fetch session photos');
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = await request.formData();
    const file = input.get('file');
    const caption = input.get('caption');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const formData = new FormData();
    formData.set('file', file);
    if (typeof caption === 'string' && caption.trim()) {
      formData.set('caption', caption.trim());
    }

    const response = await uploadIntegrationSessionPhoto(id, formData);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to upload session photo');
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const photoId = request.nextUrl.searchParams.get('photoId');
    if (!photoId) {
      return NextResponse.json({ error: 'photoId is required' }, { status: 400 });
    }

    const response = await deleteIntegrationSessionPhoto(id, photoId);
    return NextResponse.json(response);
  } catch (error) {
    return handleIntegrationRouteError(error, 'Failed to delete session photo');
  }
}
