import { useEffect, useState } from 'react'

/**
 * 666模式的浏览器端开关。
 * 这里只保存当前浏览器的视觉状态，真正的管理员权限仍由管理员角色控制。
 */
export const MODE_666_STORAGE_KEY = 'flarestarter:666-mode'

/** 同一标签页切换666模式时，用自定义事件通知已挂载的页面。 */
export const MODE_666_EVENT = 'flarestarter:666-mode-change'

/** 读取浏览器本地666模式状态；服务端渲染期间默认关闭。 */
export function read666Mode(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(MODE_666_STORAGE_KEY) === '1'
}

/** 写入666模式，并同步通知当前标签页和其他标签页。 */
export function set666Mode(enabled: boolean): void {
  if (typeof window === 'undefined') return

  if (enabled) {
    window.localStorage.setItem(MODE_666_STORAGE_KEY, '1')
  } else {
    window.localStorage.removeItem(MODE_666_STORAGE_KEY)
  }

  window.dispatchEvent(new Event(MODE_666_EVENT))
}

/**
 * 订阅666模式状态，统一处理当前标签页切换和其他标签页同步。
 * ready 用来区分服务端默认值，避免本地状态尚未读取时误跳转。
 */
export function use666Mode(): { enabled: boolean; ready: boolean } {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const sync = () => {
      setEnabled(read666Mode())
      setReady(true)
    }

    sync()
    window.addEventListener(MODE_666_EVENT, sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener(MODE_666_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return { enabled, ready }
}
