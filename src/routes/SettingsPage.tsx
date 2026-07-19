import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DuckLogo } from '@/components/DuckLogo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/lib/theme'
import {
  changeLanguage,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from '@/i18n'
import { clearScene } from '@/lib/persistence'

export function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label={t('settings.back')}>
          <Link to="/">
            <ArrowLeft />
          </Link>
        </Button>
        <DuckLogo size={30} />
        <h1 className="font-brand text-2xl font-semibold">{t('settings.title')}</h1>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t('settings.language')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('settings.languageDescription')}
        </p>
        <Select
          value={i18n.language}
          onValueChange={(value) => changeLanguage(value as AppLanguage)}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {t(`languages.${lang}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t('settings.appearance')}</h2>
        <div className="flex items-center justify-between rounded-lg border px-4 py-3">
          <span className="text-sm">{t('settings.darkMode')}</span>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">{t('settings.data')}</h2>
        <p className="text-sm text-muted-foreground">
          {t('settings.dataDescription')}
        </p>
        <Button
          variant="destructive"
          className="w-56"
          onClick={() => {
            if (window.confirm(t('confirm.clear'))) {
              clearScene()
              window.location.href = '/'
            }
          }}
        >
          {t('settings.clear')}
        </Button>
      </section>
    </div>
  )
}
