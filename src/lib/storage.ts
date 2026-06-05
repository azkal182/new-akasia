import 'server-only';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'akasia';

type StorageProvider = 'r2' | 'supabase';
type UploadBody = File | Buffer;

type UploadStorageObjectInput = {
  body: UploadBody;
  contentType: string;
  key: string;
  bucket?: string;
};

let r2Client: S3Client | null = null;
let legacySupabaseClient: SupabaseClient | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getStorageProvider(): StorageProvider {
  const configuredProvider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();

  if (configuredProvider === 'r2' || configuredProvider === 'supabase') {
    return configuredProvider;
  }

  if (configuredProvider) {
    throw new Error(`Unsupported STORAGE_PROVIDER: ${configuredProvider}`);
  }

  return process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? 'r2'
    : 'supabase';
}

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${requiredEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  return r2Client;
}

function getLegacySupabaseClient(): SupabaseClient {
  if (!legacySupabaseClient) {
    legacySupabaseClient = createClient(
      requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    );
  }

  return legacySupabaseClient;
}

function normalizeKey(key: string): string {
  return key
    .split('/')
    .filter(Boolean)
    .join('/');
}

function getR2PublicUrl(key: string): string {
  const publicBaseUrl = requiredEnv('R2_PUBLIC_URL').replace(/\/+$/, '');
  const encodedKey = normalizeKey(key)
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  return `${publicBaseUrl}/${encodedKey}`;
}

async function uploadToR2({ body, contentType, key, bucket }: UploadStorageObjectInput) {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: bucket ?? process.env.R2_BUCKET ?? DEFAULT_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getR2PublicUrl(key);
}

async function uploadToSupabase({ body, contentType, key, bucket }: UploadStorageObjectInput) {
  const targetBucket = bucket ?? DEFAULT_BUCKET;
  const { error } = await getLegacySupabaseClient()
    .storage.from(targetBucket)
    .upload(key, body, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return getLegacySupabaseClient().storage.from(targetBucket).getPublicUrl(key).data.publicUrl;
}

export async function uploadStorageObject(input: UploadStorageObjectInput): Promise<string> {
  const normalizedInput = { ...input, key: normalizeKey(input.key) };

  if (!normalizedInput.key) {
    throw new Error('Storage object key cannot be empty');
  }

  return getStorageProvider() === 'r2'
    ? uploadToR2(normalizedInput)
    : uploadToSupabase(normalizedInput);
}

export async function uploadFile(
  file: File,
  bucket: string = DEFAULT_BUCKET,
  folder: string = ''
): Promise<string> {
  const safeName = file.name.replace(/\s+/g, '_');
  const key = `${folder ? `${folder}/` : ''}${Date.now()}-${safeName}`;

  return uploadStorageObject({
    body: file,
    bucket,
    contentType: file.type || 'application/octet-stream',
    key,
  });
}

function getR2Key(fileUrl: string): string | null {
  const publicBaseUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (!publicBaseUrl) return null;

  try {
    const url = new URL(fileUrl);
    const baseUrl = new URL(publicBaseUrl);
    const basePath = baseUrl.pathname.replace(/\/+$/, '');

    if (url.origin !== baseUrl.origin || !url.pathname.startsWith(`${basePath}/`)) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(basePath.length + 1));
  } catch {
    return null;
  }
}

function getSupabaseObject(fileUrl: string): { bucket: string; key: string } | null {
  const marker = '/storage/v1/object/public/';
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const objectPath = fileUrl.slice(markerIndex + marker.length).split(/[?#]/, 1)[0];
  const [bucket, ...keyParts] = objectPath.split('/');
  if (!bucket || keyParts.length === 0) return null;

  return { bucket, key: decodeURIComponent(keyParts.join('/')) };
}

export async function deleteFile(fileUrl: string, bucket: string = DEFAULT_BUCKET): Promise<void> {
  const r2Key = getR2Key(fileUrl);
  if (r2Key) {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET ?? bucket,
        Key: r2Key,
      })
    );
    return;
  }

  const legacyObject = getSupabaseObject(fileUrl);
  if (!legacyObject) return;

  const { error } = await getLegacySupabaseClient()
    .storage.from(legacyObject.bucket)
    .remove([legacyObject.key]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
