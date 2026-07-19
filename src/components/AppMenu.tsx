import type { DuckboardAPI } from '@/lib/engine/api'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Download,
  FileDown,
  FileUp,
  Image,
  Menu,
  Settings,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  exportSceneFile,
  exportScenePng,
  exportSceneSvg,
  importSceneFile,
} from '@/lib/export'
import { clearScene } from '@/lib/persistence'

interface AppMenuProps {
  api: DuckboardAPI | null
}

export function AppMenu({ api }: AppMenuProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleClear = () => {
    if (!api) return
    if (!window.confirm(t('confirm.clear'))) return
    api.updateScene({ elements: [], commit: true })
    clearScene()
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('menu.open')}>
            <Menu />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t('menu.export')}</DropdownMenuLabel>
          <DropdownMenuItem disabled={!api} onSelect={() => api && exportSceneFile(api)}>
            <FileDown />
            {t('menu.exportFile')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!api} onSelect={() => api && exportScenePng(api)}>
            <Image />
            {t('menu.exportPng')}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!api} onSelect={() => api && exportSceneSvg(api)}>
            <Download />
            {t('menu.exportSvg')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!api} onSelect={() => api && importSceneFile(api)}>
            <FileUp />
            {t('menu.importFile')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate({ to: '/settings' })}>
            <Settings />
            {t('menu.settings')}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!api}
            onSelect={handleClear}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 />
            {t('menu.clearCanvas')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  )
}
