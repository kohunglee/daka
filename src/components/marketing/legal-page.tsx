import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from '@/features/i18n/provider'
import { SiteNav } from '@/components/marketing/site-nav'
import { Footer } from '@/components/marketing/footer'

/** 共享法律页面外壳；正文由具体法律页面传入，未传正文时保留模板的占位提示。 */
export function LegalPage({
  theme,
  loggedIn,
  title,
  children,
}: {
  theme: 'light' | 'dark'
  loggedIn: boolean
  title: string
  children?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav theme={theme} loggedIn={loggedIn} />
      <main className="mx-auto max-w-[820px] px-5 py-16 md:px-7">
        <h1 className="page-h">{title}</h1>
        {children ?? <p className="mt-4 leading-relaxed text-fg-2">{t('legal.placeholder')}</p>}
        <p className="mt-8">
          <Link to="/{-$locale}" className="font-semibold text-primary">
            ← {t('common.appName')}
          </Link>
        </p>
      </main>
      <Footer theme={theme} />
    </div>
  )
}
