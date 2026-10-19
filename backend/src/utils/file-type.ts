/**
 * Identifies a file by its leading bytes instead of trusting the name or the Content-Type the browser sent.
 * Only formats the app accepts are recognised; anything else returns null.
 */
export type DetectedKind = "jpeg" | "png" | "webp" | "pdf" | "zip" | "ole" | "mp3" | "mp4";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length && signature.every((value, i) => bytes[offset + i] === value);

export function detectFileKind(bytes: Uint8Array): DetectedKind | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return "zip"; // also docx, xlsx and epub
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "ole"; // legacy doc and xls
  if (startsWith(bytes, [0x49, 0x44, 0x33]) || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)) return "mp3";
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return "mp4"; // "ftyp" box
  return null;
}

/** The kind of content each accepted MIME type must actually contain. */
export const KIND_FOR_MIME: Record<string, DetectedKind> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/epub+zip": "zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "zip",
  "application/msword": "ole",
  "application/vnd.ms-excel": "ole",
  "audio/mpeg": "mp3",
  "audio/mp4": "mp4",
  "video/mp4": "mp4",
};

export const EXTENSION_FOR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/epub+zip": "epub",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.ms-excel": "xls",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
};
