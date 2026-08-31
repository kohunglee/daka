import { useEffect, useRef } from 'react'

/**
 * 文章评论模块。
 *
 * Waline 由外部 CDN 提供，组件只在文章详情页挂载后加载，避免把评论脚本
 * 加入首页和博客列表页。每次切换文章时，使用当前文章的完整 URL 作为评论路径。
 */
export function WalineComments() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 文章页是客户端路由，脚本需要通过 DOM 动态插入，才能在每次切换文章时初始化。
    const styleId = 'waline-comments-style'
    let styleLink = document.getElementById(styleId)
    if (!styleLink) {
      styleLink = document.createElement('link')
      styleLink.id = styleId
      styleLink.setAttribute('rel', 'stylesheet')
      styleLink.setAttribute('href', 'https://cdn.rawlab.win/htmx/waline-s1x2.css')
      document.head.appendChild(styleLink)
    }

    const script = document.createElement('script')
    script.type = 'module'
    script.textContent = `
      import { init } from 'https://cdn.rawlab.win/htmx/waline-u9fn.js';
      init({
        el: '#waline',
        serverURL: 'https://waline.rawlab.win',
        lang: 'zh-CN',
        path: ${JSON.stringify(window.location.origin + window.location.pathname)},
        dark: 'auto',
      });
    `
    document.body.appendChild(script)

    return () => {
      // 切换文章时清空旧实例，防止旧文章的评论控件残留在新文章页面。
      container.replaceChildren()
      script.remove()
    }
  }, [])

  return <div id="waline" ref={containerRef} />
}
