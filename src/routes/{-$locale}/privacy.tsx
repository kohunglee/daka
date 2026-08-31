import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { getOptionalUser } from '@/features/auth/middleware'
import { LegalPage } from '@/components/marketing/legal-page'
import { PrivacyPolicyContent } from '@/components/marketing/privacy-policy-content'

const rootRoute = getRouteApi('__root__')

export const Route = createFileRoute('/{-$locale}/privacy')({
  // 隐私政策已替换为正式正文，允许搜索引擎正常识别页面。
  head: () => ({
    meta: [
      { title: '隐私政策｜每天出海一小时' },
      { name: 'description', content: '每天出海一小时的隐私政策，说明账号、打卡记录、图片及技术信息的处理方式。' },
    ],
  }),
  loader: async () => ({ loggedIn: !!(await getOptionalUser()) }),
  component: Privacy,
})

function Privacy() {
  const { loggedIn } = Route.useLoaderData()
  const { theme } = rootRoute.useLoaderData()
  return (
    <LegalPage theme={theme} loggedIn={loggedIn} title="隐私政策">
      <PrivacyPolicyContent />
    </LegalPage>
  )
}
