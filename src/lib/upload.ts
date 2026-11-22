import "server-only";
import { MAX_UPLOAD_BYTES, saveImage, type StoredImage } from "./storage";

export type UploadResult = { ok: true; image: StoredImage } | { ok: false; status: number; error: string };

/**
 * Shared checks for image uploads. Route Handlers get no automatic CSRF
 * protection, so this also insists the request comes from our own origin
 * (on top of the SameSite=Lax session cookie).
 */
export async function receiveImage(request: Request): Promise<UploadResult> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return { ok: false, status: 403, error: "Cross-site uploads are not allowed." };
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 4096) {
    return { ok: false, status: 413, error: "That photo is too large (12 MB max)." };
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return { ok: false, status: 400, error: "Upload failed. Try again." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, status: 400, error: "No photo received." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: "That photo is too large (12 MB max)." };
  }

  try {
    return { ok: true, image: await saveImage(Buffer.from(await file.arrayBuffer())) };
  } catch {
    return { ok: false, status: 415, error: "That file isn’t an image we can read. Try a JPEG, PNG or WebP." };
  }
}
