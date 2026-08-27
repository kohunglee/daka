import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAdmin, requireBlogAdminSession } from '@/features/admin/middleware'

export const Route = createFileRoute('/{-$locale}/admin')({
  loader: ({ location }) => {
    // SSR 与客户端导航对末尾斜杠的处理可能不同，统一去掉后再判断博客子路由。
    const pathname = location.pathname.replace(/\/+$/, '')
    return pathname.endsWith('/admin/blog') ? requireBlogAdminSession() : requireAdmin()
  },
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: () => <Outlet />,
})
