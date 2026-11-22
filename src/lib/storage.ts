import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DATA_DIR } from "@/db";
import { newId } from "./ids";

/**
 * Image storage on the local disk. Everything goes through these four
 * functions, so moving to S3/R2 later means reimplementing this file only.
 */

const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const KEY_RE = /^[A-Za-z0-9_-]{10,40}$/;

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export type StoredImage = { key: string; width: number; height: number };

const fileFor = (key: string, variant: "full" | "thumb") =>
  path.join(UPLOAD_DIR, `${key}${variant === "thumb" ? "_t" : ""}.webp`);

/**
 * Re-encodes an upload to WebP at two sizes. Re-encoding is deliberate: it
 * rejects anything that is not really an image and drops EXIF metadata,
 * including the GPS position phones embed in photos.
 */
export async function saveImage(input: Buffer): Promise<StoredImage> {
  const key = newId();
  const base = sharp(input, { failOn: "error", limitInputPixels: 60_000_000 }).rotate();
  const full = await base
    .clone()
    .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 74 })
    .toBuffer();
  await mkdir(UPLOAD_DIR, { recursive: true });
  await Promise.all([writeFile(fileFor(key, "full"), full.data), writeFile(fileFor(key, "thumb"), thumb)]);
  return { key, width: full.info.width, height: full.info.height };
}

export async function readImage(key: string, variant: "full" | "thumb"): Promise<Buffer | null> {
  if (!KEY_RE.test(key)) return null;
  try {
    return await readFile(fileFor(key, variant));
  } catch {
    return null;
  }
}

export async function deleteImage(key: string): Promise<void> {
  if (!KEY_RE.test(key)) return;
  await Promise.all([
    unlink(fileFor(key, "full")).catch(() => {}),
    unlink(fileFor(key, "thumb")).catch(() => {}),
  ]);
}

export const imageUrl = (key: string, variant: "full" | "thumb" = "full") =>
  `/media/${key}${variant === "thumb" ? "?v=thumb" : ""}`;
