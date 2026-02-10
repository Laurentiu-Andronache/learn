import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const supabase = await createClient();

  const { data: topics } = await supabase
    .from("topics")
    .select("id, updated_at")
    .eq("status", "published");

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/topics`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const topicPages: MetadataRoute.Sitemap =
    topics?.map((topic) => ({
      url: `${baseUrl}/topics/${topic.id}`,
      lastModified: topic.updated_at ? new Date(topic.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    })) || [];

  return [...staticPages, ...topicPages];
}
