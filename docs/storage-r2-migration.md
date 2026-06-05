# Cloudflare R2 Storage Migration

Internal uploads use the provider abstraction in `src/lib/storage.ts`.

## Behavior

- New uploads use Cloudflare R2 when `STORAGE_PROVIDER=r2`.
- Existing Supabase public URLs remain valid and need no database changes.
- `deleteFile()` detects the URL provider: R2 URLs are deleted from R2 and legacy
  Supabase URLs are deleted from Supabase.
- If `STORAGE_PROVIDER` is omitted, R2 is selected when its credentials exist;
  otherwise uploads fall back to Supabase for backward-compatible deployments.

## R2 setup

1. Create an R2 bucket.
2. Create an R2 API token with object read/write permissions.
3. Expose the bucket through a custom domain or an R2 public development URL.
4. Set the variables documented in `.env.example`.

`R2_PUBLIC_URL` must be the public base URL of the bucket, without an object key.
For example: `https://cdn.example.com`.

Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured
until legacy Supabase objects no longer need to be deleted. Reading old public
URLs does not require application-side proxying or migration.

## Rollback

Set `STORAGE_PROVIDER=supabase` to send new uploads back to Supabase. Existing R2
and Supabase URLs continue to render because records store complete public URLs.
