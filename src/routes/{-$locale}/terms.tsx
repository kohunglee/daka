import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { getOptionalUser } from '@/features/auth/middleware'
import { LegalPage } from '@/components/marketing/legal-page'
import { TermsContent } from '@/components/marketing/terms-content'

const rootRoute = getRouteApi('__root__')

export const Route = createFileRoute('/{-$locale}/terms')({
  // 服务条款是正式公开内容，不再使用占位页面的 noindex 设置。
  head: () => ({ meta: [{ name: 'description', content: 'daka.run 服务条款' }] }),
  loader: async () => ({ loggedIn: !!(await getOptionalUser()) }),
  component: Terms,
})

function Terms() {
  const { loggedIn } = Route.useLoaderData()
  const { theme } = rootRoute.useLoaderData()
  return <LegalPage theme={theme} loggedIn={loggedIn} title="服务条款"><TermsContent /></LegalPage>
}
