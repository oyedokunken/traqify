import crypto from "crypto";
import { Response } from "express";
import { z } from "zod";
import { UploadPurpose } from "@prisma/client";
import prisma from "../config/database";
import { createSignedUpload, publicApiKey, publicObjectUrl, readStoredObject, removeStoredObject } from "../config/supabase";
import { AuthRequest } from "../middleware/auth.middleware";
import { respondWithError } from "../middleware/error.middleware";
import { EXTENSION_FOR_MIME, KIND_FOR_MIME, detectFileKind } from "../utils/file-type";
import { UPLOAD_POLICIES } from "../utils/upload-policies";

const SIGNED_URL_LIFETIME_MS = 15 * 60 * 1000;

const signSchema = z.object({
  purpose: z.nativeEnum(UploadPurpose),
  contentType: z.string().min(1).max(100),
  size: z.number({ invalid_type_error: "Size must be a number." }).int().min(1, "The file is empty."),
});

/** What the client needs once an upload is confirmed. Private files are only ever identified by a reference. */
const resultFor = (upload: { purpose: UploadPurpose; bucket: string; path: string }) => {
  const policy = UPLOAD_POLICIES[upload.purpose];
  return policy.isPublic
    ? { purpose: upload.purpose, url: publicObjectUrl(upload.bucket, upload.path) }
    : { purpose: upload.purpose, reference: `storage:${upload.path}` };
};

/**
 * POST /api/uploads/sign
 * Checks who is asking, for what, and how big, then returns a signed URL for a path the server chose. The browser
 * never decides the bucket, the folder or the file name.
 */
export const signUpload = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = signSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }
    const { purpose, contentType, size } = parsed.data;
    const policy = UPLOAD_POLICIES[purpose];
    const user = req.user!;

    if (!policy.roles.includes(user.role as (typeof policy.roles)[number])) {
      res.status(403).json({ error: "You do not have permission to upload this kind of file." });
      return;
    }
    if (policy.tenant && !user.organizationId) {
      res.status(403).json({ error: "You must belong to an organization to upload this kind of file." });
      return;
    }
    if (!policy.types.includes(contentType)) {
      res.status(400).json({ error: "This file type is not allowed." });
      return;
    }
    if (size > policy.maxBytes) {
      res.status(400).json({ error: `The file is too large. The limit is ${Math.floor(policy.maxBytes / (1024 * 1024))} MB.` });
      return;
    }

    const owner = policy.tenant ? user.organizationId! : `users/${user.id}`;
    const path = `${owner}/${purpose.toLowerCase().replace(/_/g, "-")}/${crypto.randomUUID()}.${EXTENSION_FOR_MIME[contentType]}`;
    const signed = await createSignedUpload(policy.bucket, path);

    const upload = await prisma.upload.create({
      data: {
        bucket: policy.bucket,
        path,
        purpose,
        declaredType: contentType,
        maxBytes: policy.maxBytes,
        expiresAt: new Date(Date.now() + SIGNED_URL_LIFETIME_MS),
        userId: user.id,
        organizationId: policy.tenant ? user.organizationId : null,
      },
    });

    res.status(201).json({ uploadId: upload.id, signedUrl: signed.signedUrl, apiKey: publicApiKey(), maxBytes: policy.maxBytes });
  } catch (err) {
    respondWithError(res, err, "Could not prepare the upload.");
  }
};

/**
 * POST /api/uploads/:id/confirm
 * Reads back what was stored and only accepts it if the bytes really are the declared type and within the limit.
 * Anything else is deleted from storage. Confirming twice is harmless.
 */
export const confirmUpload = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const upload = await prisma.upload.findFirst({ where: { id: req.params.id, userId: user.id } });
    if (!upload) {
      res.status(404).json({ error: "Upload not found." });
      return;
    }
    if (upload.status === "CONFIRMED") {
      res.json(resultFor(upload));
      return;
    }
    if (upload.status === "REJECTED") {
      res.status(400).json({ error: "This upload was rejected." });
      return;
    }
    if (upload.expiresAt < new Date()) {
      res.status(400).json({ error: "This upload has expired. Please start again." });
      return;
    }

    const reject = async (message: string): Promise<void> => {
      await prisma.upload.updateMany({ where: { id: upload.id, status: "PENDING" }, data: { status: "REJECTED" } });
      await removeStoredObject(upload.bucket, upload.path).catch((e) => console.error("[uploads] could not remove a rejected object:", e.message));
      res.status(400).json({ error: message });
    };

    const bytes = await readStoredObject(upload.bucket, upload.path);
    if (!bytes) {
      res.status(400).json({ error: "No file was uploaded." });
      return;
    }
    if (bytes.length > upload.maxBytes) {
      await reject("The file is too large.");
      return;
    }
    const kind = detectFileKind(bytes);
    if (!kind || kind !== KIND_FOR_MIME[upload.declaredType]) {
      await reject("The file content does not match its type.");
      return;
    }

    const claimed = await prisma.upload.updateMany({
      where: { id: upload.id, status: "PENDING" },
      data: { status: "CONFIRMED", detectedType: kind, sizeBytes: bytes.length },
    });
    if (claimed.count === 0) {
      // A concurrent confirm won; answer the same way.
      res.json(resultFor(upload));
      return;
    }

    const result = resultFor(upload);
    if (upload.purpose === "AVATAR" && "url" in result) {
      await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: result.url } });
    } else if (upload.purpose === "ORG_LOGO" && "url" in result && upload.organizationId) {
      await prisma.organization.update({ where: { id: upload.organizationId }, data: { logoUrl: result.url } });
    }
    res.json(result);
  } catch (err) {
    respondWithError(res, err, "Could not confirm the upload.");
  }
};
