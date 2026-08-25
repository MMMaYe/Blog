import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import HarnessBackground from './HarnessBackground.vue'
import './custom.css'

let homeDarkForced = false

/**
 * 首页强制保持暗色；离开首页时若暗色是我们强制添加的，则恢复用户原偏好
 */
function syncHomeAppearance() {
  if (typeof window === 'undefined') return

  const html = document.documentElement
  const isHomePage = !!document.querySelector('.VPHome')

  if (isHomePage) {
    html.classList.add('home-page')
    if (!html.classList.contains('dark')) {
      html.classList.add('dark')
      homeDarkForced = true
    } else {
      homeDarkForced = false
    }
  } else {
    html.classList.remove('home-page')
    if (homeDarkForced) {
      html.classList.remove('dark')
      homeDarkForced = false
    }
  }
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

    const start = () => {
      syncHomeAppearance()
      setTimeout(syncHomeAppearance, 300)
      setTimeout(syncHomeAppearance, 1000)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start)
    } else {
      start()
    }

    window.addEventListener('hashchange', () => {
      setTimeout(syncHomeAppearance, 300)
    })

    const observer = new MutationObserver(() => {
      if (document.querySelector('.VPHome') || document.querySelector('.VPDoc')) {
        syncHomeAppearance()
      }
    })
    observer.observe(document.querySelector('.VPApp') || document.body, {
      childList: true,
      subtree: true
    })
  }
}
