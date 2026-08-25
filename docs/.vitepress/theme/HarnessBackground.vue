<template>
  <div ref="wrap" class="harness-bg">
    <canvas ref="glCanvas" class="harness-canvas harness-canvas--fluid"></canvas>
    <canvas ref="gridCanvas" class="harness-canvas harness-canvas--grid"></canvas>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const wrap = ref(null)
const glCanvas = ref(null)
const gridCanvas = ref(null)
const cleanups = []

/**
 * 与 deepseek.com/harness 首页 hero 背景完全一致的参数
 */
const PARAMS = {
  type: 'fluid',
  mouseRadius: 0.09,
  mouseStrength: 1.8,
  mouseSmoothing: 0.1,
  mouseVelocity: 0.2,
  decay: 0.925,
  distortBoost: 2.2,
  noiseBoost: 0.3,
  swirlBoost: 0.8,
  glowIntensity: 0.13,
  glowColors: ['#fff7d1', '#538dca', '#2d448b'],
  speed: 28,
  distortion: 18,
  swirl: 20,
  swirlIterations: 12,
  scale: 1.77,
  rotation: 15,
  proportion: 60,
  softness: 80,
  shapeScale: 0,
  offsetX: -124,
  offsetY: -48,
  grain: 0.005,
  colors: ['#000000', '#1A3870', '#204a7e', '#eed8aa', '#000000'],
  lightX: 0.89,
  lightY: 0.46,
  lightCore: 0.14,
  lightHalo: 0.2,
  vignette: 0.38,
  lightFollow: 0.63,
  bloomThreshold: 0.61,
  bloomRange: 0.18,
  bloomStrength: 0.4
}

const GRID_PARAMS = {
  lineColor: 'rgba(255, 255, 255,',
  dotColor: 'rgba(255, 255, 255,',
  lineOpacity: 0.08,
  dotOpacity: 0.16
}

const VERT = `#version 300 es
in vec4 a_position;
out vec2 vUv;
void main() {
  vUv = a_position.xy * 0.5 + 0.5;
  gl_Position = a_position;
}
`

// 鼠标拖尾 flowmap 模拟（ping-pong），与原站一致
const SIM_FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform sampler2D u_prev;
uniform vec2 u_mouse;
uniform vec2 u_velocity;
uniform float u_brushRadius;
uniform float u_brushStrength;
uniform float u_decay;
out vec4 fragColor;

