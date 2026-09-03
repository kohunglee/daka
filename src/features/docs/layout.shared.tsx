import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: '打卡润文档' },
    links: [{ text: '首页', url: '/' }],
    githubUrl: 'https://github.com/kohunglee/daka',
  }
}
