import { useLanguageStore } from '../stores/languageStore';

export function useTranslation() {
  const { language, t, setLanguage } = useLanguageStore();
  return { language, t, setLanguage };
}
