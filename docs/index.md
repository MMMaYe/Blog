---
# 首页 Frontmatter：VitePress 默认主题的 Hero + Features 布局
# 文档：https://vitepress.dev/zh/reference/default-theme-home-page
layout: home

hero:
  name: "MMMaYe 博客"
  text: "记录学习与实践"
  tagline: Java · 中间件 · 系统设计 · 个人成长
  image:
    src: /logo.svg
    alt: Logo
  actions:
    - theme: brand
      text: 开始阅读
      link: /第一篇
    - theme: alt
      text: 关于我
      link: /about

features:
  - icon: ⚡️
    title: 极速加载
    details: 基于 Vite 构建，毫秒级热更新，体验丝滑。
  - icon: 📝
    title: Markdown 写作
    details: 专注内容创作，无需关心样式，自动生成导航与目录。
  - icon: 🔍
    title: 全文搜索
    details: 内置本地搜索，无需第三方服务，离线也能查。
  - icon: 🌙
    title: 暗色模式
    details: 自动跟随系统主题，也可手动切换，护眼舒适。
  - icon: 📱
    title: 移动端适配
    details: 响应式布局，手机、平板、桌面都好看。
  - icon: 🚀
    title: 自动部署
    details: 推送到 GitHub 即自动构建并发布到 GitHub Pages。
---
