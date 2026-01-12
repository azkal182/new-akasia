import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  bucket: string = 'akasia',
  folder: string = ''
): Promise<string> {
  const fileName = `${folder ? folder + '/' : ''}${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(
  fileUrl: string,
  bucket: string = 'akasia'
): Promise<void> {
  const path = fileUrl.split(`/${bucket}/`)[1];
  if (!path) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
