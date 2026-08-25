import DefaultTheme from 'vitepress/theme'
import './custom.css'

// 粒子效果初始化 - 在客户端运行
function initParticles() {
  if (typeof window === 'undefined') return

  const inject = () => {
    const hero = document.querySelector('.VPHero')
    if (!hero) return
    if (hero.querySelector('.aurora-particles')) return

    const canvas = document.createElement('canvas')
    canvas.className = 'aurora-particles'
    hero.insertBefore(canvas, hero.firstChild)
    startParticleAnimation(canvas)
  }

  // 立即尝试
  inject()

  // 延迟重试（确保 VitePress 渲染完成）
  setTimeout(inject, 500)
  setTimeout(inject, 1500)

  // MutationObserver 监听 DOM 变化
  const observer = new MutationObserver(() => {
    inject()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

// Canvas 粒子动画
function startParticleAnimation(canvas) {
  const ctx = canvas.getContext('2d')
  let particles = []

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    ctx.scale(dpr, dpr)
    initParticles()
  }

  function initParticles() {
    const rect = canvas.parentElement.getBoundingClientRect()
    const count = Math.min(60, Math.floor((rect.width * rect.height) / 20000))
    particles = []
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
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
    const rect = canvas.parentElement.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)

    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy

      if (p.x < 0) p.x = rect.width
      if (p.x > rect.width) p.x = 0
      if (p.y < 0) p.y = rect.height
      if (p.y > rect.height) p.y = 0

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

    // 近邻连线
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
  window.addEventListener('resize', () => {
    clearTimeout(window._particleResizeTimer)
    window._particleResizeTimer = setTimeout(resize, 200)
  })
}

export default {
  extends: DefaultTheme,
  enhanceApp() {
    if (typeof window !== 'undefined') {
      // DOM 就绪后启动粒子效果
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initParticles)
      } else {
        initParticles()
      }
      // 路由变化后重试
      window.addEventListener('hashchange', () => setTimeout(initParticles, 300))
    }
  }
}
