import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// The service role key never leaves the server. Browsers only ever receive signed URLs minted here.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/** The public (anon) key identifies the project to Supabase's gateway; it grants nothing by itself. */
export const publicApiKey = (): string => process.env.SUPABASE_ANON_KEY ?? "";

/** Signed URL the browser uses to upload exactly one object at a path chosen by the server. */
export async function createSignedUpload(bucket: string, path: string): Promise<{ signedUrl: string; token: string }> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Could not create an upload URL: ${error?.message ?? "no data"}`);
  return { signedUrl: data.signedUrl, token: data.token };
}

/** Reads a stored object, or returns null when nothing is stored at that path. */
export async function readStoredObject(bucket: string, path: string): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function removeStoredObject(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/** URL of an object in a public bucket (images only). */
export const publicObjectUrl = (bucket: string, path: string): string =>
  supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl;

/** Short lived URL for one object in a private bucket. */
export async function createSignedDownloadUrl(bucket: string, path: string, seconds: number): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, seconds);
  if (error || !data) throw new Error(`Could not create a download URL: ${error?.message ?? "no data"}`);
  return data.signedUrl;
}
