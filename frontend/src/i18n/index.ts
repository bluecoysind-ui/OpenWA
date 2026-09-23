import i18n from "i18next";
import type { BackendModule, ReadCallback, ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export const supportedLanguages = [
  "en",
  "de",
  "es",
  "he",
  "tr",
  "zh-CN",
  "zh-HK",
  "ar",
  "te",
  "fr",
  "it",
  "pt-BR",
  "ko",
] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const rtlLanguages: SupportedLanguage[] = ["he", "ar"];

export const languageOptions: Array<{ value: SupportedLanguage; label: string; compactLabel: string }> = [
  { value: "en", label: "English", compactLabel: "EN" },
  { value: "de", label: "Deutsch", compactLabel: "DE" },
  { value: "tr", label: "Türkçe", compactLabel: "TR" },
  { value: "es", label: "Español", compactLabel: "ES" },
  { value: "he", label: "עברית", compactLabel: "עברית" },
  { value: "zh-CN", label: "简体中文", compactLabel: "简中" },
  { value: "zh-HK", label: "繁體中文", compactLabel: "繁中" },
  { value: "ar", label: "العربية", compactLabel: "AR" },
  { value: "te", label: "తెలుగు", compactLabel: "TE" },
  { value: "fr", label: "Français", compactLabel: "FR" },
  { value: "it", label: "Italiano", compactLabel: "IT" },
  { value: "pt-BR", label: "Português (Brasil)", compactLabel: "PT" },
  { value: "ko", label: "한국어", compactLabel: "KO" },
];

export function resolveSupportedLanguage(lang?: string): SupportedLanguage {
  const value = lang || "en";
  const exact = supportedLanguages.find((supported) => supported.toLowerCase() === value.toLowerCase());
  if (exact) return exact;
  const parts = value.toLowerCase().split("-");
  const base = parts[0];
  if (base === "zh") {
    const subtags = new Set(parts.slice(1));
    if (subtags.has("hant") || subtags.has("hk") || subtags.has("mo") || subtags.has("tw")) return "zh-HK";
    return "zh-CN";
  }
  return supportedLanguages.find((supported) => supported === base) ?? "en";
}

const lazyLocaleBackend: BackendModule = {
  type: "backend",
  init: () => {},
  read: (language: string, _namespace: string, callback: ReadCallback) => {
    void import(`./locales/${language}.json`).then(
      (module: { default: ResourceKey }) => callback(null, module.default),
      (error: Error) => callback(error, false),
    );
  },
};

function applyDirection() {
  const resolved = resolveSupportedLanguage(i18n.resolvedLanguage || i18n.language);
  const dir = rtlLanguages.includes(resolved) ? "rtl" : "ltr";
  if (typeof document !== "undefined") {
    document.documentElement.lang = resolved;
    document.documentElement.dir = dir;
  }
}

i18n.on("languageChanged", applyDirection);

export const i18nReady = i18n
  .use(lazyLocaleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: supportedLanguages as unknown as string[],
    nonExplicitSupportedLngs: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "openwa_language",
      caches: ["localStorage"],
      convertDetectedLanguage: (lang: string) => resolveSupportedLanguage(lang),
    },
    react: { useSuspense: false },
  });

export default i18n;
