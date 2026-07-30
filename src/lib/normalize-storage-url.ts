/**
 * Normalizes a storage URL to always use the current R2 public URL.
 *
 * Handles migration from old R2 URLs (e.g. r2.cloudflarestorage.com or old
 * custom domain) to the current custom domain (e.g. akasia.banza.my.id).
 *
 * Old files remain accessible because R2 custom domains are just proxies
 * to the same underlying bucket — no file migration needed.
 *
 * Works in both server and client components by reading from NEXT_PUBLIC_ env vars.
 */

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

export function normalizeStorageUrl(fileUrl: string | null | undefined): string | null {
  if (!fileUrl) return null;

  // Support both server (R2_PUBLIC_URL) and client (NEXT_PUBLIC_R2_PUBLIC_URL)
  const currentPublicUrl = (
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    ''
  ).trim();

  const legacyPublicUrls = (
    process.env.NEXT_PUBLIC_R2_LEGACY_PUBLIC_URLS ||
    process.env.R2_LEGACY_PUBLIC_URLS ||
    ''
  ).trim();

  if (!currentPublicUrl || !legacyPublicUrls) return fileUrl;

  const legacyOrigins = legacyPublicUrls.split(',').map((u) => trimSlashes(u.trim()));
  const currentBase = trimSlashes(currentPublicUrl);

  for (const legacyBase of legacyOrigins) {
    if (fileUrl.startsWith(legacyBase + '/')) {
      return currentBase + '/' + fileUrl.slice(legacyBase.length + 1);
    }
  }

  return fileUrl;
}
