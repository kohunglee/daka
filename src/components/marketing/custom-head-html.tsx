import { useEffect } from 'react'

/**
 * 将站长保存在全站设置中的 Head HTML 插入真实文档 head。
 *
 * React 的 dangerouslySetInnerHTML 不会执行其中的 script，因此这里逐个重建
 * script 节点；内容只允许隐藏管理员会话写入，仍应只粘贴陛下信任的代码。
 */
export function CustomHeadHtml({ html }: { html: string }) {
  useEffect(() => {
    const marker = '[data-custom-head-html="true"]'
    document.head.querySelectorAll(marker).forEach((node) => node.remove())
    if (!html) return

    // 服务端先把原始 HTML 放在 template 中，避免它进入 TanStack 的序列化状态后
    // 看起来像被转义；template 内容不会立即执行，下面仍统一克隆 script 节点。
    const serverTemplate = document.head.querySelector<HTMLTemplateElement>('[data-custom-head-template="true"]')
    const template = serverTemplate ?? document.createElement('template')
    if (!serverTemplate) template.innerHTML = html
    const fragment = document.createDocumentFragment()
    for (const node of Array.from(template.content.childNodes)) {
      const cloned = cloneHeadNodeWithExecutableScripts(node)
      if (cloned instanceof Element) cloned.setAttribute('data-custom-head-html', 'true')
      fragment.appendChild(cloned)
    }
    serverTemplate?.remove()
    document.head.appendChild(fragment)

    return () => {
      document.head.querySelectorAll(marker).forEach((node) => node.remove())
    }
  }, [html])

  return html ? (
    <template
      data-custom-head-template="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : null
}

/** 克隆任意 Head 节点，并让脚本以真实 script 标签方式执行。 */
function cloneHeadNodeWithExecutableScripts(node: Node): Node {
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
    clone.appendChild(cloneHeadNodeWithExecutableScripts(child))
  }
  return clone
}
