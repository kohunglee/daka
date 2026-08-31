import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FileText, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createBlogPostFn, deleteBlogPostFn, updateBlogPostFn } from '@/features/blog/actions'
import type { BlogPost } from '@/features/blog/blog.schema'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { fmtDate } from '@/lib/format-date'

interface BlogFormState {
  title: string
  publishedAt: string
  content: string
}

/** 博客管理面板的外部输入：页面数据由所属后台负责读取，面板只负责编辑交互。 */
export interface BlogAdminPanelProps {
  posts: BlogPost[]
  editId?: string
  modeEnabled: boolean
  modeReady: boolean
  loading?: boolean
  errorMessage?: string | null
  onRefresh: () => Promise<void>
}

/** 把 Date 转成 datetime-local 控件需要的本地时间字符串，精确到分钟。 */
function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 管理员表单初始值：使用浏览器当前本地时间，方便直接发布文章。 */
function emptyForm(): BlogFormState {
  return { title: '', publishedAt: formatDateTimeLocal(new Date()), content: '' }
}

/** 将数据库文章转换成 datetime-local 控件所需的本地时间字符串。 */
function formFromPost(post: BlogPost): BlogFormState {
  return {
    title: post.title,
    publishedAt: formatDateTimeLocal(post.publishedAt),
    content: post.content,
  }
}

/** 将不带时区的浏览器输入转换为 ISO 时间，再交给服务端统一解析。 */
function serializeForm(form: BlogFormState): BlogFormState {
  const date = new Date(form.publishedAt)
  if (Number.isNaN(date.getTime())) throw new Error('invalid published date')
  return { ...form, publishedAt: date.toISOString() }
}

/**
 * 博客文章维护内容。
 *
 * 这个组件不再依赖普通用户后台的 AppShell，因此既能嵌入隐藏 666 管理中心，
 * 也能在未来被其他管理页面复用；登录校验仍然由服务端博客 actions 负责。
 */
export function BlogAdminPanel({ posts, editId, modeEnabled, modeReady, loading = false, errorMessage = null, onRefresh }: BlogAdminPanelProps) {
  const [form, setForm] = useState<BlogFormState>(() => emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const initializedEdit = useRef<string | null>(null)
  const editorFormRef = useRef<HTMLFormElement | null>(null)

  /** 从公开博客的编辑链接进入时，自动把对应文章载入表单。 */
  useEffect(() => {
    if (!editId || initializedEdit.current === editId) return
    const post = posts.find((item) => item.id === editId)
    if (!post) return
    initializedEdit.current = editId
    setEditingId(post.id)
    setForm(formFromPost(post))
  }, [editId, posts])

  /** 清空编辑器，回到新增文章状态。 */
  function resetForm() {
    setForm(emptyForm())
    setEditingId(null)
  }

  /** 提交新增或更新请求；服务端会再次验证管理员身份和输入边界。 */
  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !modeReady || !modeEnabled) return
    setBusy(true)
    try {
      const data = serializeForm(form)
      if (editingId) {
        await updateBlogPostFn({ data: { id: editingId, ...data } })
        toast.success('文章已更新')
      } else {
        await createBlogPostFn({ data })
        toast.success('文章已发布')
        resetForm()
      }
      await onRefresh()
    } catch {
      toast.error('保存失败，请确认管理员会话仍然有效。')
    } finally {
      setBusy(false)
    }
  }

  /** 删除文章前明确确认，避免列表上的误点击造成内容丢失。 */
  async function removePost(post: BlogPost) {
    if (busy || !modeReady || !modeEnabled) return
    if (!window.confirm(`确定删除《${post.title}》吗？`)) return
    setBusy(true)
    try {
      const result = await deleteBlogPostFn({ data: { id: post.id } })
      if (result.deleted) toast.success('文章已删除')
      else toast.error('文章不存在，可能已被删除。')
      if (editingId === post.id) resetForm()
      await onRefresh()
    } catch {
      toast.error('删除失败，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  const canEdit = modeReady && modeEnabled

  /** 编辑文章时拦截浏览器默认的“保存网页”，改为提交当前文章内容。 */
  useEffect(() => {
    if (!editingId || !canEdit) return

    function handleSaveShortcut(event: KeyboardEvent) {
      if ((!event.ctrlKey && !event.metaKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      if (!busy) editorFormRef.current?.requestSubmit()
    }

    window.addEventListener('keydown', handleSaveShortcut)
    return () => window.removeEventListener('keydown', handleSaveShortcut)
  }, [busy, canEdit, editingId])

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold">博客管理</h1>
          <p className="mb-0 mt-1 text-sm text-fg-2">文章内容直接保存到 D1 数据库，发布后公开显示在 /blog。</p>
        </div>
        <FileText className="mt-1 shrink-0 text-primary" size={24} />
      </div>

      {errorMessage && <p className="mb-5 text-sm text-destructive" role="alert">{errorMessage}</p>}

      {!canEdit && (
        <Card className="mb-5 border-amber-500/30 bg-amber-500/5 p-4 text-sm text-fg-2">
          <p className="m-0 font-semibold text-foreground">当前为只读状态</p>
          <p className="mb-0 mt-1">请先在左下角开启 666 模式，才能新增、修改或删除文章。</p>
        </Card>
      )}

      {canEdit && (
        <Card className="mb-6 grid gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-semibold">{editingId ? '编辑文章' : '新增文章'}</h2>
            {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}><X size={15} />取消编辑</Button>}
          </div>
          <form ref={editorFormRef} className="grid gap-4" onSubmit={savePost}>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-title">标题</Label>
              <Input id="blog-title" value={form.title} maxLength={200} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </div>
            <div className="grid gap-1.5 sm:max-w-sm">
              <Label htmlFor="blog-date">文章日期</Label>
              <div className="flex items-center gap-2">
                <Input id="blog-date" className="min-w-0 flex-1" type="datetime-local" step="60" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} required />
                <Button type="button" variant="outline" onClick={() => setForm({ ...form, publishedAt: formatDateTimeLocal(new Date()) })} disabled={busy}>此时</Button>
              </div>
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

      {loading ? (
        <p className="text-sm text-fg-3">正在读取文章……</p>
      ) : (
        <div className="grid max-w-3xl gap-3">
          {posts.length === 0 && <p className="text-sm text-fg-3">还没有文章，开启模式后可以发布第一篇。</p>}
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="m-0 truncate text-base font-semibold">{post.title}</h2>
                  <p className="mb-0 mt-1 text-xs text-fg-3">{fmtDate(post.publishedAt)}</p>
                  <p className="mb-0 mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-fg-2">{post.content}</p>
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
      )}
    </>
  )
}
