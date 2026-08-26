import { Link } from '@tanstack/react-router'
import { useTranslation } from '@/features/i18n/provider'
import { Logo } from '@/components/brand/logo'

/** 首页页足：保留品牌说明、版权和必要法律入口，移除分散注意力的推广链接。 */
export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border bg-bg-alt px-5 md:px-7 py-10">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        {/* 品牌说明：使用陛下指定的页足描述，和首页打卡目标保持一致。 */}
        <div className="max-w-md">
          <Logo />
          <p className="mt-3.5 max-w-[22em] text-[13.5px] leading-relaxed text-fg-3">
            辅助大家养成有意义的 Web 出海习惯，早日实现出海梦！
          </p>
        </div>

        {/* 法律入口：仅保留条款和隐私，避免首页继续堆叠推广导航。 */}
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-2" aria-label="法律信息">
          <Link className="transition-colors hover:text-foreground" to="/{-$locale}/terms">{t('marketing.footerTerms')}</Link>
          <Link className="transition-colors hover:text-foreground" to="/{-$locale}/privacy">{t('marketing.footerPrivacy')}</Link>
        </nav>
      </div>

    </footer>
  )
}