void main() {
  vec4 prev = texture(u_prev, vUv);

  prev.r *= u_decay;
  prev.gb = mix(vec2(0.5), prev.gb, u_decay);

  float dist = distance(vUv, u_mouse);

  float influence = exp(-dist * dist / (u_brushRadius * u_brushRadius * 0.5));
  influence = max(0.0, influence - 0.01);

  float speed = length(u_velocity);
  float presenceStrength = u_brushStrength * 0.3;
  float velBonus = min(speed * 3.0, 0.7) * u_brushStrength;
  float totalStrength = presenceStrength + velBonus;

  prev.r = max(prev.r, influence * totalStrength);
  float blendAmt = influence * min(totalStrength, 0.4) * 0.3;
  prev.g = mix(prev.g, clamp(u_velocity.x * 2.0 + 0.5, 0.0, 1.0), blendAmt);
  prev.b = mix(prev.b, clamp(u_velocity.y * 2.0 + 0.5, 0.0, 1.0), blendAmt);

  fragColor = prev;
}
`

// 流体主着色器，与原站一字不差
const FLUID_FRAG = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_c1, u_c2, u_c3, u_c4, u_c5;
uniform float u_scale;
uniform vec2 u_offset;
uniform float u_grain;
uniform float u_speed;
uniform sampler2D u_flowmap;
uniform float u_distortBoost;
uniform float u_swirlBoost;
uniform float u_glowIntensity;
uniform vec3 u_glowColor1;
uniform vec3 u_glowColor2;
uniform vec3 u_glowColor3;
uniform vec2 u_lightPos;
uniform float u_lightCore;
uniform float u_lightHalo;
uniform float u_vignette;
uniform float u_bloomThreshold;
uniform float u_bloomRange;
uniform float u_bloomStrength;
out vec4 fragColor;

vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289v4(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float hash(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}

float fbm(vec3 p){
  float v=0.,amp=.6;vec3 shift=vec3(100.);
  for(int i=0;i<1;i++){v+=amp*snoise(p);p=p*2.+shift;amp*=.4;}
  return v;
}

float fluidNoise(vec2 uv,float t){
  float n1=fbm(vec3(uv*.6,t*.06));
  float n2=fbm(vec3(uv*.6+5.2,t*.06+1.3));
  vec2 w1=vec2(n1,n2)*.6;
  float n3=fbm(vec3((uv+w1)*.7+1.7,t*.05+3.1));
  float n4=fbm(vec3((uv+w1)*.7+9.2,t*.05+5.7));
  vec2 w2=vec2(n3,n4)*.5;
  return fbm(vec3((uv+w1+w2)*.5,t*.04));
}

vec2 curlish(vec2 uv,float t){
  float eps=.02;
  float n=snoise(vec3(uv*.8,t));
  float nx=snoise(vec3((uv+vec2(eps,0.))*.8,t));
  float ny=snoise(vec3((uv+vec2(0.,eps))*.8,t));
  return vec2(-(ny-n)/eps,(nx-n)/eps)*.003;
}

void main(){
  float aspect=u_resolution.x/u_resolution.y;
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 suv=vec2(uv.x*aspect, uv.y) * u_scale + u_offset;
  float t=u_time;

  // Mouse interaction via flowmap
  vec4 flow = texture(u_flowmap, uv);
  float influence = flow.r;
  vec2 flowDir = (flow.gb - 0.5) * 2.0;

  // Apply mouse distortion to UV
  suv += flowDir * influence * u_distortBoost * 0.8;
  // Apply mouse swirl
  float swirlAngle = influence * u_swirlBoost * 2.5;
  float cs = cos(swirlAngle), sn = sin(swirlAngle);
  vec2 delta = suv - vec2(uv.x * aspect, uv.y) * u_scale;
  suv += (mat2(cs, sn, -sn, cs) * delta - delta) * influence;

  vec2 curl=curlish(suv,t*.04);
  vec2 uvD=suv+curl*12.;
  float f=fluidNoise(uvD,t);
  float swirl=snoise(vec3(uvD*.8+f*1.5,t*.035))*.5+.5;
  float n=f*.5+.5;
  vec3 col=mix(u_c1,u_c2,smoothstep(.2,.5,n));
  col=mix(col,u_c3,smoothstep(.35,.65,n+swirl*.25));
  col=mix(col,u_c4,smoothstep(.6,.85,swirl)*.55);
  col=mix(col,u_c5,smoothstep(.5,.8,n*swirl)*.35);

  // Mouse proximity color shift: 3-color glow blended by distance + noise
  float glow = smoothstep(0.0, 0.8, influence);
  float glowNoise = snoise(vec3(uvD * 1.5, t * 0.08)) * 0.5 + 0.5;
  float glowDist = smoothstep(0.0, 1.0, influence);
  vec3 glowMix = mix(u_glowColor3, u_glowColor2, glowDist);
  glowMix = mix(glowMix, u_glowColor1, glowDist * glowNoise);
  col = mix(col, glowMix, glow * u_glowIntensity);

  if(u_grain>0.0){
    vec2 flowOffset = (uvD - suv) * u_resolution.y;
    vec2 gp = floor((gl_FragCoord.xy + flowOffset) / 5.0);
    float gr=hash(gp)*2.-1.;
    col+=gr*u_grain;
  }

  // Self-luminance bloom: bright fluid regions become their own light spots,
  // so glow follows the flow and mouse disturbance instead of a fixed point
  float luma=dot(col,vec3(.299,.587,.114));
  float bloom=smoothstep(u_bloomThreshold-u_bloomRange,u_bloomThreshold+u_bloomRange,luma);
  col+=(col*.85+vec3(.15,.145,.13))*bloom*u_bloomStrength;

  // Virtual light source: soft warm core (same side as helm lighting)
  float ld=length((uv-u_lightPos)*vec2(aspect,1.));
  float core=exp(-ld*ld*4.5);
  float halo=exp(-ld*1.8);
  col+=vec3(1.,.97,.9)*core*u_lightCore+vec3(.72,.8,1.)*halo*u_lightHalo;

  float vig=1.-smoothstep(.35,.75,length(uv-.5));
  col=mix(col*(1.-u_vignette),col,vig);
  fragColor=vec4(col,1.);
}
`

