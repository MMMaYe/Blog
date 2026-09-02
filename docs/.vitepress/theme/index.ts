import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import HarnessBackground from './HarnessBackground.vue'
import './custom.css'

// VitePress 存储用户外观偏好的 key（默认主题使用）
const APPEARANCE_KEY = 'vitepress-theme-appearance'
// 兜底标记：即便 VitePress 的存储 key 发生变化，也能记住用户已主动选择过外观
const USER_CHOSE_KEY = 'blog-appearance-chosen'

/**
 * 用户是否主动选择过外观。未选择过才应用默认白天模式，
 * 保证「手动切到暗色」永远有效。
 */
function hasUserChosen() {
  try {
    return (
      !!localStorage.getItem(APPEARANCE_KEY) ||
      !!localStorage.getItem(USER_CHOSE_KEY)
    )
  } catch (e) {
    // 隐私模式下 localStorage 不可用：退化为不强制，避免破坏切换
    return true
  }
}

/**
 * 默认白天模式：仅在用户「从未手动切换过」外观时强制亮色。
 * - 新访客 / 偏好为 auto：系统若是暗色也会被纠正为亮色
 * - 用户手动选择过 dark / light：完全尊重用户选择
 */
function applyDefaultLight() {
  if (typeof window === 'undefined') return
  if (hasUserChosen()) return
  document.documentElement.classList.remove('dark')
}

/**
 * 记录用户主动切换过外观。使用捕获阶段，先于 VitePress 的点击处理执行，
 * 确保标记在 dark class 变化之前写入。
 */
function watchUserChoose() {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target
      if (target && target.closest && target.closest('.VPSwitchAppearance')) {
        try {
          localStorage.setItem(USER_CHOSE_KEY, '1')
        } catch (_) {}
      }
    },
    true
  )
}

/**
 * 同步首页标记 home-page（用于首页导航栏适配深色 Hero 背景）
 */
function syncHomeFlag() {
  if (typeof window === 'undefined') return
  const isHomePage = !!document.querySelector('.VPHome')
  document.documentElement.classList.toggle('home-page', isHomePage)
}

function sync() {
  applyDefaultLight()
  syncHomeFlag()
}

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      // 仅首页（layout: home）渲染：DeepSeek Harness 风格流体背景 + 交互点阵
      'home-hero-before': () => h(HarnessBackground)
    }),
  enhanceApp() {
    if (typeof window === 'undefined') return

    watchUserChoose()

    const start = () => {
      sync()
      setTimeout(sync, 300)
      setTimeout(sync, 1000)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start)
    } else {
      start()
    }

    // 站内路由切换
    window.addEventListener('hashchange', () => {
      setTimeout(sync, 300)
    })

    // 路由切换后 DOM 结构变化，重新同步首页标记
    const observer = new MutationObserver(() => {
      syncHomeFlag()
    })
    observer.observe(document.querySelector('.VPApp') || document.body, {
      childList: true,
      subtree: true
    })
  }
}
