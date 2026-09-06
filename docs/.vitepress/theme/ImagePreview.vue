<template>
  <Teleport to="body">
    <Transition name="ipv">
      <div
        v-if="visible && current"
        ref="maskEl"
        class="ipv-mask"
        :class="{ 'is-grabbing': dragging }"
        @click="onMaskClick"
        @dblclick="onDblClick"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div
          class="ipv-stage"
          :style="{
            '--ipv-tx': tx + 'px',
            '--ipv-ty': ty + 'px',
            '--ipv-s': scale
          }"
        >
          <img
            class="ipv-img"
            :src="current.src"
            :alt="current.alt"
            draggable="false"
            @load="onImgLoad"
            @error="onImgLoad"
          />
        </div>

        <div v-if="loading" class="ipv-loading">加载中…</div>

        <!-- 顶部：标题 / 计数 + 关闭 -->
        <div class="ipv-bar ipv-bar--top">
          <span class="ipv-title">
            <template v-if="total > 1">{{ index + 1 }} / {{ total }}</template>
            <template v-if="total > 1 && current.alt"> · </template>
            <template v-if="current.alt">{{ current.alt }}</template>
          </span>
          <button
            class="ipv-btn ipv-btn--close"
            type="button"
            aria-label="关闭 (Esc)"
            title="关闭 (Esc)"
            @click="close"
          >
            ✕
          </button>
        </div>

        <!-- 左右切换 -->
        <button
          v-if="total > 1"
          class="ipv-nav ipv-nav--prev"
          type="button"
          aria-label="上一张 (←)"
          title="上一张 (←)"
          @click="prev"
        >
          ‹
        </button>
        <button
          v-if="total > 1"
          class="ipv-nav ipv-nav--next"
          type="button"
          aria-label="下一张 (→)"
          title="下一张 (→)"
          @click="next"
        >
          ›
        </button>

        <!-- 底部：缩放控制 -->
        <div class="ipv-bar ipv-bar--bottom">
          <button
            class="ipv-btn"
            type="button"
            title="缩小 (-)"
            aria-label="缩小"
            @click="zoomOut"
          >
            －
          </button>
          <span class="ipv-scale">{{ Math.round(scale * 100) }}%</span>
          <button
            class="ipv-btn"
            type="button"
            title="放大 (+)"
            aria-label="放大"
            @click="zoomIn"
          >
            ＋
          </button>
          <button
            class="ipv-btn ipv-btn--text"
            type="button"
            title="复位 (0)"
            @click="reset"
          >
            复位
          </button>
          <a
            class="ipv-btn ipv-btn--text"
            :href="current.src"
            target="_blank"
            rel="noopener"
            title="新标签页打开原图"
          >
            原图
          </a>
        </div>

        <div v-if="total > 1" class="ipv-hint">← → 切换 · 滚轮缩放 · 拖拽平移 · Esc 关闭</div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// 正文图片作用域：VitePress 正文内容区
const SCOPE = '.vp-doc, .VPDoc-content'

const MIN_SCALE = 0.2
const MAX_SCALE = 8
const STEP = 1.3

const visible = ref(false)
const images = ref([])
const index = ref(0)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
const loading = ref(false)
const dragging = ref(false)
const maskEl = ref(null)

const total = computed(() => images.value.length)
const current = computed(() => images.value[index.value] || null)

/* ---------------- 图片收集 ---------------- */

/**
 * 收集当前页面正文中的可预览图片：
 * - 排除被 <a> 包裹的图片（保留原有链接跳转）
 * - 排除显式标记 data-no-zoom 的图片
 */
function collectImages() {
  const scope = document.querySelector(SCOPE)
  if (!scope) return []
  return Array.from(scope.querySelectorAll('img'))
    .filter((img) => !img.closest('a') && !img.hasAttribute('data-no-zoom'))
    .map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt || ''
    }))
}

/* ---------------- 打开 / 关闭 ---------------- */

function open(list, startIndex) {
  images.value = list
  index.value = startIndex
  resetTransform()
  loading.value = true
  visible.value = true
  lockScroll()
}

function close() {
  visible.value = false
  unlockScroll()
}

function resetTransform() {
  scale.value = 1
  tx.value = 0
  ty.value = 0
}

/* ---------------- 切换 ---------------- */

