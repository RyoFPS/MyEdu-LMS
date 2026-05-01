import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { Globe, Check } from 'lucide-react';
import type { Language } from '../i18n';
import { languageNames, languageFlags } from '../i18n';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const options: { value: Language; flag: string; label: string }[] = [
    { value: 'en', flag: languageFlags.en, label: languageNames.en },
    { value: 'id', flag: languageFlags.id, label: languageNames.id },
    { value: 'zh', flag: languageFlags.zh, label: languageNames.zh },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-1.5 sm:p-2 rounded-lg transition-colors',
          'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
          'hover:bg-gray-100 dark:hover:bg-gray-700',
          open && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        )}
        title={t.language.title}
      >
        <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1 z-50 animate-fade-in">
          {options.map(({ value, flag, label }) => (
            <button
              key={value}
              onClick={() => {
                setLanguage(value);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors',
                language === value
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <span className="text-base">{flag}</span>
              <span className="flex-1 text-left">{label}</span>
              {language === value && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
