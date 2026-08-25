import { defineConfig } from 'vitepress'

// VitePress 站点配置
// 文档：https://vitepress.dev/zh/config/
export default defineConfig({
  // GitHub Pages 项目站点，URL 为 https://mmmaye.github.io/Blog/
  // 因此 base 必须是 /Blog/，否则资源路径会 404
  base: '/Blog/',

  // 站点标题（显示在浏览器标签页与导航栏左侧）
  lang: 'zh-CN',
  title: 'MMMaYe 博客',
  description: '个人技术博客 · 记录学习与实践',

  // 开启最后更新时间（基于 git 提交时间）
  lastUpdated: true,

  // 清理输出目录，避免旧文件残留
  cleanUrls: true,

  // Markdown 标题层级提取范围
  markdown: {
    toc: {
      level: [2, 3]
    }
  },

  // 默认主题配置
  themeConfig: {
    // 强制默认暗色模式 - 与 DeepSeek Harness 风格一致
    darkMode: 'dark',

    // 站点标题旁边的 Logo（可替换为 public/ 下的图片）
    logo: '/logo.svg',

    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '博客', link: '/第一篇' },
      { text: '关于', link: '/about' },
      {
        text: 'GitHub',
        link: 'https://github.com/MMMaYe/Blog'
      }
    ],

    // 侧边栏：支持多级嵌套，实现树状折叠分类
    sidebar: [
      {
        text: '入门',
        items: [
          { text: '第一篇博客', link: '/第一篇' }
        ]
      },
      {
        text: '后端技术',
        // 一级分类下可以继续嵌套二级分类
        items: [
          {
            text: 'Java',
            items: [
              { text: 'JVM 基础', link: '/java/jvm-basics' },
              { text: '并发编程', link: '/java/concurrent' }
            ]
          },
          {
            text: 'Spring',
            items: [
              { text: 'Spring Boot 原理', link: '/spring/boot' }
            ]
          }
        ]
      },
      {
        text: '中间件',
        items: [
          { text: 'Redis', link: '/middleware/redis' },
          { text: '消息队列', link: '/middleware/mq' }
        ]
      }
    ],

    // 右上角搜索（本地索引，无需外部服务）
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文章',
            buttonAriaLabel: '搜索'
          },
          modal: {
            displayDetails: '显示详细列表',
            resetButtonTitle: '清除查询',
            noResultsText: '没有找到结果',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },

    // 社交链接（显示在导航栏）
    socialLinks: [
      { icon: 'github', link: 'https://github.com/MMMaYe/Blog' }
    ],

    // 底部「上一篇 / 下一篇」导航
    outline: {
      level: [2, 3],
      label: '本页目录'
    },

    // 文档底部信息
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    // 编辑链接（可选）
    editLink: {
      pattern: 'https://github.com/MMMaYe/Blog/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    // 最后更新时间显示格式
    lastUpdatedText: '最后更新',

    // 返回顶部按钮
    returnToTopLabel: '返回顶部',

    // 侧边栏折叠
    sidebarMenuLabel: '菜单',
    returnToPrevSiteLabel: '返回站点'
  }
})
