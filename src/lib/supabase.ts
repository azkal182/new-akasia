import { createClient } from '@supabase/supabase-js';
import { createObjectKey, deleteObject, uploadObject } from '@/lib/storage';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Backward-compatible upload helper. The active provider is configured by
 * STORAGE_PROVIDER, while existing Supabase URLs remain valid.
 */
export async function uploadFile(
  file: File,
  bucket: string = 'akasia',
  folder: string = ''
): Promise<string> {
  return uploadObject({
    key: createObjectKey(file.name, folder),
    body: file,
    contentType: file.type || 'application/octet-stream',
    bucket,
  });
}

/**
 * Delete either an R2 object or a legacy Supabase object based on its URL.
 */
export async function deleteFile(
  fileUrl: string,
  bucket: string = 'akasia'
): Promise<void> {
  await deleteObject(fileUrl, bucket);
}
