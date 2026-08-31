import { createFileRoute, Navigate } from '@tanstack/react-router'

/** 兼容旧博客管理地址，保留文章编辑参数并转入统一的隐藏 666 管理中心。 */
export const Route = createFileRoute('/{-$locale}/admin/blog')({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => {
    const edit = typeof search.edit === 'string' && search.edit.length > 0 ? search.edit : undefined
    return edit ? { edit } : {}
  },
  component: LegacyBlogAdminRedirect,
})

/** 公开文章里的旧编辑链接仍然可用，但最终只显示新的统一后台界面。 */
function LegacyBlogAdminRedirect() {
  const { edit } = Route.useSearch()
  return <Navigate to="/n4v8q2m7x9r3k6p1" search={edit ? { page: 'blog', edit } : { page: 'blog' }} />
}
