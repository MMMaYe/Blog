<template>
  <div class="hero-logo" aria-hidden="true">
    <div class="hero-logo__glow"></div>
    <svg class="hero-logo__svg" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="heroManeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#4d6bfe"/>
          <stop offset="1" stop-color="#7c9bff"/>
        </linearGradient>
        <linearGradient id="heroStrokeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#c7d2fe"/>
        </linearGradient>
        <filter id="heroGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>
      <!-- 外轮廓线稿，贴近用户参考图 -->
      <path class="hero-logo__outline"
            d="M22 54
               C 28 46 38 42 48 40
               C 52 32 58 26 66 22
               C 70 14 74 10 78 14
               C 82 18 82 24 80 28
               C 90 34 98 44 102 56
               C 106 70 102 86 92 96
               C 80 108 62 108 48 100
               C 36 92 28 80 24 68
               C 20 62 20 58 22 54
               Z"
            fill="none" stroke="url(#heroStrokeGrad)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#heroGlow)"/>
      <!-- 鬃毛 -->
      <path class="hero-logo__mane"
            d="M66 22
               C 74 24 82 30 88 38
               C 94 48 96 60 92 72
               C 86 64 82 54 78 44
               C 74 36 70 28 66 22
               Z"
            fill="url(#heroManeGrad)" filter="url(#heroGlow)"/>
      <!-- 颈部内侧曲线 -->
      <path class="hero-logo__throat"
            d="M28 72
               C 38 78 48 88 56 96
               C 48 100 38 98 32 90
               C 28 84 26 78 28 72
               Z"
            fill="url(#heroManeGrad)" filter="url(#heroGlow)"/>
    </svg>
  </div>
</template>

<style scoped>
.hero-logo {
  position: relative;
  width: clamp(220px, 30vw, 320px);
  height: clamp(220px, 30vw, 320px);
  animation: hero-float 6s ease-in-out infinite;
}

.hero-logo__svg {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 28px rgba(77, 107, 254, 0.35));
}

.hero-logo__glow {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(77, 107, 254, 0.22) 0%, rgba(77, 107, 254, 0.08) 40%, transparent 70%);
  filter: blur(24px);
  animation: hero-pulse 4s ease-in-out infinite;
  z-index: 1;
}

.hero-logo__outline,
.hero-logo__mane,
.hero-logo__throat {
  transform-origin: center;
  animation: hero-breathe 5s ease-in-out infinite;
}

@keyframes hero-float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-14px) rotate(1.5deg);
  }
}

@keyframes hero-pulse {
  0%, 100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
}

@keyframes hero-breathe {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-logo,
  .hero-logo__glow,
  .hero-logo__outline,
  .hero-logo__mane,
  .hero-logo__throat {
    animation: none;
  }
}
</style>
