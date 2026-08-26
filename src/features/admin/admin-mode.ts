/**
 * 管理员模式的浏览器端开关。
 * 这里只保存当前浏览器的视觉状态，真正的管理权限仍由管理员会话控制。
 */
export const ADMIN_MODE_STORAGE_KEY = 'flarestarter:admin-mode'

/** 同一标签页切换管理员模式时，用自定义事件通知已挂载的首页 Header。 */
export const ADMIN_MODE_EVENT = 'flarestarter:admin-mode-change'

/** 读取浏览器本地管理员模式状态；服务端渲染期间默认关闭。 */
export function readAdminMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(ADMIN_MODE_STORAGE_KEY) === '1'
}

/** 写入管理员模式，并同步通知当前标签页和其他标签页。 */
export function setAdminMode(enabled: boolean): void {
  if (typeof window === 'undefined') return

  if (enabled) {
    window.localStorage.setItem(ADMIN_MODE_STORAGE_KEY, '1')
  } else {
    window.localStorage.removeItem(ADMIN_MODE_STORAGE_KEY)
  }

  window.dispatchEvent(new Event(ADMIN_MODE_EVENT))
}