function hexToRgb(hex) {
  const t = hex.replace('#', '')
  return [
    parseInt(t.slice(0, 2), 16) / 255,
    parseInt(t.slice(2, 4), 16) / 255,
    parseInt(t.slice(4, 6), 16) / 255
  ]
}

/**
 * WebGL 流体背景：flowmap ping-pong 模拟 + 流体渲染，均为原站逻辑
 */
function startFluid(canvas, w) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
    powerPreference: 'low-power'
  })
  if (!gl) return () => {}

  const compile = (type, src) => {
    const sh = gl.createShader(type)
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader:', gl.getShaderInfoLog(sh))
      return null
    }
    return sh
  }
  const link = (fragSrc) => {
    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc)
    if (!vs || !fs) return null
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link:', gl.getProgramInfoLog(prog))
      return null
    }
    return prog
  }

  const simProg = link(SIM_FRAG)
  const fluidProg = link(FLUID_FRAG)
  if (!simProg || !fluidProg) return () => {}

  const simU = {
    prev: gl.getUniformLocation(simProg, 'u_prev'),
    mouse: gl.getUniformLocation(simProg, 'u_mouse'),
    velocity: gl.getUniformLocation(simProg, 'u_velocity'),
    brushRadius: gl.getUniformLocation(simProg, 'u_brushRadius'),
    brushStrength: gl.getUniformLocation(simProg, 'u_brushStrength'),
    decay: gl.getUniformLocation(simProg, 'u_decay')
  }
  const fluU = {
    time: gl.getUniformLocation(fluidProg, 'u_time'),
    resolution: gl.getUniformLocation(fluidProg, 'u_resolution'),
    scale: gl.getUniformLocation(fluidProg, 'u_scale'),
    offset: gl.getUniformLocation(fluidProg, 'u_offset'),
    grain: gl.getUniformLocation(fluidProg, 'u_grain'),
    flowmap: gl.getUniformLocation(fluidProg, 'u_flowmap'),
    distortBoost: gl.getUniformLocation(fluidProg, 'u_distortBoost'),
    swirlBoost: gl.getUniformLocation(fluidProg, 'u_swirlBoost'),
    glowIntensity: gl.getUniformLocation(fluidProg, 'u_glowIntensity'),
    glowColor1: gl.getUniformLocation(fluidProg, 'u_glowColor1'),
    glowColor2: gl.getUniformLocation(fluidProg, 'u_glowColor2'),
    glowColor3: gl.getUniformLocation(fluidProg, 'u_glowColor3'),
    c1: gl.getUniformLocation(fluidProg, 'u_c1'),
    c2: gl.getUniformLocation(fluidProg, 'u_c2'),
    c3: gl.getUniformLocation(fluidProg, 'u_c3'),
    c4: gl.getUniformLocation(fluidProg, 'u_c4'),
    c5: gl.getUniformLocation(fluidProg, 'u_c5'),
    lightPos: gl.getUniformLocation(fluidProg, 'u_lightPos'),
    lightCore: gl.getUniformLocation(fluidProg, 'u_lightCore'),
    lightHalo: gl.getUniformLocation(fluidProg, 'u_lightHalo'),
    vignette: gl.getUniformLocation(fluidProg, 'u_vignette'),
    bloomThreshold: gl.getUniformLocation(fluidProg, 'u_bloomThreshold'),
    bloomRange: gl.getUniformLocation(fluidProg, 'u_bloomRange'),
    bloomStrength: gl.getUniformLocation(fluidProg, 'u_bloomStrength')
  }

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  )
  const bindQuad = (prog) => {
    const loc = gl.getAttribLocation(prog, 'a_position')
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  }
  const makeTarget = (tw, th, data) => {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, tw, th, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { fbo, tex }
  }

  const mouse = { x: 0.5, y: 0.5, smoothX: 0.5, smoothY: 0.5, svx: 0, svy: 0 }
  let visible = true
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches
  const isWindows = navigator.userAgentData
    ? navigator.userAgentData.platform === 'Windows'
    : navigator.userAgent.includes('Windows')
  const interactive = !isTouch && !isWindows

  // 布局可能尚未就绪（clientWidth 为 0），flowmap 纹理延迟到有尺寸后再分配
  let W = 0
  let H = 0
  let fw = 0
  let fh = 0
  let A = null
  let B = null
  let ping = false
  const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5)

  const allocFlow = () => {
    fw = Math.round(W / 4)
    fh = Math.round(H / 4)
    if (fw < 1 || fh < 1) {
      fw = 0
      fh = 0
      return false
    }
    const init = new Uint8Array(fw * fh * 4)
    for (let i = 0; i < fw * fh; i++) {
      init[4 * i] = 0
      init[4 * i + 1] = 128
      init[4 * i + 2] = 128
      init[4 * i + 3] = 255
    }
    A = makeTarget(fw, fh, init)
    B = makeTarget(fw, fh, init)
    ping = false
    return true
  }

  const onMove = (e) => {
    const r = canvas.getBoundingClientRect()
    mouse.x = (e.clientX - r.left) / r.width
    mouse.y = 1 - (e.clientY - r.top) / r.height
  }
  if (interactive) window.addEventListener('mousemove', onMove)

  const startTime = performance.now()
  let raf = 0
  let last = 0
  const FRAME = 1000 / 30
  const loop = (now) => {
    raf = requestAnimationFrame(loop)
    if (!visible || now - last < FRAME) return
    last = now - ((now - last) % FRAME)

    const d = dpr()
    const cw = Math.round(canvas.clientWidth * d)
    const ch = Math.round(canvas.clientHeight * d)
    if (cw !== W || ch !== H) {
      W = cw
      H = ch
      canvas.width = W
      canvas.height = H
    }
    if (!A && !allocFlow()) return

    mouse.smoothX += (mouse.x - mouse.smoothX) * w.mouseSmoothing
    mouse.smoothY += (mouse.y - mouse.smoothY) * w.mouseSmoothing
    mouse.svx += ((mouse.x - mouse.smoothX) * 0.5 - mouse.svx) * w.mouseVelocity
    mouse.svy += ((mouse.y - mouse.smoothY) * 0.5 - mouse.svy) * w.mouseVelocity

    // flowmap 模拟 pass（ping-pong）
    const read = ping ? A : B
    const write = ping ? B : A
    ping = !ping
    gl.bindFramebuffer(gl.FRAMEBUFFER, write.fbo)
    gl.viewport(0, 0, fw, fh)
    gl.useProgram(simProg)
    bindQuad(simProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, read.tex)
    gl.uniform1i(simU.prev, 0)
    gl.uniform2f(simU.mouse, mouse.smoothX, mouse.smoothY)
    gl.uniform2f(simU.velocity, mouse.svx, mouse.svy)
    gl.uniform1f(simU.brushRadius, w.mouseRadius)
    gl.uniform1f(simU.brushStrength, interactive ? w.mouseStrength : 0)
    gl.uniform1f(simU.decay, w.decay)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, W, H)

    // 流体渲染 pass
    const t = (performance.now() - startTime) * 0.001 * (w.speed / 100)
    gl.useProgram(fluidProg)
    bindQuad(fluidProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, write.tex)
    gl.uniform1i(fluU.flowmap, 0)
    gl.uniform1f(fluU.time, t)
    gl.uniform2f(fluU.resolution, W, H)
    gl.uniform1f(fluU.scale, w.scale)
    gl.uniform2f(fluU.offset, w.offsetX / 100, w.offsetY / 100)
    gl.uniform1f(fluU.grain, w.grain)
    gl.uniform1f(fluU.distortBoost, w.distortBoost)
    gl.uniform1f(fluU.swirlBoost, w.swirlBoost)

    const lightFollow = interactive ? w.lightFollow ?? 0 : 0
    gl.uniform2f(fluU.lightPos, w.lightX + (mouse.smoothX - w.lightX) * lightFollow, w.lightY)
    gl.uniform1f(fluU.lightCore, isTouch ? 0 : w.lightCore)
    gl.uniform1f(fluU.lightHalo, isTouch ? 0 : w.lightHalo)
    gl.uniform1f(fluU.vignette, w.vignette)
    gl.uniform1f(fluU.bloomThreshold, w.bloomThreshold)
    gl.uniform1f(fluU.bloomRange, w.bloomRange)
    gl.uniform1f(fluU.bloomStrength, w.bloomStrength)
    gl.uniform1f(fluU.glowIntensity, w.glowIntensity)
    const g1 = hexToRgb(w.glowColors[0] || '#ffffff')
    const g2 = hexToRgb(w.glowColors[1] || w.glowColors[0] || '#ffffff')
    const g3 = hexToRgb(w.glowColors[2] || w.glowColors[0] || '#ffffff')
    gl.uniform3f(fluU.glowColor1, g1[0], g1[1], g1[2])
    gl.uniform3f(fluU.glowColor2, g2[0], g2[1], g2[2])
    gl.uniform3f(fluU.glowColor3, g3[0], g3[1], g3[2])
    const cU = [fluU.c1, fluU.c2, fluU.c3, fluU.c4, fluU.c5]
    for (let i = 0; i < 5; i++) {
      const c = hexToRgb(w.colors[i] || w.colors[w.colors.length - 1] || '#000000')
      gl.uniform3f(cU[i], c[0], c[1], c[2])
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  raf = requestAnimationFrame(loop)

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting
    },
    { threshold: 0 }
  )
  io.observe(canvas)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('mousemove', onMove)
    io.disconnect()
  }
}

