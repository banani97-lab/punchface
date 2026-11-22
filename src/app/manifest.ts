import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "punchface",
    short_name: "punchface",
    description: "Free, ad-free party invitations with one-tap RSVPs.",
    start_url: "/events",
    display: "standalone",
    background_color: "#fff6ea",
    theme_color: "#ff4775",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