function go(delta) {
  if (total.value < 2) return
  index.value = (index.value + delta + total.value) % total.value
  resetTransform()
  loading.value = true
}

const next = () => go(1)
const prev = () => go(-1)

/* ---------------- 缩放 ---------------- */

/**
 * 以视口中的 (cx, cy) 为锚点缩放到 nextScale，保证该点视觉位置不变
 */
function zoomAt(nextScale, cx, cy) {
  const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale))
  if (Math.abs(s - scale.value) < 1e-4) return

  const rect = maskEl.value?.getBoundingClientRect()
  const ox = cx - (rect ? rect.width / 2 : 0)
  const oy = cy - (rect ? rect.height / 2 : 0)
  const ratio = s / scale.value

  tx.value = ox - (ox - tx.value) * ratio
  ty.value = oy - (oy - ty.value) * ratio
  scale.value = s
}

function centerPoint() {
  const rect = maskEl.value?.getBoundingClientRect()
  return {
    x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
    y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2
  }
}

function zoomIn() {
  const { x, y } = centerPoint()
  zoomAt(scale.value * STEP, x, y)
}

function zoomOut() {
  const { x, y } = centerPoint()
  zoomAt(scale.value / STEP, x, y)
}

const reset = () => resetTransform()

function onWheel(e) {
  // 必须判断：该监听器挂在 window 且 passive: false，
  // 预览未打开时绝不能 preventDefault，否则会导致整站无法滚动
  if (!visible.value) return
  e.preventDefault()
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  zoomAt(scale.value * factor, e.clientX, e.clientY)
}

function onDblClick(e) {
  // 仅对图片生效：双击背景按「关闭」处理，避免语义冲突
  if (!e.target.closest('.ipv-img')) return
  if (scale.value > 1.01) resetTransform()
  else zoomAt(2.5, e.clientX, e.clientY)
}

// 加载完成或失败都要结束 loading 状态，避免失败时一直卡在「加载中」
function onImgLoad() {
  loading.value = false
}

/* ---------------- 拖拽 / 双指缩放 ---------------- */

const pointers = new Map()
let startDist = 0
let startScale = 1
let lastX = 0
let lastY = 0
let moved = false
// setPointerCapture 可能改变 click 的 target，
// 因此在 pointerdown 时先行记录是否按在图片上
let downOnImage = false

function onPointerDown(e) {
  downOnImage = !!e.target.closest('.ipv-img')

  // 工具栏与切换按钮上的按下不参与拖拽
  if (e.target.closest('.ipv-bar, .ipv-nav')) return

  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  if (pointers.size === 1) {
    dragging.value = true
    moved = false
    lastX = e.clientX
    lastY = e.clientY
    maskEl.value?.setPointerCapture?.(e.pointerId)
  } else if (pointers.size === 2) {
    const [p1, p2] = Array.from(pointers.values())
    startDist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    startScale = scale.value
    dragging.value = false
  }
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

  // 双指捏合缩放
  if (pointers.size >= 2) {
    const [p1, p2] = Array.from(pointers.values()).slice(0, 2)
    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    if (startDist > 0) {
      zoomAt(startScale * (dist / startDist), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2)
    }
    return
  }

  if (pointers.size === 1 && dragging.value) {
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    tx.value += dx
    ty.value += dy
    lastX = e.clientX
    lastY = e.clientY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true
  }
}

function onPointerUp(e) {
  pointers.delete(e.pointerId)
  if (pointers.size === 0) {
    dragging.value = false
    startDist = 0
  }
  maskEl.value?.releasePointerCapture?.(e.pointerId)
}

/* ---------------- 点击背景关闭 ---------------- */

function onMaskClick(e) {
  // 拖拽结束时 suppress 一次 click，避免误关闭
  if (moved) {
    moved = false
    return
  }
  // 按下时位于图片或控件上，均视为「非背景点击」
  if (downOnImage) return
  if (e.target.closest('.ipv-img, .ipv-bar, .ipv-nav')) return
  close()
}

/* ---------------- 点击正文图片 ---------------- */

function onDocClick(e) {
  if (visible.value) return

  const img = e.target
  if (!(img instanceof HTMLImageElement)) return
  if (img.closest('a') || img.hasAttribute('data-no-zoom')) return
  if (!img.closest(SCOPE)) return

  e.preventDefault()

  const list = collectImages()
  if (!list.length) return

  const src = img.currentSrc || img.src
  const i = list.findIndex((it) => it.src === src)
  open(list, i >= 0 ? i : 0)
}

