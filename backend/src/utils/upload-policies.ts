import { UploadPurpose } from "@prisma/client";

const MB = 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOWNLOADABLE_TYPES = [
  ...IMAGE_TYPES,
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/epub+zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-excel",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4",
];

export interface UploadPolicy {
  bucket: string;
  maxBytes: number;
  types: string[];
  /** Roles that may upload for this purpose. */
  roles: ("OWNER" | "MANAGER" | "CASHIER" | "AUDITOR")[];
  /** Whether the file belongs to an organization (and the caller must be in one). */
  tenant: boolean;
  /** Public buckets serve images by URL; private buckets only hand out short lived signed URLs. */
  isPublic: boolean;
}

/**
 * What each kind of upload may contain and who may start one. There is deliberately no octet-stream:
 * a file whose type is not on the list is refused, whatever its name says.
 */
export const UPLOAD_POLICIES: Record<UploadPurpose, UploadPolicy> = {
  AVATAR: { bucket: "avatars", maxBytes: 5 * MB, types: IMAGE_TYPES, roles: ["OWNER", "MANAGER", "CASHIER", "AUDITOR"], tenant: false, isPublic: true },
  ORG_LOGO: { bucket: "avatars", maxBytes: 5 * MB, types: IMAGE_TYPES, roles: ["OWNER"], tenant: true, isPublic: true },
  PRODUCT_IMAGE: { bucket: "products", maxBytes: 5 * MB, types: IMAGE_TYPES, roles: ["OWNER", "MANAGER"], tenant: true, isPublic: true },
  DOWNLOADABLE: { bucket: "downloadables", maxBytes: 25 * MB, types: DOWNLOADABLE_TYPES, roles: ["OWNER", "MANAGER"], tenant: true, isPublic: false },
};
