import { useEffect } from 'react'

/** 陛下指定的 AreaEditor CDN：为原生 textarea 提供缩进和括号配对。 */
// 固定到已核验的提交，避免 jsDelivr 的分支地址更新后与 SRI 校验值失配、被浏览器拒绝执行。
export const AREA_EDITOR_SCRIPT_ID = 'areaeditor-runtime'
// 标准压缩版不依赖 eval；比极限压缩版略大，但能在严格浏览器环境稳定执行。
export const AREA_EDITOR_SCRIPT_URL = 'https://cdn.jsdelivr.net/gh/kohunglee/areaeditor@4653962414692dceaa26f60696d449e8bc17c53a/src/areaeditor.2.0.min.js'
export const AREA_EDITOR_SCRIPT_INTEGRITY = 'sha256-Fbwo/zqhKo5u8nTfbm2h3lFKtvn6hkcsooa6mHWW2aQ='

/** AreaEditor 只需要接收一个 textarea 元素；保留其公开缩进配置的最小类型。 */
interface AreaEditorInstance {
  indentType: {
    type: 'space' | 'tab'
    count: number
  }
}

/** 第三方脚本写入 window 的构造函数类型，避免在业务代码里使用 any。 */
type AreaEditorConstructor = new (
  elements: string | ArrayLike<Element>,
  options?: { indentType?: { type?: 'space' | 'tab'; count?: number } },
) => AreaEditorInstance

declare global {
  interface Window {
    AreaEditor?: AreaEditorConstructor
  }
}

/** 已绑定的文本框用 WeakSet 记录，React 路由切换时不会重复挂载键盘事件。 */
const enhancedTextareas = new WeakSet<HTMLTextAreaElement>()

/**
 * 根级文本框增强器。
 *
 * TanStack 路由会在不整页刷新的情况下替换页面正文，因此不能只在首屏执行一次；
 * MutationObserver 会为新出现的 textarea 补上 AreaEditor，同时不干预其他表单行为。
 */
export function AreaEditorProvider() {
  useEffect(() => {
    let active = true
    let observer: MutationObserver | null = null

    void loadAreaEditor().then((AreaEditor) => {
      if (!active || !AreaEditor) return

      enhanceTextareas(document, AreaEditor)
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const addedNode of Array.from(mutation.addedNodes)) {
            enhanceNodeTextareas(addedNode, AreaEditor)
          }
        }
      })
      observer.observe(document.body, { childList: true, subtree: true })
    })

    return () => {
      active = false
      observer?.disconnect()
    }
  }, [])

  return null
}

/** 对一个页面根节点内尚未处理过的所有 textarea 应用编辑增强。 */
function enhanceTextareas(root: ParentNode, AreaEditor: AreaEditorConstructor) {
  for (const textarea of Array.from(root.querySelectorAll('textarea'))) {
    enhanceTextarea(textarea, AreaEditor)
  }
}

/** 新增节点可能本身就是 textarea，也可能包含一组表单控件，二者都要覆盖。 */
function enhanceNodeTextareas(node: Node, AreaEditor: AreaEditorConstructor) {
  if (!(node instanceof Element)) return
  if (node instanceof HTMLTextAreaElement) enhanceTextarea(node, AreaEditor)
  enhanceTextareas(node, AreaEditor)
}

/** 单个文本框只实例化一次，避免重复监听导致一次按键插入多次字符。 */
function enhanceTextarea(textarea: HTMLTextAreaElement, AreaEditor: AreaEditorConstructor) {
  if (enhancedTextareas.has(textarea)) return
  try {
    // AreaEditor 运行库实际遍历的是传入值的 length，因此传入单元素列表而非裸 Element。
    new AreaEditor([textarea])
    enhancedTextareas.add(textarea)
  } catch {
    // 第三方增强失败时保留原生 textarea，不能阻塞表单填写和保存。
  }
}

/**
 * 只加载一次第三方脚本；SRI 固定内容校验，CDN 代码被意外替换时浏览器会拒绝执行。
 * 加载失败时返回 null，页面继续使用原生 textarea。
 */
function loadAreaEditor(): Promise<AreaEditorConstructor | null> {
  if (window.AreaEditor) return Promise.resolve(window.AreaEditor)

  const existing = document.getElementById(AREA_EDITOR_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) return waitForAreaEditor(existing)

  const script = document.createElement('script')
  script.id = AREA_EDITOR_SCRIPT_ID
  script.src = AREA_EDITOR_SCRIPT_URL
  script.integrity = AREA_EDITOR_SCRIPT_INTEGRITY
  script.crossOrigin = 'anonymous'
  script.async = true
  document.head.appendChild(script)
  return waitForAreaEditor(script)
}

/** 将 script 的 load/error 事件归一为可选构造函数，供页面安全降级。 */
function waitForAreaEditor(script: HTMLScriptElement): Promise<AreaEditorConstructor | null> {
  return new Promise((resolve) => {
    if (window.AreaEditor) {
      resolve(window.AreaEditor)
      return
    }
    script.addEventListener('load', () => resolve(window.AreaEditor ?? null), { once: true })
    script.addEventListener('error', () => resolve(null), { once: true })
  })
}
