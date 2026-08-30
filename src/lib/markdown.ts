import { marked } from 'marked'

/**
 * 将 Markdown 文本安全地转换为可展示的 HTML。
 * 博客内容来自数据库，允许标准 Markdown，但把原始 HTML 当作普通文字处理，避免文章内容直接注入页面标签。
 */
export function renderMarkdown(source: string): string {
  const renderer = new marked.Renderer()
  renderer.html = ({ text }) => escapeHtml(text)

  return marked.parse(source, {
    async: false,
    breaks: true,
    gfm: true,
    renderer,
  })
}

/** 将 Markdown 中不应执行的原始 HTML 字符转义成普通文字。 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
