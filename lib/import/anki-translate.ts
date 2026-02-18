/**
 * Auto-translate imported Anki deck content.
 * Called in after() context for admin imports.
 */

import { createClient } from "@/lib/supabase/server";

const BATCH_SIZE = 10; // flashcards per translation request

/**
 * Translate all flashcard content in a topic from sourceLang to the other language.
 */
export async function translateTopicContent(
  topicId: string,
  sourceLang: "en" | "es",
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Auto-translate: ANTHROPIC_API_KEY not configured");
    return;
  }

  const targetLang = sourceLang === "en" ? "es" : "en";
  const model =
    process.env.ANTHROPIC_TRANSLATE_MODEL || "claude-3-5-haiku-20241022";
  const langNames = { en: "English", es: "Spanish" };

  const supabase = await createClient();

  // Get all categories for the topic
  const { data: categories } = await supabase
    .from("categories")
    .select("id")
    .eq("topic_id", topicId);

  if (!categories?.length) return;

  const categoryIds = categories.map((c) => c.id);

  // Get all flashcards
  const { data: flashcards } = await supabase
    .from("flashcards")
    .select("id, question_en, question_es, answer_en, answer_es, extra_en, extra_es")
    .in("category_id", categoryIds);

  if (!flashcards?.length) return;

  // Translate in batches
  for (let i = 0; i < flashcards.length; i += BATCH_SIZE) {
    const batch = flashcards.slice(i, i + BATCH_SIZE);

    const toTranslate = batch.map((fc) => ({
      id: fc.id,
      question: (sourceLang === "en" ? fc.question_en : fc.question_es) as string,
      answer: (sourceLang === "en" ? fc.answer_en : fc.answer_es) as string,
      extra: (sourceLang === "en" ? fc.extra_en : fc.extra_es) as string | null,
    }));

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 8192,
          system: `Translate educational flashcard content from ${langNames[sourceLang]} to ${langNames[targetLang]}.
Preserve all markdown formatting, image references, and audio links.
Return ONLY a valid JSON array matching the input structure.`,
          messages: [
            {
              role: "user",
              content: `Translate these flashcards:\n\n${JSON.stringify(toTranslate, null, 2)}`,
            },
          ],
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      const text: string = data.content?.[0]?.text ?? "";
      const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      const translated = JSON.parse(jsonStr) as {
        id: string;
        question: string;
        answer: string;
        extra: string | null;
      }[];

      // Update each flashcard
      for (const t of translated) {
        const fc = batch.find((f) => f.id === t.id);
        if (!fc) continue;

        await supabase
          .from("flashcards")
          .update({
            [`question_${targetLang}`]: t.question,
            [`answer_${targetLang}`]: t.answer,
            [`extra_${targetLang}`]: t.extra || null,
          })
          .eq("id", t.id);
      }
    } catch (err) {
      console.error(`Auto-translate batch ${i} failed:`, err);
      // Continue with next batch
    }
  }

  // Also translate the topic title and description
  try {
    const { data: topic } = await supabase
      .from("topics")
      .select("title_en, title_es, description_en, description_es")
      .eq("id", topicId)
      .single();

    if (topic) {
      const title = (sourceLang === "en" ? topic.title_en : topic.title_es) as string;
      const desc = (sourceLang === "en" ? topic.description_en : topic.description_es) as string | null;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: `Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}. Return ONLY valid JSON with keys "title" and "description".`,
          messages: [
            {
              role: "user",
              content: JSON.stringify({ title, description: desc }),
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text: string = data.content?.[0]?.text ?? "";
        const jsonStr = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        const translated = JSON.parse(jsonStr);

        await supabase
          .from("topics")
          .update({
            [`title_${targetLang}`]: translated.title,
            [`description_${targetLang}`]: translated.description || null,
          })
          .eq("id", topicId);
      }
    }
  } catch (err) {
    console.error("Auto-translate topic metadata failed:", err);
  }

  // Translate category names
  try {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name_en, name_es")
      .eq("topic_id", topicId);

    if (cats?.length) {
      for (const cat of cats) {
        const name = (sourceLang === "en" ? cat.name_en : cat.name_es) as string;
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 256,
            system: `Translate from ${langNames[sourceLang]} to ${langNames[targetLang]}. Return ONLY the translated text, nothing else.`,
            messages: [
              { role: "user", content: name },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const translated = (data.content?.[0]?.text ?? "").trim();
          if (translated) {
            await supabase
              .from("categories")
              .update({ [`name_${targetLang}`]: translated })
              .eq("id", cat.id);
          }
        }
      }
    }
  } catch (err) {
    console.error("Auto-translate categories failed:", err);
  }
}
