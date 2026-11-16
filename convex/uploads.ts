import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Upload checks (checklist item 16).
// generateUploadUrl can't limit what gets uploaded, so every function that
// saves a storageId checks the stored file's type and size here.

const MB = 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * MB;
export const MAX_PHOTO_BYTES = 25 * MB; // full-size game photos
export const MAX_VIDEO_BYTES = 100 * MB;

export const UPLOADS_PER_HOUR_USER = 60;
export const UPLOADS_PER_HOUR_COMPANY = 500; // the photo tool uploads many at once

type Kind = "image" | "video";

export async function assertUpload(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">,
  kind: Kind | Kind[],
  maxBytes: number
): Promise<void> {
  const kinds = Array.isArray(kind) ? kind : [kind];
  const meta = await ctx.db.system.get(storageId);
  if (!meta) throw new ConvexError("Upload not found");
  const type = meta.contentType ?? "";
  if (!kinds.some((k) => type.startsWith(`${k}/`))) {
    throw new ConvexError(kinds.includes("video") ? "Only photos and videos can be uploaded" : "Only images can be uploaded");
  }
  if (meta.size > maxBytes) {
    throw new ConvexError(`File is too large (max ${Math.round(maxBytes / MB)} MB)`);
  }
}

export async function assertOptionalImage(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage"> | undefined,
  maxBytes = MAX_IMAGE_BYTES
): Promise<void> {
  if (storageId) await assertUpload(ctx, storageId, "image", maxBytes);
}
