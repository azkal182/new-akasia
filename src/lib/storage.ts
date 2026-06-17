import 'server-only';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'akasia';

type StorageProvider = 'r2' | 'supabase';

type UploadObjectInput = {
  key: string;
  body: File | Buffer | Uint8Array;
  contentType: string;
  bucket?: string;
};

type UploadStorageObjectInput = UploadObjectInput;

let r2Client: S3Client | undefined;
let supabaseClient: SupabaseClient | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('replace-with-')) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalConfiguredEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('replace-with-')) return undefined;
  return value;
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function encodeObjectKey(key: string): string {
  return trimSlashes(key).split('/').map(encodeURIComponent).join('/');
}

function getProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase() || 'supabase';
  if (provider !== 'r2' && provider !== 'supabase') {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${provider}`);
  }
  return provider;
}

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = optionalConfiguredEnv('R2_ACCOUNT_ID');
    const endpoint =
      optionalConfiguredEnv('R2_ENDPOINT') ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');

    if (!endpoint) {
      throw new Error('R2_ENDPOINT or R2_ACCOUNT_ID is required');
    }

    r2Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return r2Client;
}

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    );
  }
  return supabaseClient;
}

async function toUploadBody(body: UploadObjectInput['body']): Promise<Buffer | Uint8Array> {
  if (body instanceof File) {
    return Buffer.from(await body.arrayBuffer());
  }
  return body;
}

async function uploadToR2(input: UploadObjectInput): Promise<string> {
  const bucket = input.bucket || requiredEnv('R2_BUCKET');
  const publicUrl = trimSlashes(requiredEnv('R2_PUBLIC_URL'));
  const key = trimSlashes(input.key);

  if (!key) {
    throw new Error('Storage object key cannot be empty');
  }

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: await toUploadBody(input.body),
      ContentType: input.contentType,
    })
  );

  return `${publicUrl}/${encodeObjectKey(key)}`;
}

async function uploadToSupabase(input: UploadObjectInput): Promise<string> {
  const bucket = input.bucket || process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const client = getSupabaseClient();
  const key = trimSlashes(input.key);

  if (!key) {
    throw new Error('Storage object key cannot be empty');
  }

  const { data, error } = await client.storage.from(bucket).upload(key, input.body, {
    contentType: input.contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload file to Supabase: ${error.message}`);
  }

  return client.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
}

export async function uploadObject(input: UploadObjectInput): Promise<string> {
  if (getProvider() === 'supabase') {
    return uploadToSupabase(input);
  }

  try {
    return await uploadToR2(input);
  } catch (error) {
    if (process.env.STORAGE_FALLBACK_TO_SUPABASE !== 'true') {
      throw error;
    }
    console.error('R2 upload failed, falling back to Supabase Storage:', error);
    return uploadToSupabase(input);
  }
}

export async function uploadStorageObject(input: UploadStorageObjectInput): Promise<string> {
  return uploadObject(input);
}

function objectKeyFromPublicUrl(fileUrl: string, publicUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const baseUrl = new URL(publicUrl);
    const basePath = baseUrl.pathname.replace(/\/+$/, '');

    if (url.origin !== baseUrl.origin || !url.pathname.startsWith(`${basePath}/`)) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(basePath.length + 1).split(/[?#]/, 1)[0]);
  } catch {
    const prefix = `${trimSlashes(publicUrl)}/`;
    if (!fileUrl.startsWith(prefix)) return null;
    return decodeURIComponent(fileUrl.slice(prefix.length).split(/[?#]/, 1)[0]);
  }
}

async function deleteFromR2(fileUrl: string): Promise<boolean> {
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (!publicUrl) return false;

  const key = objectKeyFromPublicUrl(fileUrl, publicUrl);
  if (!key) return false;

  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: requiredEnv('R2_BUCKET'),
      Key: key,
    })
  );
  return true;
}

function getSupabaseObject(fileUrl: string, fallbackBucket: string): { bucket: string; key: string } | null {
  const marker = '/storage/v1/object/public/';
  const markerIndex = fileUrl.indexOf(marker);

  if (markerIndex !== -1) {
    const objectPath = fileUrl.slice(markerIndex + marker.length).split(/[?#]/, 1)[0];
    const [bucket, ...keyParts] = objectPath.split('/');
    if (!bucket || keyParts.length === 0) return null;
    return { bucket, key: decodeURIComponent(keyParts.join('/')) };
  }

  const legacyMarker = `/storage/v1/object/public/${fallbackBucket}/`;
  const legacyMarkerIndex = fileUrl.indexOf(legacyMarker);
  if (legacyMarkerIndex === -1) return null;

  return {
    bucket: fallbackBucket,
    key: decodeURIComponent(fileUrl.slice(legacyMarkerIndex + legacyMarker.length).split(/[?#]/, 1)[0]),
  };
}

async function deleteFromSupabase(fileUrl: string, bucket: string): Promise<boolean> {
  const object = getSupabaseObject(fileUrl, bucket);
  if (!object) return false;

  const { error } = await getSupabaseClient().storage.from(object.bucket).remove([object.key]);
  if (error) {
    throw new Error(`Failed to delete file from Supabase: ${error.message}`);
  }
  return true;
}

export async function deleteObject(
  fileUrl: string,
  bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET
): Promise<void> {
  if (await deleteFromR2(fileUrl)) return;
  await deleteFromSupabase(fileUrl, bucket);
}

export async function deleteFile(fileUrl: string, bucket: string = DEFAULT_BUCKET): Promise<void> {
  await deleteObject(fileUrl, bucket);
}

export function createObjectKey(fileName: string, folder = ''): string {
  const safeFolder = trimSlashes(folder);
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${safeFolder ? `${safeFolder}/` : ''}${Date.now()}-${safeFileName}`;
}

export async function uploadFile(
  file: File,
  bucket: string = DEFAULT_BUCKET,
  folder: string = ''
): Promise<string> {
  return uploadObject({
    key: createObjectKey(file.name, folder),
    body: file,
    contentType: file.type || 'application/octet-stream',
    bucket,
  });
}
