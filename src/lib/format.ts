import type { MeetingResult } from "@/types/meeting";

const speechLocales: Record<string, string> = {
  english: "en-US",
  en: "en-US",
  "en-us": "en-US",
  "en-gb": "en-GB",
  "en-ca": "en-CA",

  french: "fr-FR",
  français: "fr-FR",
  fr: "fr-FR",
  "fr-ca": "fr-CA",

  spanish: "es-ES",
  español: "es-ES",
  es: "es-ES",

  hindi: "hi-IN",
  हिन्दी: "hi-IN",
  hi: "hi-IN",

  arabic: "ar-SA",
  العربية: "ar-SA",
  ar: "ar-SA",

  mandarin: "zh-CN",
  chinese: "zh-CN",
  中文: "zh-CN",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",

  japanese: "ja-JP",
  日本語: "ja-JP",
  ja: "ja-JP",

  korean: "ko-KR",
  한국어: "ko-KR",
  ko: "ko-KR",

  german: "de-DE",
  deutsch: "de-DE",
  de: "de-DE",

  italian: "it-IT",
  italiano: "it-IT",
  it: "it-IT",

  portuguese: "pt-PT",
  português: "pt-PT",
  pt: "pt-PT",
  "pt-br": "pt-BR",

  russian: "ru-RU",
  русский: "ru-RU",
  ru: "ru-RU",

  dutch: "nl-NL",
  nederlands: "nl-NL",
  nl: "nl-NL",

  swahili: "sw-KE",
  kiswahili: "sw-KE",
  sw: "sw-KE",

  urdu: "ur-PK",
  اردو: "ur-PK",
  ur: "ur-PK",

  bengali: "bn-BD",
  বাংলা: "bn-BD",
  bn: "bn-BD",

  punjabi: "pa-IN",
  ਪੰਜਾਬੀ: "pa-IN",
  pa: "pa-IN",

  tamil: "ta-IN",
  தமிழ்: "ta-IN",
  ta: "ta-IN",

  telugu: "te-IN",
  తెలుగు: "te-IN",
  te: "te-IN",

  vietnamese: "vi-VN",
  "tiếng việt": "vi-VN",
  vi: "vi-VN",

  thai: "th-TH",
  ไทย: "th-TH",
  th: "th-TH",

  turkish: "tr-TR",
  türkçe: "tr-TR",
  tr: "tr-TR",

  polish: "pl-PL",
  polski: "pl-PL",
  pl: "pl-PL",

  ukrainian: "uk-UA",
  українська: "uk-UA",
  uk: "uk-UA",

  greek: "el-GR",
  ελληνικά: "el-GR",
  el: "el-GR",

  hebrew: "he-IL",
  עברית: "he-IL",
  he: "he-IL",

  indonesian: "id-ID",
  "bahasa indonesia": "id-ID",
  id: "id-ID",

  malay: "ms-MY",
  "bahasa melayu": "ms-MY",
  ms: "ms-MY",

  filipino: "fil-PH",
  tagalog: "fil-PH",
  fil: "fil-PH",

  persian: "fa-IR",
  farsi: "fa-IR",
  فارسی: "fa-IR",
  fa: "fa-IR",

  nepali: "ne-NP",
  नेपाली: "ne-NP",
  ne: "ne-NP",

  marathi: "mr-IN",
  मराठी: "mr-IN",
  mr: "mr-IN",
};

export function speechLocaleForLanguage(
  language?: string
): string | undefined {
  const value = language?.trim();

  if (!value) {
    return undefined;
  }

  const normalized = value
    .replace(/_/g, "-")
    .toLowerCase();

  const directMatch = speechLocales[normalized];

  if (directMatch) {
    return directMatch;
  }

  // Accept valid BCP-47 locale codes supplied by the user,
  // such as fr-CA, es-MX or en-AU.
  if (/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value)) {
    return value;
  }

  // Handle labels such as "English (Canada)" by falling
  // back to the base language when a regional voice is unknown.
  const baseLanguage = normalized
    .replace(/\s*\([^)]*\)/g, "")
    .trim();

  return speechLocales[baseLanguage];
}

export function makeSpokenSummary(
  result: Pick<MeetingResult, "summary" | "decisions" | "actionItems">
) {
  const summary = cleanSentence(result.summary);

  const decisions = result.decisions.length
    ? `Decisions: ${result.decisions
        .map(cleanSentence)
        .filter(Boolean)
        .join(". ")}.`
    : "No firm decisions were identified.";

  const actions = result.actionItems.length
    ? `Action items: ${result.actionItems
        .map((item) => {
          const task = cleanSentence(item.task);
          const owner =
            item.owner && item.owner !== "Unassigned"
              ? `, assigned to ${item.owner}`
              : "";
          const due =
            item.due && item.due !== "TBD" && item.due !== "Not specified"
              ? `, due ${item.due}`
              : "";

          return `${task}${owner}${due}`;
        })
        .filter(Boolean)
        .join(". ")}.`
    : "No clear action items were identified.";

  return [summary, decisions, actions].filter(Boolean).join(" ");
}

function cleanSentence(value: string): string {
  return value.trim().replace(/[.!?]+$/, "");
}

export function safeFilename(title: string) {
  const cleaned = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

  return cleaned || "meeting";
}