import sharp from "sharp";
import type { Store } from "./store.js";
export interface ImageStore {
  put(path: string, data: Buffer): Promise<void>;
  get(path: string): Promise<Buffer>;
  remove(path: string): Promise<void>;
}
export async function normalizeImage(base64: string): Promise<Buffer> {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error("invalid_image");
  const source = Buffer.from(base64, "base64");
  if (source.length > 2 * 1024 * 1024 || source.length < 16)
    throw new Error("invalid_image");
  // Decode and re-encode, cap pixels, strip EXIF/GPS/other metadata. Never store
  // arbitrary files under an image extension or trust a caller-provided MIME.
  const image = sharp(source, {
    limitInputPixels: 16000000,
    failOn: "warning",
  });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
    throw new Error("invalid_image");
  return image
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer();
}
export async function cleanupImages(
  store: Store,
  images: ImageStore,
  now = Date.now(),
) {
  await store.transaction(async (s) => {
    for (const row of await s.find("images", {}))
      if (new Date(row.expiresAt).getTime() <= now) {
        await s.put("storage_cleanup", {
          id: row.id,
          storagePath: row.storagePath,
        });
        await s.remove("images", row.id);
      }
  });
  for (const job of await store.find("storage_cleanup", {})) {
    try {
      await images.remove(job.storagePath);
      await store.transaction((s) => s.remove("storage_cleanup", job.id));
    } catch {
      /* durable retry next tick */
    }
  }
}
