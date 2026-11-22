import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // Invites are private by link; only the marketing pages are for crawlers.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/e/", "/i/", "/events", "/auth/", "/dev/", "/api/", "/media/"] }],
  };
}
