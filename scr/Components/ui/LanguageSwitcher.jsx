import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGUAGES } from '@/lib/i18n/translations';
import { ChevronDown, Globe, Check } from 'lucide-react';

export default function LanguageSwitcher({ variant = 'default' }) {
  const { language, changeLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES[language];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-lg transition-all ${
          variant === 'sidebar'
            ? 'px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full'
            : 'px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white border border-white/20'
        }`}
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{current?.flag}</span>
        <span className="hidden sm:inline">{current?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 mt-2 w-44 rounded-xl bg-card shadow-xl border border-border z-50 overflow-hidden animate-fade-in">
            {Object.entries(LANGUAGES).map(([code, info]) => (
              <button
                key={code}
                onClick={() => {
                  changeLanguage(code);
                  setOpen(false);
                }}
                className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm transition-colors hover:bg-muted ${
                  language === code ? 'text-primary font-semibold' : 'text-foreground'
                }`}
              >
                <span className="text-base">{info.flag}</span>
                <span className="flex-1 text-start">{info.label}</span>
                {language === code && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}