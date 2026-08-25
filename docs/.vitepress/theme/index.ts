import DefaultTheme from 'vitepress/theme'
import './custom.css'

/**
 * 页面类型检测：根据 .VPHero 是否存在判断是否为首页
 * 首页：添加 home-page class 启用极光背景 + 粒子
 * 其他页面：移除 home-page class，使用干净深色背景
 */
function detectAndSetPageType() {
  if (typeof window === 'undefined') return

  const html = document.documentElement
  const isHomePage = !!document.querySelector('.VPHero')

  if (isHomePage) {
    html.classList.add('home-page')
    ensureParticles()
  } else {
    html.classList.remove('home-page')
    removeParticles()
  }
}

/**
 * 确保粒子画布存在（仅首页）
 */
function ensureParticles() {
  if (document.querySelector('.aurora-particles')) return
  const canvas = document.createElement('canvas')
  canvas.className = 'aurora-particles'
  document.body.appendChild(canvas)
  startParticleAnimation(canvas)
}

/**
 * 移除粒子画布（切换到非首页时）
 */
function removeParticles() {
  const canvas = document.querySelector('.aurora-particles')
  if (canvas) {
    canvas.remove()
  }
}

/**
 * Canvas 粒子动画
 */
function startParticleAnimation(canvas) {
  const ctx = canvas.getContext('2d')
  let particles = []
  let running = true

  function resize() {
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.scale(dpr, dpr)
    initParticles()
  }

  function initParticles() {
    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 18000))
    particles = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2
      })
    }
  }

  function animate() {
    if (!running) return
    const w = window.innerWidth
    const h = window.innerHeight
    ctx.clearRect(0, 0, w, h)

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0) p.x = w
      if (p.x > w) p.x = 0
      if (p.y < 0) p.y = h
      if (p.y > h) p.y = 0

      p.twinklePhase += p.twinkleSpeed
      const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.twinklePhase))

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4)
      gradient.addColorStop(0, `rgba(167, 139, 250, ${currentOpacity})`)
      gradient.addColorStop(0.4, `rgba(139, 92, 246, ${currentOpacity * 0.5})`)
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0)')

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(203, 213, 225, ${currentOpacity})`
      ctx.fill()
    })

    ctx.lineWidth = 0.5
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 100) {
          const opacity = (1 - dist / 100) * 0.12
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`
          ctx.stroke()
        }
      }
    }

    requestAnimationFrame(animate)
  }

  resize()
  animate()

  // 当 canvas 被移除时停止动画
  const observer = new MutationObserver(() => {
    if (!document.body.contains(canvas)) {
      running = false
      observer.disconnect()
    }
  })
  observer.observe(document.body, { childList: true })

  window.addEventListener('resize', () => {
    clearTimeout(window._particleResizeTimer)
    window._particleResizeTimer = setTimeout(resize, 200)
  })
}

export default {
  extends: DefaultTheme,
  enhanceApp() {
    if (typeof window === 'undefined') return

    // 初始检测
    const start = () => {
      detectAndSetPageType()
      // 延迟重试（VitePress 渲染可能需要时间）
      setTimeout(detectAndSetPageType, 300)
      setTimeout(detectAndSetPageType, 1000)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start)
    } else {
      start()
    }

    // 路由变化时重新检测
    window.addEventListener('hashchange', () => {
      setTimeout(detectAndSetPageType, 300)
    })

    // MutationObserver 监听 DOM 变化（VitePress SPA 路由切换）
    const observer = new MutationObserver(() => {
      // 只在 .VPApp 内容变化时检测
      if (document.querySelector('.VPHero') || document.querySelector('.VPDoc')) {
        detectAndSetPageType()
      }
    })
    observer.observe(document.querySelector('.VPApp') || document.body, {
      childList: true,
      subtree: true
    })
  }
}
