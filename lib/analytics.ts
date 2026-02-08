// Google Analytics event tracking

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || !window.gtag)
    return;
  window.gtag("event", eventName, params);
}

// Pre-defined events
export const analytics = {
  quizCompleted: (params: {
    themeId: string;
    score: number;
    totalQuestions: number;
    timeMs: number;
  }) => trackEvent("quiz_completed", params),
  flashcardSessionCompleted: (params: {
    themeId: string;
    knew: number;
    didntKnow: number;
  }) => trackEvent("flashcard_session_completed", params),
  themeSelected: (themeId: string) => trackEvent("theme_selected", { themeId }),
  signup: (method: string) => trackEvent("signup", { method }),
  anonymousUpgrade: () => trackEvent("anonymous_upgrade"),
  feedbackSubmitted: (type: string) =>
    trackEvent("feedback_submitted", { type }),
  questionSuspended: (questionId: string) =>
    trackEvent("question_suspended", { questionId }),
  readingCompleted: (themeId: string) =>
    trackEvent("reading_completed", { themeId }),
};
