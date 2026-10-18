import type { MetadataRoute } from "next";

// The app is a tool, not content. Let crawlers see the landing page but not the API.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" } };
}
