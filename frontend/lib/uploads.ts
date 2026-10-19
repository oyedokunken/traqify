import api from "./api";

export type UploadPurpose = "AVATAR" | "ORG_LOGO" | "PRODUCT_IMAGE" | "DOWNLOADABLE";

export interface UploadResult {
  purpose: UploadPurpose;
  /** Public address of an image. */
  url?: string;
  /** Reference to a private file; it is never a URL a visitor could open. */
  reference?: string;
}

/**
 * Uploads a file in three steps, so the bytes never pass through the API:
 * 1. ask the API for a signed storage URL (it checks who you are, the type and the size),
 * 2. send the file straight to storage with that URL,
 * 3. ask the API to confirm, which inspects what was stored before accepting it.
 */
export async function uploadFile(purpose: UploadPurpose, file: File): Promise<UploadResult> {
  const { data } = await api.post("/api/uploads/sign", { purpose, contentType: file.type, size: file.size });

  const form = new FormData();
  form.append("cacheControl", "3600");
  form.append("", file);

  const stored = await fetch(data.signedUrl, {
    method: "PUT",
    headers: { apikey: data.apiKey, Authorization: `Bearer ${data.apiKey}`, "x-upsert": "false" },
    body: form,
  });
  if (!stored.ok) throw new Error("The upload could not be completed. Please try again.");

  const confirmed = await api.post(`/api/uploads/${data.uploadId}/confirm`);
  return confirmed.data as UploadResult;
}
