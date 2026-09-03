import { useEffect, useRef } from 'react'

/**
 * 将站长保存在全站设置中的 Footer HTML 插入到真实页足。
 *
 * React 的 dangerouslySetInnerHTML 不会执行其中的 script，因此这里逐个重建
 * script 节点；这让常见的统计、客服等第三方脚本与传统 PHP Footer 一样生效。
 * 内容只允许隐藏管理员会话写入，仍应只粘贴陛下信任的代码。
 */
export function CustomFooterHtml({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 首次 SSR 时，原始内容位于 template 中；先取出它，再清空容器，避免
    // 直接用 innerHTML 插入的 script 被浏览器当作普通文本而不执行。
    const serverTemplate = container.querySelector<HTMLTemplateElement>('[data-custom-footer-template="true"]')
    const template = serverTemplate ?? document.createElement('template')
    if (!serverTemplate && html) template.innerHTML = html
    container.replaceChildren()
    if (!html) return

    const fragment = document.createDocumentFragment()
    for (const node of Array.from(template.content.childNodes)) {
      fragment.appendChild(cloneFooterNodeWithExecutableScripts(node))
    }
    container.appendChild(fragment)

    return () => container.replaceChildren()
  }, [html])

  return (
    <div ref={containerRef} className="contents" data-custom-footer-html="true">
      {html ? (
        <template
          data-custom-footer-template="true"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : null}
    </div>
  )
}

/** 克隆任意 HTML 节点，并让嵌套在其中的脚本以真实 script 标签方式重新执行。 */
function cloneFooterNodeWithExecutableScripts(node: Node): Node {
  if (node instanceof HTMLScriptElement) {
    const script = document.createElement('script')
    for (const attribute of Array.from(node.attributes)) {
      script.setAttribute(attribute.name, attribute.value)
    }
    script.text = node.textContent ?? ''
    return script
  }

  const clone = node.cloneNode(false)
  for (const child of Array.from(node.childNodes)) {
    clone.appendChild(cloneFooterNodeWithExecutableScripts(child))
  }
  return clone
}
