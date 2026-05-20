import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'zh', name: '中文（简体）' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('aigate_language', code)
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-secondary" />
      <select
        className="bg-transparent border-none outline-none cursor-pointer text-sm font-bold"
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        style={{ color: 'var(--text-primary)' }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}
