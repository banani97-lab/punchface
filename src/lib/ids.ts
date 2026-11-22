import { customAlphabet, nanoid } from "nanoid";

const slugSuffix = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

export const newId = () => nanoid(16);

/** Long, unguessable secret for invite links and sessions. */
export const newToken = () => nanoid(32);

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** "sams-30th-k7m2p9xq": readable, and the random tail keeps it unguessable. */
export function newEventSlug(title: string): string {
  const base = slugify(title);
  return base ? `${base}-${slugSuffix()}` : slugSuffix();
}
