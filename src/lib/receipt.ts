import sharp from 'sharp';
import { supabase } from '@/lib/supabase';
import { randomString } from '@/lib/utils';

const DEFAULT_BUCKET = 'akasia';
const DEFAULT_WIDTH = 1024;
const DEFAULT_QUALITY = 70;

type CompressedUploadResult = {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

async function compressImage(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const compressedBuffer = await sharp(buffer)
    .resize({ width: DEFAULT_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: DEFAULT_QUALITY })
    .toBuffer();

  return compressedBuffer;
}

export async function uploadCompressedAttachment(
  file: File,
  folder: string
): Promise<CompressedUploadResult> {
  const compressedBuffer = await compressImage(file);
  const safeFolder = folder.replace(/\/+$/, '');
  const fileName = `${safeFolder}/${Date.now()}-${randomString(10)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(DEFAULT_BUCKET)
    .upload(fileName, compressedBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(fileName);

  return {
    fileUrl: urlData.publicUrl,
    fileName,
    mimeType: 'image/jpeg',
    sizeBytes: compressedBuffer.length,
  };
}

export async function uploadCompressedReceipt(
  file: File,
  folder: string
): Promise<string> {
  const result = await uploadCompressedAttachment(file, folder);
  return result.fileUrl;
}