/* ---------------- 键盘 ---------------- */

function onKeydown(e) {
  if (!visible.value) return
  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowLeft':
      prev()
      break
    case 'ArrowRight':
      next()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetTransform()
      break
    default:
      return
  }
  e.preventDefault()
}

/* ---------------- 滚动锁定 ---------------- */

let prevOverflow = ''
let prevPaddingRight = ''

function lockScroll() {
  const html = document.documentElement
  const sw = window.innerWidth - html.clientWidth

  prevOverflow = html.style.overflow
  prevPaddingRight = html.style.paddingRight

  html.style.overflow = 'hidden'
  // 隐藏滚动条时补偿宽度，避免页面横向跳动
  if (sw > 0) {
    const cur = parseFloat(getComputedStyle(html).paddingRight) || 0
    html.style.paddingRight = `${cur + sw}px`
  }
}

function unlockScroll() {
  const html = document.documentElement
  html.style.overflow = prevOverflow
  html.style.paddingRight = prevPaddingRight
}

/* ---------------- 生命周期 ---------------- */

onMounted(() => {
  // 事件委托：动态渲染的文章内容无需重新绑定
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  // 路由切换后关闭预览
  window.addEventListener('hashchange', close)
  window.addEventListener('popstate', close)
  // wheel 需要 passive: false 才能 preventDefault
  window.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('hashchange', close)
  window.removeEventListener('popstate', close)
  window.removeEventListener('wheel', onWheel)
  unlockScroll()
})
</script>

<style scoped>
.ipv-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 8, 10, 0.88);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: zoom-out;
  touch-action: none;
  user-select: none;
  overscroll-behavior: contain;
}

.ipv-mask.is-grabbing {
  cursor: grabbing;
}

.ipv-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate3d(var(--ipv-tx), var(--ipv-ty), 0) scale(var(--ipv-s));
  transform-origin: center center;
  transition: transform 0.18s ease-out;
  will-change: transform;
}

.ipv-mask.is-grabbing .ipv-stage {
  transition: none;
}

.ipv-img {
  max-width: 92vw;
  max-height: 84vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
  background: #fff;
  cursor: grab;
  -webkit-user-drag: none;
}

.ipv-mask.is-grabbing .ipv-img {
  cursor: grabbing;
}

/* 顶部 / 底部工具栏 */
.ipv-bar {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.9);
  cursor: default;
}

.ipv-bar--top {
  top: 0;
  justify-content: space-between;
  background: linear-gradient(rgba(0, 0, 0, 0.45), transparent);
}

.ipv-bar--bottom {
  bottom: 0;
  justify-content: center;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.45));
}

.ipv-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
  max-width: 70vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ipv-scale {
  min-width: 56px;
  text-align: center;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.82);
}

.ipv-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.ipv-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.3);
}

.ipv-btn--text {
  font-size: 13px;
}

.ipv-btn--close {
  border-radius: 50%;
  padding: 0;
}

/* 左右切换 */
.ipv-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.92);
  font-size: 30px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.ipv-nav:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.3);
}

.ipv-nav--prev {
  left: 20px;
}

.ipv-nav--next {
  right: 20px;
}

.ipv-loading,
.ipv-hint {
  position: absolute;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  pointer-events: none;
}

.ipv-loading {
  top: 50%;
  transform: translateY(-50%);
}

.ipv-hint {
  bottom: 62px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
}

/* 入场 / 出场过渡 */
.ipv-enter-active,
.ipv-leave-active {
  transition: opacity 0.22s ease;
}

.ipv-enter-from,
.ipv-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .ipv-img {
    max-width: 96vw;
    max-height: 76vh;
  }

  .ipv-nav {
    width: 40px;
    height: 40px;
    font-size: 26px;
  }

  .ipv-nav--prev {
    left: 8px;
  }

  .ipv-nav--next {
    right: 8px;
  }

  .ipv-title {
    max-width: 55vw;
  }
}
</style>

<!-- 非 scoped：为正文图片增加可放大的光标提示 -->
<style>
.vp-doc img:not([data-no-zoom]),
.VPDoc-content img:not([data-no-zoom]) {
  cursor: zoom-in;
}
</style>
