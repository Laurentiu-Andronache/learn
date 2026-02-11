import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo/metadata-utils";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const supabase = await createClient();

  const { data: topics } = await supabase
    .from("topics")
    .select("id, slug, updated_at")
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
      url: `${baseUrl}/topics/${topic.slug || topic.id}`,
      lastModified: topic.updated_at ? new Date(topic.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    })) || [];

  return [...staticPages, ...topicPages];
}
