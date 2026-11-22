import { readImage } from "@/lib/storage";

/** Serves uploaded images. Keys are random and never reused, so cache hard. */
export async function GET(request: Request, ctx: RouteContext<"/media/[key]">) {
  const { key } = await ctx.params;
  const variant = new URL(request.url).searchParams.get("v") === "thumb" ? "thumb" : "full";
  const data = await readImage(key, variant);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