/**
 * 交互式点阵网格（90px 间距 / 140px 鼠标斥力 / 弹簧回归），与原站逻辑一致
 */
function startDotGrid(canvas, opts) {
  const {
    lineColor = 'rgba(60, 100, 160,',
    dotColor = 'rgba(60, 100, 160,',
    lineOpacity = 0.1,
    dotOpacity = 0.2,
    isStatic = false
  } = opts
  if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return () => {}
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let dots = []
  let cols = 0
  let rows = 0
  let w = 0
  let h = 0
  let sleeping = false
  let visible = true
  let raf = 0
  let resizeTimer = null
  const mouse = { x: NaN, y: NaN }

  const build = () => {
    cols = Math.ceil(w / 90) + 1
    rows = Math.ceil(h / 90) + 1
    const ox = (w - (cols - 1) * 90) / 2
    const oy = (h - (rows - 1) * 90) / 2
    dots = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + 90 * c
        const y = oy + 90 * r
        dots.push({ restX: x, restY: y, x, y, vx: 0, vy: 0 })
      }
    }
  }

  w = canvas.clientWidth
  h = canvas.clientHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  build()

  let last = 0
  const FRAME = 1000 / 30
  const loop = (now) => {
    if (!visible || now - last < FRAME) {
      raf = requestAnimationFrame(loop)
      return
    }
    last = now - ((now - last) % FRAME)

    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (cw !== w || ch !== h) {
      w = cw
      h = ch
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(build, 150)
    }

    ctx.clearRect(0, 0, w, h)
    const mx = mouse.x
    const my = mouse.y
    let maxMotion = 0
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      const dx = d.x - mx
      const dy = d.y - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 140 && dist > 0.1) {
        const f = (1 - dist / 140) * 30
        const nx = dx / dist
        const ny = dy / dist
        d.vx += nx * f * 0.1
        d.vy += ny * f * 0.1
      }
      d.vx += 0.05 * (d.restX - d.x)
      d.vy += 0.05 * (d.restY - d.y)
      d.vx *= 0.85
      d.vy *= 0.85
      d.x += d.vx
      d.y += d.vy
      const m = Math.abs(d.vx) + Math.abs(d.vy)
      if (m > maxMotion) maxMotion = m
    }

    // 横向连线（避开两端 10px 的点）
    ctx.strokeStyle = `${lineColor} ${lineOpacity})`
    ctx.lineWidth = 0.5
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = dots[r * cols + c]
        const b = dots[r * cols + c + 1]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 20) continue
        const ux = dx / len
        const uy = dy / len
        ctx.beginPath()
        ctx.moveTo(a.x + 10 * ux, a.y + 10 * uy)
        ctx.lineTo(b.x - 10 * ux, b.y - 10 * uy)
        ctx.stroke()
      }
    }
    // 纵向连线
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows - 1; r++) {
        const a = dots[r * cols + c]
        const b = dots[(r + 1) * cols + c]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 20) continue
        const ux = dx / len
        const uy = dy / len
        ctx.beginPath()
        ctx.moveTo(a.x + 10 * ux, a.y + 10 * uy)
        ctx.lineTo(b.x - 10 * ux, b.y - 10 * uy)
        ctx.stroke()
      }
    }

    // 点（鼠标附近放大提亮）
    ctx.fillStyle = `${dotColor} ${dotOpacity})`
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i]
      let size = 1.8
      let alpha = dotOpacity
      if (!isNaN(mx) && !isNaN(my)) {
        const dx = d.x - mx
        const dy = d.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        const prox = Math.max(0, 1 - dist / 140)
        size = 1.8 + 2 * prox
        alpha = dotOpacity + 0.4 * prox
      }
      ctx.globalAlpha = alpha
      const s = 2 * size
      ctx.fillRect(d.x - size, d.y - size, s, s)
    }
    ctx.globalAlpha = 1

    if (maxMotion < 0.01) sleeping = true
    else raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  const wake = () => {
    if (sleeping) {
      sleeping = false
      raf = requestAnimationFrame(loop)
    }
  }
  const onMove = (e) => {
    if (isStatic) return
    const r = canvas.getBoundingClientRect()
    mouse.x = e.clientX - r.left
    mouse.y = e.clientY - r.top
    wake()
  }
  if (!isStatic) window.addEventListener('mousemove', onMove)

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting
      if (entries[0].isIntersecting) wake()
    },
    { threshold: 0 }
  )
  io.observe(canvas)

  return () => {
    cancelAnimationFrame(raf)
    if (resizeTimer) clearTimeout(resizeTimer)
    window.removeEventListener('mousemove', onMove)
    io.disconnect()
  }
}

