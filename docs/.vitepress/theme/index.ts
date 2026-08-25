import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import HarnessBackground from './HarnessBackground.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      // 仅首页（layout: home）渲染：DeepSeek Harness 风格流体背景 + 交互点阵
      'home-hero-before': () => h(HarnessBackground)
    })
}
