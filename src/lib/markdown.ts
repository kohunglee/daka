import { marked } from 'marked'

/**
 * 将 Markdown 文本转换为可展示的 HTML。
 * 博客内容支持传统 Markdown，也支持文章中常见的原始 HTML 图片、链接等写法。
 */
export function renderMarkdown(source: string): string {
  return marked.parse(source, {
    async: false,
    breaks: true,
    gfm: true,
  })
}