onMounted(() => {
  const el = wrap.value

  // 进场：模糊 20px -> 0（1.8s ease-out）；滚动时按进度重新模糊（原站行为）
  el.style.opacity = '0'
  el.style.filter = 'blur(20px)'
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 1.8s ease-out, filter 1.8s ease-out'
    el.style.opacity = '1'
    el.style.filter = 'blur(0px)'
  })
  const onScroll = () => {
    const rect = el.getBoundingClientRect()
    const h = el.offsetHeight || 1
    const p = Math.min(1, Math.max(0, -rect.top / (0.6 * h)))
    el.style.transition = 'none'
    el.style.filter = `blur(${20 * p}px)`
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  cleanups.push(() => window.removeEventListener('scroll', onScroll))
  cleanups.push(startFluid(glCanvas.value, PARAMS))
  cleanups.push(startDotGrid(gridCanvas.value, GRID_PARAMS))
})

onBeforeUnmount(() => {
  cleanups.forEach((fn) => fn && fn())
})
</script>

<style scoped>
.harness-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100svh;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(
    #000000fc 0%,
    #000000e8 8.98%,
    transparent 100%
  );
  mask-image: linear-gradient(#000000fc 0%, #000000e8 8.98%, transparent 100%);
}

.harness-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* 点阵网格仅桌面端显示（原站 hidden md:block） */
.harness-canvas--grid {
  display: none;
}

@media (min-width: 768px) {
  .harness-canvas--grid {
    display: block;
  }
}
</style>
