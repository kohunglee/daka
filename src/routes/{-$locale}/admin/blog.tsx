import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { FileText, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { use666Mode } from '@/features/admin/mode-666'
import { getAdminBlogPostsFn, createBlogPostFn, deleteBlogPostFn, updateBlogPostFn } from '@/features/blog/actions'
import type { BlogPost } from '@/features/blog/blog.schema'
import { AppShell } from '@/components/app/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { fmtDate } from '@/lib/format-date'

export const Route = createFileRoute('/{-$locale}/admin/blog')({
  loader: () => getAdminBlogPostsFn(),
  component: BlogAdmin,
})

interface BlogFormState {
  title: string
  publishedAt: string
  content: string
}

/** 管理员表单初始值：日期使用浏览器当前 UTC 日期，避免空表单无法直接提交。 */
function emptyForm(): BlogFormState {
  return { title: '', publishedAt: new Date().toISOString().slice(0, 10), content: '' }
}

/** 将数据库文章转换成 HTML 表单所需的日期字符串。 */
function formFromPost(post: BlogPost): BlogFormState {
  return {
    title: post.title,
    publishedAt: fmtDate(post.publishedAt),
    content: post.content,
  }
}

/** 管理员博客维护页：只有真实管理员且开启巨大管理员模式时显示可写控件。 */
function BlogAdmin() {
  const posts = Route.useLoaderData()
  const router = useRouter()
  const { enabled: mode666, ready: modeReady } = use666Mode()
  const [form, setForm] = useState<BlogFormState>(() => emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function resetForm() {
    setForm(emptyForm())
    setEditingId(null)
  }

  /** 提交新增或更新请求；服务端会再次验证管理员身份和输入边界。 */
  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !modeReady || !mode666) return
    setBusy(true)
    try {
      if (editingId) {
        await updateBlogPostFn({ data: { id: editingId, ...form } })
        toast.success('文章已更新')
      } else {
        await createBlogPostFn({ data: form })
        toast.success('文章已发布')
      }
      resetForm()
      await router.invalidate()
    } catch {
      toast.error('保存失败，请确认管理员会话仍然有效。')
    } finally {
      setBusy(false)
    }
  }

  /** 删除文章前明确确认，避免列表上的误点击造成内容丢失。 */
  async function removePost(post: BlogPost) {
    if (busy || !modeReady || !mode666) return
    if (!window.confirm(`确定删除《${post.title}》吗？`)) return
    setBusy(true)
    try {
      const result = await deleteBlogPostFn({ data: { id: post.id } })
      if (result.deleted) toast.success('文章已删除')
      else toast.error('文章不存在，可能已被删除。')
      if (editingId === post.id) resetForm()
      await router.invalidate()
    } catch {
      toast.error('删除失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  const canEdit = modeReady && mode666

  return (
    <AppShell
      user={{ name: '站长', email: '巨大管理员模式', role: null, image: null }}
      active="admin-blog"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="page-h">博客管理</h1>
          <p className="mt-1.5 text-[14.5px] text-fg-2">文章内容直接保存到 D1 数据库，发布后公开显示在 /blog。</p>
        </div>
        <FileText className="mt-1 shrink-0 text-primary" size={24} />
      </div>

      {!canEdit && (
        <Card className="mb-5 border-amber-500/30 bg-amber-500/5 p-4 text-sm text-fg-2">
          <p className="m-0 font-semibold text-foreground">当前为只读状态</p>
          <p className="mb-0 mt-1">请先通过巨大管理员模式入口并开启 666 模式，才能新增、修改或删除文章。</p>
        </Card>
      )}

      {canEdit && (
        <Card className="mb-6 grid gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-semibold">{editingId ? '编辑文章' : '新增文章'}</h2>
            {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}><X size={15} />取消编辑</Button>}
          </div>
          <form className="grid gap-4" onSubmit={savePost}>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-title">标题</Label>
              <Input id="blog-title" value={form.title} maxLength={200} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </div>
            <div className="grid gap-1.5 sm:max-w-xs">
              <Label htmlFor="blog-date">文章日期</Label>
              <Input id="blog-date" type="date" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-content">内容</Label>
              <Textarea id="blog-content" value={form.content} maxLength={100000} rows={12} onChange={(event) => setForm({ ...form, content: event.target.value })} required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy}><Plus size={16} />{busy ? '保存中……' : editingId ? '保存修改' : '发布文章'}</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid max-w-3xl gap-3">
        {posts.length === 0 && <p className="text-sm text-fg-3">还没有文章，开启模式后可以发布第一篇。</p>}
        {posts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="m-0 truncate text-base font-semibold">{post.title}</h2>
                <p className="mb-0 mt-1 text-xs text-fg-3">{fmtDate(post.publishedAt)}</p>
                <p className="mb-0 mt-3 whitespace-pre-wrap text-sm leading-6 text-fg-2 line-clamp-4">{post.content}</p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingId(post.id); setForm(formFromPost(post)) }} disabled={busy} aria-label={`编辑 ${post.title}`}><Pencil size={15} /></Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => void removePost(post)} disabled={busy} aria-label={`删除 ${post.title}`}><Trash2 size={15} /></Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
