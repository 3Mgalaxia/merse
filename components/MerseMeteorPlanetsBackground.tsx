"use client";

import React, { useEffect, useRef } from "react";

type Vec2 = { x: number; y: number };

// =====================
// helpers matemáticos
// =====================
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
function fract(x: number) {
  return x - Math.floor(x);
}
function hypot(x: number, y: number) {
  return Math.hypot(x, y);
}
function pseudoNoise(x: number, y: number, t: number) {
  return (
    Math.sin(x * 0.008 + t * 0.0015) * 0.6 +
    Math.cos(y * 0.007 - t * 0.0012) * 0.4 +
    Math.sin((x + y) * 0.004 + t * 0.001) * 0.3
  );
}

// =====================
// Bezier (trajeto curvo)
// =====================
function cubicBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}
function cubicBezierTangent(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

// =====================
// Paleta Merse (roxo->azul->ciano->rosa)
// =====================
const MERSE_STOPS = [
  { t: 0.0, c: [168, 85, 247] },
  { t: 0.33, c: [59, 130, 246] },
  { t: 0.58, c: [34, 211, 238] },
  { t: 0.82, c: [236, 72, 153] },
  { t: 1.0, c: [168, 85, 247] },
] as const;

function merseColor(u01: number) {
  const t = clamp(u01, 0, 1);
  for (let i = 0; i < MERSE_STOPS.length - 1; i++) {
    const a = MERSE_STOPS[i];
    const b = MERSE_STOPS[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t + 1e-6);
      return {
        r: lerp(a.c[0], b.c[0], k),
        g: lerp(a.c[1], b.c[1], k),
        b: lerp(a.c[2], b.c[2], k),
      };
    }
  }
  const last = MERSE_STOPS[MERSE_STOPS.length - 1].c;
  return { r: last[0], g: last[1], b: last[2] };
}

// =====================
// Utils de “ponto” (sem bolha, sem círculo)
// =====================
function drawPixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  r: number,
  g: number,
  b: number,
  a: number
) {
  ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  ctx.fillRect(x, y, size, size);
}

// =====================
// Component
// =====================
export default function MerseMeteorPlanetsBackground({
  intensity = 1,
  trailCount = 18000, // se você quer “mais absurdo”, sobe pra 26000~32000
  zIndex = 0,
  startDelayMs = 700,
  renderBackdrop = true,
  onSequenceComplete,
}: {
  intensity?: number;
  trailCount?: number;
  zIndex?: number;
  startDelayMs?: number;
  renderBackdrop?: boolean;
  onSequenceComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let startTime = 0;
    let mountedAt = performance.now();
    let hasDrawn = false;
    let hasFiredComplete = false;

    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;

    const resize = () => {
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 450ms ease";
    canvas.style.background = "transparent";

    resize();
    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // ===== mouse (parallax sutil)
    const mouse = { x: W * 0.5, y: H * 0.5 };
    const mouseSm = { x: W * 0.5, y: H * 0.5 };
    let hasMouse = false;
    const onMove = (e: PointerEvent) => {
      hasMouse = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // ===== qualidade auto
    const area = Math.max(1, W * H);
    const baseArea = 1280 * 720;
    const areaK = clamp(Math.sqrt(area / baseArea), 0.62, 1.15);
    const quality = clamp(areaK * (reduceMotion ? 0.65 : 1) * (0.9 + 0.25 * intensity), 0.55, 1.15);

    // ============================================================
    // 1) FUNDO: estrelas + poeira sutil (sem bolha / sem gradientes)
    // ============================================================
    const STAR_COUNT = Math.floor(1400 * quality);
    const sx = new Float32Array(STAR_COUNT);
    const sy = new Float32Array(STAR_COUNT);
    const sb = new Float32Array(STAR_COUNT);
    const ss = new Float32Array(STAR_COUNT);
    const st = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      sx[i] = Math.random() * W;
      sy[i] = Math.random() * H;
      sb[i] = 0.25 + Math.random() * 0.75;
      ss[i] = Math.random() < 0.9 ? 1 : 2;
      st[i] = Math.random();
    }

    const AMBIENT_COUNT = Math.floor(2000 * quality);
    const ax = new Float32Array(AMBIENT_COUNT);
    const ay = new Float32Array(AMBIENT_COUNT);
    const avx = new Float32Array(AMBIENT_COUNT);
    const avy = new Float32Array(AMBIENT_COUNT);
    const aseed = new Float32Array(AMBIENT_COUNT);

    for (let i = 0; i < AMBIENT_COUNT; i++) {
      ax[i] = Math.random() * W;
      ay[i] = Math.random() * H;
      avx[i] = (Math.random() - 0.5) * 0.22;
      avy[i] = (Math.random() - 0.5) * 0.22;
      aseed[i] = Math.random();
    }

    // ============================================================
    // 2) METEORO: cauda volumétrica + cabeça (SEM glow em bolha)
    //    (halo feito por pontos, não radial-gradient)
    // ============================================================
    const METEOR_COUNT = Math.min(3200, Math.max(900, Math.floor(trailCount * 0.16 * quality)));
    const meteor = new Float32Array(METEOR_COUNT * 3);
    const meteorSeed = new Float32Array(METEOR_COUNT);

    for (let i = 0; i < METEOR_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);
      meteor[i * 3 + 0] = x;
      meteor[i * 3 + 1] = y;
      meteor[i * 3 + 2] = z;
      meteorSeed[i] = Math.random();
    }

    const TAIL_COUNT = Math.min(16000, Math.max(4200, Math.floor(trailCount * 0.78 * quality)));
    const tailU = new Float32Array(TAIL_COUNT);
    const tailA = new Float32Array(TAIL_COUNT);
    const tailS = new Float32Array(TAIL_COUNT);

    for (let i = 0; i < TAIL_COUNT; i++) {
      tailU[i] = Math.pow(Math.random(), 0.35);
      tailA[i] = Math.random() * Math.PI * 2;
      tailS[i] = Math.random();
    }

    // halo de pontos (substitui bolha/glow)
    const HALO_COUNT = Math.floor(1100 * quality);
    const hA = new Float32Array(HALO_COUNT);
    const hR = new Float32Array(HALO_COUNT);
    const hS = new Float32Array(HALO_COUNT);
    for (let i = 0; i < HALO_COUNT; i++) {
      hA[i] = Math.random() * Math.PI * 2;
      hR[i] = Math.pow(Math.random(), 0.55);
      hS[i] = Math.random();
    }

    // trilha do meteoro
    const TRAIL_SAMPLES = reduceMotion ? 180 : 280;
    const trailX = new Float32Array(TRAIL_SAMPLES);
    const trailY = new Float32Array(TRAIL_SAMPLES);
    let trailHead = 0;
    let trailInit = false;

    // ============================================================
    // 3) PLANETAS: só point cloud (SEM anel, SEM arco, SEM círculo)
    // ============================================================
    const PLANET_COUNT = Math.floor(5200 * quality); // mais denso e “surreal”
    const planet = new Float32Array(PLANET_COUNT * 3);
    const planetSeed = new Float32Array(PLANET_COUNT);
    const planetSpawn = new Float32Array(PLANET_COUNT * 3);

    for (let i = 0; i < PLANET_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);

      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.cos(phi);
      const z = Math.sin(phi) * Math.sin(theta);

      planet[i * 3 + 0] = x;
      planet[i * 3 + 1] = y;
      planet[i * 3 + 2] = z;

      planetSeed[i] = Math.random();

      planetSpawn[i * 3 + 0] = (Math.random() - 0.5) * 1.25;
      planetSpawn[i * 3 + 1] = (Math.random() - 0.5) * 1.25;
      planetSpawn[i * 3 + 2] = (Math.random() - 0.5) * 1.25;
    }

    // anel (pontos) — aproxima mais o planeta do index
    const RING_COUNT = Math.floor(3200 * quality);
    const ring = new Float32Array(RING_COUNT * 3);
    const ringSeed = new Float32Array(RING_COUNT);
    for (let i = 0; i < RING_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.25 + Math.random() * 0.55;
      ring[i * 3 + 0] = Math.cos(a) * r;
      ring[i * 3 + 1] = (Math.random() - 0.5) * 0.16;
      ring[i * 3 + 2] = Math.sin(a) * r;
      ringSeed[i] = Math.random();
    }

    // “streams” de energia (pontos) indo do meteoro pro planeta (SEM círculo)
    const STREAM_COUNT = Math.floor(900 * quality);
    const streamS = new Float32Array(STREAM_COUNT);
    const streamA = new Float32Array(STREAM_COUNT);
    const streamU = new Float32Array(STREAM_COUNT);
    for (let i = 0; i < STREAM_COUNT; i++) {
      streamS[i] = Math.random();
      streamA[i] = Math.random() * Math.PI * 2;
      streamU[i] = Math.random();
    }

    // ============================================================
    // 4) EXPLOSÃO FINAL: vira campo vivo (sem bolhas)
    // ============================================================
    const EXPLOSION_COUNT = Math.min(22000, Math.max(7000, Math.floor(trailCount * 1.05 * quality)));
    const ex = new Float32Array(EXPLOSION_COUNT);
    const ey = new Float32Array(EXPLOSION_COUNT);
    const evx = new Float32Array(EXPLOSION_COUNT);
    const evy = new Float32Array(EXPLOSION_COUNT);
    const eseed = new Float32Array(EXPLOSION_COUNT);

    for (let i = 0; i < EXPLOSION_COUNT; i++) eseed[i] = Math.random();

    let explosionStart = -1;
    let freezeAtTime = -1;
    const OUTWARD_MS = 2200;

    // ============================================================
    // Timeline / Targets (trajeto curvo)
    // ============================================================
    const travel1 = reduceMotion ? 1400 : 1700;
    const build1Ms = reduceMotion ? 1500 : 2000;
    const travel2 = reduceMotion ? 1200 : 1500;
    const build2Ms = reduceMotion ? 1400 : 1900;
    const travel3 = reduceMotion ? 1300 : 1600;
    const build3Ms = reduceMotion ? 1500 : 2000;

    const sequenceEnd = travel1 + build1Ms + travel2 + build2Ms + travel3 + build3Ms;

    const getTargets = (parX: number, parY: number) => {
      const start: Vec2 = { x: -W * 0.45, y: H * 0.18 };
      const t1: Vec2 = { x: W * 0.52 + parX * 1.0, y: H * 0.68 + parY * 1.0 };
      const t2: Vec2 = { x: W * 0.82 + parX * 1.15, y: H * 0.40 + parY * 1.15 };
      const t3: Vec2 = { x: W * 0.18 + parX * 0.95, y: H * 0.76 + parY * 0.95 };

      const minDim = Math.min(W, H);
      const k = minDim * 0.18;

      const s1p1 = { x: lerp(start.x, t1.x, 0.35), y: lerp(start.y, t1.y, 0.35) + k * 0.55 };
      const s1p2 = { x: lerp(start.x, t1.x, 0.70), y: lerp(start.y, t1.y, 0.70) + k * 0.25 };

      const s2p1 = { x: lerp(t1.x, t2.x, 0.35), y: lerp(t1.y, t2.y, 0.35) - k * 0.35 };
      const s2p2 = { x: lerp(t1.x, t2.x, 0.70), y: lerp(t1.y, t2.y, 0.70) - k * 0.18 };

      const s3p1 = { x: lerp(t2.x, t3.x, 0.35), y: lerp(t2.y, t3.y, 0.35) + k * 0.28 };
      const s3p2 = { x: lerp(t2.x, t3.x, 0.70), y: lerp(t2.y, t3.y, 0.70) + k * 0.45 };

      return {
        start,
        t1,
        t2,
        t3,
        seg1: { p0: start, p1: s1p1, p2: s1p2, p3: t1 },
        seg2: { p0: t1, p1: s2p1, p2: s2p2, p3: t2 },
        seg3: { p0: t2, p1: s3p1, p2: s3p2, p3: t3 },
      };
    };

    // =========================
    // desenho dos planetas (sem círculo / sem bolha)
    // =========================
    const drawPlanetConstruction = (
      centerX: number,
      centerY: number,
      sourceX: number,
      sourceY: number,
      progress: number,
      time: number,
      planetScale: number,
      tiltX: number,
      tiltY: number
    ) => {
      if (progress <= 0) return;

      const build = clamp(progress, 0, 1);
      const buildFill = clamp((build - 0.15) / 0.85, 0, 1);

      // freeze: planetas ficam “prontos”, mas ainda respiram em brilho
      const tf = (freezeAtTime > 0 ? freezeAtTime : time) * 0.001;
      const t = time * 0.001;

      // rotação 3D
      const tiltK = 0.25 + 0.75 * buildFill;
      const rotY = tf * 0.52 + tiltY * 0.9 * tiltK;
      const rotX = Math.sin(tf * 0.45) * 0.26 + tiltX * 0.65 * tiltK;

      const project = (x: number, y: number, z: number, scaleVal: number) => {
        const cz = 3.0;
        const dz = cz + z;
        const s = scaleVal / dz;
        return { x: centerX + x * s, y: centerY + y * s, s, z };
      };

      // energy streams (sem círculo): “linhas” feitas de pontos indo até o planeta
      ctx.globalCompositeOperation = "lighter";
      const streamLife = smoothstep(0.0, 0.85, build);
      const streamCount = Math.floor(STREAM_COUNT * (0.45 + 0.55 * (1 - build)));
      for (let i = 0; i < streamCount; i++) {
        const uu = streamU[i];
        const s = streamS[i];
        const ang = streamA[i] + t * (2.2 + 1.0 * intensity);

        // curva orgânica no stream
        const curv = (0.15 + 0.55 * uu) * planetScale * 0.22;
        const ox = Math.cos(ang) * curv;
        const oy = Math.sin(ang) * curv;

        const px = lerp(sourceX, centerX, uu) + ox * (1 - uu);
        const py = lerp(sourceY, centerY, uu) + oy * (1 - uu);

        const col = merseColor(fract(t * 0.22 + (1 - uu) * 0.65 + s * 0.33));
        const a = (0.02 + 0.06 * (1 - uu)) * streamLife;
        const size = 0.7 + 1.2 * (1 - uu);

        drawPixel(ctx, px, py, size, col.r, col.g, col.b, a);
      }

      // planeta: só point cloud
      for (let i = 0; i < PLANET_COUNT; i++) {
        const order = planetSeed[i];

        // “aparecer em sequência”
        const local = clamp((build - order) / 0.18, 0, 1);
        const appear = smoothstep(0, 1, local);

        const sx0 = sourceX + planetSpawn[i * 3 + 0] * planetScale * 0.62;
        const sy0 = sourceY + planetSpawn[i * 3 + 1] * planetScale * 0.62;

        const ix = planet[i * 3 + 0];
        const iy = planet[i * 3 + 1];
        const iz = planet[i * 3 + 2];

        // rotate in 3D
        const xz = ix * Math.cos(rotY) - iz * Math.sin(rotY);
        const zz = ix * Math.sin(rotY) + iz * Math.cos(rotY);
        const yz = iy * Math.cos(rotX) - zz * Math.sin(rotX);
        const zz2 = iy * Math.sin(rotX) + zz * Math.cos(rotX);

        const fp = project(xz, yz, zz2, planetScale);

        // “turbina” na chegada (continuidade do meteoro)
        const n = pseudoNoise(sx0, sy0, time + order * 999);
        const wobble = (1 - appear) * (0.6 + 0.4 * n) * planetScale * 0.025;

        const px2 = lerp(sx0, fp.x + wobble, appear);
        const py2 = lerp(sy0, fp.y - wobble, appear);

        // cor Merse por profundidade + tempo
        const depth = smoothstep(-1.2, 1.2, fp.z);
        const gradT = fract(order * 0.92 + tf * 0.10 + depth * 0.28 + Math.sin(t * 0.7) * 0.02);
        const col = merseColor(gradT);

        // brilho “vivo” sem bolha
        const tw = 0.62 + 0.38 * Math.sin(t * 1.25 + order * 10.0);
        const fillBoost = (0.55 + 0.45 * buildFill) * tw;

        const a = (0.10 + 0.26 * depth) * appear * fillBoost;
        const sz = 0.75 + fp.s * 0.024 + depth * 0.55;

        drawPixel(ctx, px2, py2, sz, col.r, col.g, col.b, a);
      }

      // anel de partículas (visual do planeta do index)
      if (buildFill > 0) {
        const ringReveal = smoothstep(0.15, 1.0, buildFill);
        const ringIntensity = (0.75 + 0.55 * intensity) * ringReveal;
        const ringRotY = rotY + tf * 0.18;
        const ringRotX = rotX + 0.15;

        for (let i = 0; i < RING_COUNT; i++) {
          const order = ringSeed[i];
          const local = clamp((build - order) / 0.22, 0, 1);
          const appear = smoothstep(0, 1, local) * ringReveal;
          if (appear <= 0) continue;

          const ix = ring[i * 3 + 0];
          const iy = ring[i * 3 + 1];
          const iz = ring[i * 3 + 2];

          const xz = ix * Math.cos(ringRotY) - iz * Math.sin(ringRotY);
          const zz = ix * Math.sin(ringRotY) + iz * Math.cos(ringRotY);
          const yz = iy * Math.cos(ringRotX) - zz * Math.sin(ringRotX);
          const zz2 = iy * Math.sin(ringRotX) + zz * Math.cos(ringRotX);

          const fp = project(xz, yz, zz2, planetScale);
          const depth = smoothstep(-1.2, 1.2, fp.z);
          const gradT = fract(order * 0.85 + tf * 0.12 + depth * 0.22 + Math.sin(t * 0.6) * 0.03);
          const col = merseColor(gradT);

          const tw = 0.6 + 0.4 * Math.sin(t * (1.1 + order) + order * 9.0);
          const a = (0.06 + 0.16 * depth) * appear * tw * ringIntensity;
          const sz = 0.55 + fp.s * 0.02 + depth * 0.35;

          drawPixel(ctx, fp.x, fp.y, sz, col.r, col.g, col.b, a);
        }
      }
    };

    // =========================
    // frame loop
    // =========================
    const draw = (time: number) => {
      // fase inicial: sem fundo / sem meteoro
      if (time - mountedAt < startDelayMs) {
        ctx.clearRect(0, 0, W, H);
        raf = requestAnimationFrame(draw);
        return;
      }

      if (startTime === 0) startTime = time;
      const tSinceStart = time - startTime;

      // mouse smoothing
      const targetMouseX = hasMouse ? mouse.x : W * 0.5;
      const targetMouseY = hasMouse ? mouse.y : H * 0.5;
      mouseSm.x = lerp(mouseSm.x, targetMouseX, 0.06);
      mouseSm.y = lerp(mouseSm.y, targetMouseY, 0.06);

      // limpa e pinta fundo (após a explosão, deixa o universo do index aparecer por baixo)
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      const bgAlpha = renderBackdrop
        ? explosionStart < 0
          ? 1
          : clamp(1 - (time - explosionStart) / (reduceMotion ? 420 : 650), 0, 1)
        : 0;
      if (bgAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${bgAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      const t = time * 0.001;

      const gx = W * 0.52;
      const gy = H * 0.48;

      if (renderBackdrop) {
        // stars (super sutis)
        for (let i = 0; i < STAR_COUNT; i++) {
          const tw = 0.55 + 0.45 * Math.sin(t * 1.2 + st[i] * 10.0);
          const a = 0.10 * sb[i] * (0.55 + 0.45 * tw);
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          ctx.fillRect(sx[i], sy[i], ss[i], ss[i]);
        }

        // ambient dust
        ctx.globalCompositeOperation = "lighter";

        for (let i = 0; i < AMBIENT_COUNT; i++) {
          const n = pseudoNoise(ax[i], ay[i], time + aseed[i] * 999);

          const dx = ax[i] - gx;
          const dy = ay[i] - gy;
          const d = Math.hypot(dx, dy) + 1e-6;
          const ndx = dx / d;
          const ndy = dy / d;

          const px = -ndy;
          const py = ndx;

          // swirl suave
          avx[i] += px * 0.004 * n;
          avy[i] += py * 0.004 * n;

          ax[i] += avx[i];
          ay[i] += avy[i];

          if (ax[i] < -30) ax[i] = W + 30;
          else if (ax[i] > W + 30) ax[i] = -30;
          if (ay[i] < -30) ay[i] = H + 30;
          else if (ay[i] > H + 30) ay[i] = -30;

          const tw = 0.55 + 0.45 * Math.sin(t * 0.85 + aseed[i] * 12);
          const col = merseColor(fract(t * 0.10 + aseed[i]));
          const a = (0.012 + 0.03 * tw) * (0.65 + 0.35 * intensity);
          drawPixel(ctx, ax[i], ay[i], 1.1, col.r, col.g, col.b, a);
        }
      } else {
        ctx.globalCompositeOperation = "lighter";
      }

      // targets e timeline
      const parX = (mouseSm.x - W * 0.5) * 0.11;
      const parY = (mouseSm.y - H * 0.5) * 0.11;
      const tiltY = ((mouseSm.x / Math.max(1, W)) - 0.5) * 1.25;
      const tiltX = ((mouseSm.y / Math.max(1, H)) - 0.5) * 0.95;

      const T = getTargets(parX, parY);
      const { start, t1, t2, t3, seg1, seg2, seg3 } = T;

      const t0 = Math.max(0, tSinceStart);

      let meteorX = start.x;
      let meteorY = start.y;
      let dirX = t1.x - start.x;
      let dirY = t1.y - start.y;

      let build1 = 0;
      let build2 = 0;
      let build3 = 0;

      // micro-órbita durante construção (não desenha círculo, só move o meteoro)
      const minDim = Math.min(W, H);
      const orbitR1 = minDim * 0.05;
      const orbitR2 = minDim * 0.045;
      const orbitR3 = minDim * 0.052;

      if (t0 < travel1) {
        const u = clamp(t0 / travel1, 0, 1);
        const p = cubicBezier(seg1.p0, seg1.p1, seg1.p2, seg1.p3, u);
        const tg = cubicBezierTangent(seg1.p0, seg1.p1, seg1.p2, seg1.p3, u);
        meteorX = p.x;
        meteorY = p.y;
        dirX = tg.x;
        dirY = tg.y;
      } else if (t0 < travel1 + build1Ms) {
        const u = clamp((t0 - travel1) / build1Ms, 0, 1);
        const ang = u * Math.PI * 2 * (1.02 + 0.08 * intensity) + t * 1.1;
        meteorX = t1.x + Math.cos(ang) * orbitR1;
        meteorY = t1.y + Math.sin(ang) * orbitR1;
        dirX = -Math.sin(ang);
        dirY = Math.cos(ang);
        build1 = u;
      } else if (t0 < travel1 + build1Ms + travel2) {
        const u = clamp((t0 - travel1 - build1Ms) / travel2, 0, 1);
        const p = cubicBezier(seg2.p0, seg2.p1, seg2.p2, seg2.p3, u);
        const tg = cubicBezierTangent(seg2.p0, seg2.p1, seg2.p2, seg2.p3, u);
        meteorX = p.x;
        meteorY = p.y;
        dirX = tg.x;
        dirY = tg.y;
        build1 = 1;
      } else if (t0 < travel1 + build1Ms + travel2 + build2Ms) {
        const u = clamp((t0 - travel1 - build1Ms - travel2) / build2Ms, 0, 1);
        const ang = u * Math.PI * 2 * (1.02 + 0.08 * intensity) + t * 1.05;
        meteorX = t2.x + Math.cos(ang) * orbitR2;
        meteorY = t2.y + Math.sin(ang) * orbitR2;
        dirX = -Math.sin(ang);
        dirY = Math.cos(ang);
        build1 = 1;
        build2 = u;
      } else if (t0 < travel1 + build1Ms + travel2 + build2Ms + travel3) {
        const u = clamp((t0 - travel1 - build1Ms - travel2 - build2Ms) / travel3, 0, 1);
        const p = cubicBezier(seg3.p0, seg3.p1, seg3.p2, seg3.p3, u);
        const tg = cubicBezierTangent(seg3.p0, seg3.p1, seg3.p2, seg3.p3, u);
        meteorX = p.x;
        meteorY = p.y;
        dirX = tg.x;
        dirY = tg.y;
        build1 = 1;
        build2 = 1;
      } else if (t0 < travel1 + build1Ms + travel2 + build2Ms + travel3 + build3Ms) {
        const u = clamp((t0 - travel1 - build1Ms - travel2 - build2Ms - travel3) / build3Ms, 0, 1);
        const ang = u * Math.PI * 2 * (1.02 + 0.08 * intensity) + t * 1.0;
        meteorX = t3.x + Math.cos(ang) * orbitR3;
        meteorY = t3.y + Math.sin(ang) * orbitR3;
        dirX = -Math.sin(ang);
        dirY = Math.cos(ang);
        build1 = 1;
        build2 = 1;
        build3 = u;
      } else {
        meteorX = t3.x;
        meteorY = t3.y;
        dirX = 1;
        dirY = 0;
        build1 = 1;
        build2 = 1;
        build3 = 1;
      }

      // evento final
      if (!hasFiredComplete && t0 >= sequenceEnd) {
        hasFiredComplete = true;
        onSequenceComplete?.();
      }

      // explosão inicia
      if (t0 >= sequenceEnd && explosionStart < 0) {
        explosionStart = time;

        const cx = meteorX;
        const cy = meteorY;

        for (let i = 0; i < EXPLOSION_COUNT; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.pow(Math.random(), 0.55) * Math.min(W, H) * 0.012;
          ex[i] = cx + Math.cos(a) * r;
          ey[i] = cy + Math.sin(a) * r;

          const sp =
            (12 + Math.random() * 34) *
            (0.85 + 0.55 * intensity) *
            (0.75 + eseed[i] * 0.55);
          evx[i] = Math.cos(a) * sp;
          evy[i] = Math.sin(a) * sp;
        }
      }

      // freeze planetas
      if (t0 >= sequenceEnd && freezeAtTime < 0) {
        freezeAtTime = time;
      }

      // trilha meteoro
      if (!trailInit) {
        for (let i = 0; i < TRAIL_SAMPLES; i++) {
          trailX[i] = meteorX;
          trailY[i] = meteorY;
        }
        trailHead = 0;
        trailInit = true;
      } else {
        trailHead = (trailHead + 1) % TRAIL_SAMPLES;
        trailX[trailHead] = meteorX;
        trailY[trailHead] = meteorY;
      }

      const sampleTrail = (u01: number) => {
        const u = clamp(u01, 0, 1);
        const d = Math.pow(u, 0.72) * (TRAIL_SAMPLES - 1);
        const i0 = Math.floor(d);
        const f = d - i0;

        const idx0 = (trailHead - i0 + TRAIL_SAMPLES) % TRAIL_SAMPLES;
        const idx1 = (trailHead - (i0 + 1) + TRAIL_SAMPLES) % TRAIL_SAMPLES;
        const idx2 = (trailHead - (i0 + 2) + TRAIL_SAMPLES) % TRAIL_SAMPLES;

        const x0 = trailX[idx0];
        const y0 = trailY[idx0];
        const x1 = trailX[idx1];
        const y1 = trailY[idx1];
        const x2 = trailX[idx2];
        const y2 = trailY[idx2];

        const x = lerp(x0, x1, f);
        const y = lerp(y0, y1, f);

        const dx = x0 - x2;
        const dy = y0 - y2;
        const l = Math.hypot(dx, dy) || 1;
        return { x, y, tx: dx / l, ty: dy / l };
      };

      // direção normalizada
      const dLen = hypot(dirX, dirY) || 1;
      const nx = dirX / dLen;
      const ny = dirY / dLen;

      const drawMeteor = t0 < sequenceEnd;

      // =========================
      // METEORO (pontos)
      // =========================
      ctx.globalCompositeOperation = "lighter";

      const meteorScale = minDim * (0.032 + 0.01 * intensity) * (reduceMotion ? 0.9 : 1);
      const headLen = meteorScale * 4.4;
      const headWidth = meteorScale * 0.58;
      const tailWidth = minDim * (0.008 + 0.005 * intensity) * (reduceMotion ? 0.85 : 1);

      if (drawMeteor) {
        // velocidade aproximada pra dimensionar o rastro
        const prev2 = (trailHead - 2 + TRAIL_SAMPLES) % TRAIL_SAMPLES;
        const headSpeed = hypot(trailX[trailHead] - trailX[prev2], trailY[trailHead] - trailY[prev2]);
        const speedK = clamp(headSpeed / 16, 0.75, 1.65);

        // rastro "core" (streak): dá leitura imediata de meteoro
        const CORE_SAMPLES = reduceMotion ? 90 : 160;
        const coreLen = meteorScale * (18 + 12 * intensity) * speedK;
        for (let i = 0; i < CORE_SAMPLES; i++) {
          const u = i / Math.max(1, CORE_SAMPLES - 1); // 0 cabeça -> 1 fim
          const back = u * coreLen;
          const hot = Math.pow(1 - u, 1.25);
          const jitter = (pseudoNoise(meteorX, meteorY, time + i * 31.7) - 0.2) * 0.9;
          const wob = meteorScale * 0.22 * (0.2 + 0.8 * hot);

          const px2 = meteorX - nx * back + (-ny * jitter) * wob;
          const py2 = meteorY - ny * back + (nx * jitter) * wob;

          const base = merseColor(fract(t * 0.06 + u * 0.45));
          const whiteMix = 0.55 * hot;
          const col = {
            r: lerp(base.r, 255, whiteMix),
            g: lerp(base.g, 255, whiteMix),
            b: lerp(base.b, 255, whiteMix),
          };

          const a = (0.04 + 0.22 * hot) * (0.75 + 0.35 * intensity);
          const size = (0.9 + 4.8 * hot) * (0.9 + 0.2 * intensity);
          drawPixel(ctx, px2, py2, size, col.r, col.g, col.b, a);
        }

        // halo por pontos (sem bolha)
        const haloR = meteorScale * (1.8 + 0.7 * intensity);
        for (let i = 0; i < HALO_COUNT; i++) {
          const rr = haloR * hR[i];
          const hot = 1 - hR[i];
          const a = (0.01 + 0.05 * hot) * (0.65 + 0.35 * intensity);
          const x = meteorX + Math.cos(hA[i]) * rr - nx * meteorScale * 0.25;
          const y = meteorY + Math.sin(hA[i]) * rr - ny * meteorScale * 0.25;
          const base = merseColor(fract(t * 0.12 + hS[i] * 0.75));
          const whiteMix = 0.35 * hot;
          const col = {
            r: lerp(base.r, 255, whiteMix),
            g: lerp(base.g, 255, whiteMix),
            b: lerp(base.b, 255, whiteMix),
          };
          const size = 0.6 + 1.3 * hot;
          drawPixel(ctx, x, y, size, col.r, col.g, col.b, a);
        }

        // cauda volumétrica
        for (let i = 0; i < TAIL_COUNT; i++) {
          const u = tailU[i]; // 0 cabeça -> 1 fim
          const s = sampleTrail(u);
          const tx = s.tx;
          const ty = s.ty;
          const ptx = -ty;
          const pty = tx;

          const spin = tailA[i] + t * (3.6 + 1.2 * intensity) + u * 7.0 + tailS[i] * 6.0;
          const n = pseudoNoise(s.x, s.y, time + tailS[i] * 999);
          const radius = tailWidth * (0.15 + 1.35 * u) * (0.6 + 0.4 * n);

          const ox = (ptx * Math.cos(spin) + pty * Math.sin(spin)) * radius;
          const oy = (pty * Math.cos(spin) - ptx * Math.sin(spin)) * radius;

          const px2 = s.x + ox;
          const py2 = s.y + oy;

          const headBoost = Math.pow(1 - u, 1.35);
          const gradT = fract(t * 0.12 + (1 - u) * 0.45 + tailS[i] * 0.25);
          const base = merseColor(gradT);
          const whiteMix = 0.35 * headBoost;
          const col = {
            r: lerp(base.r, 255, whiteMix),
            g: lerp(base.g, 255, whiteMix),
            b: lerp(base.b, 255, whiteMix),
          };

          const a = (0.012 + 0.18 * headBoost) * (0.65 + 0.35 * intensity);
          const size = (0.5 + 1.9 * headBoost) * (0.9 + 0.25 * intensity);

          drawPixel(ctx, px2, py2, size, col.r, col.g, col.b, a);
        }

        // cabeça cone
        const perpX = -ny;
        const perpY = nx;

        for (let i = 0; i < METEOR_COUNT; i++) {
          const ix0 = meteor[i * 3 + 0];
          const iy0 = meteor[i * 3 + 1];
          const iz0 = meteor[i * 3 + 2];

          const along = clamp((iz0 + 1) * 0.5, 0, 1);
          const back = headLen * Math.pow(along, 1.55);
          const radiusK = Math.pow(1 - along, 0.75);

          const spin = t * (4.9 + 1.4 * intensity) + meteorSeed[i] * 9.0;
          const cs = Math.cos(spin);
          const sn = Math.sin(spin);
          const rx = ix0 * cs - iy0 * sn;
          const ry = ix0 * sn + iy0 * cs;

          const ox = (perpX * rx - nx * ry) * headWidth * radiusK;
          const oy = (perpY * rx - ny * ry) * headWidth * radiusK;

          const px2 = meteorX - nx * back + ox;
          const py2 = meteorY - ny * back + oy;

          const tipBoost = Math.pow(1 - along, 1.6);
          const gradT = fract(meteorSeed[i] * 0.55 + t * 0.12 + tipBoost * 0.2);
          const base = merseColor(gradT);
          const whiteMix = 0.65 * tipBoost;
          const col = {
            r: lerp(base.r, 255, whiteMix),
            g: lerp(base.g, 255, whiteMix),
            b: lerp(base.b, 255, whiteMix),
          };

          const a = (0.035 + 0.22 * tipBoost) * (0.85 + 0.25 * intensity);
          const sz = (0.55 + 2.2 * tipBoost) * (0.95 + 0.25 * intensity);

          drawPixel(ctx, px2, py2, sz, col.r, col.g, col.b, a);
        }
      }

      // =========================
      // EXPLOSÃO (campo vivo)
      // =========================
      if (!drawMeteor && explosionStart >= 0) {
        const eT = time - explosionStart;
        const drag = 0.995;
        const swirl = 0.00026 * intensity;

        const cx = t3.x;
        const cy = t3.y;

        for (let i = 0; i < EXPLOSION_COUNT; i++) {
          const n = pseudoNoise(ex[i], ey[i], time + eseed[i] * 999);

          const dx = ex[i] - cx;
          const dy = ey[i] - cy;
          const d = Math.hypot(dx, dy) + 1e-6;
          const ndx = dx / d;
          const ndy = dy / d;

          const outwardBoost = clamp(1 - eT / OUTWARD_MS, 0, 1);
          evx[i] += ndx * outwardBoost * (0.9 + 1.8 * eseed[i]);
          evy[i] += ndy * outwardBoost * (0.9 + 1.8 * eseed[i]);

          const gdx = ex[i] - gx;
          const gdy = ey[i] - gy;
          const gd = Math.hypot(gdx, gdy) + 1e-6;
          const gndx = gdx / gd;
          const gndy = gdy / gd;
          const gpx = -gndy;
          const gpy = gndx;

          const swirlK = 0.35 + 0.65 * (1 - clamp(gd / (Math.min(W, H) * 0.65), 0, 1));
          evx[i] += gpx * swirl * 260 * swirlK + n * 0.10;
          evy[i] += gpy * swirl * 260 * swirlK - n * 0.10;

          evx[i] *= drag;
          evy[i] *= drag;
          ex[i] += evx[i];
          ey[i] += evy[i];

          if (ex[i] < -60) ex[i] = W + 60;
          else if (ex[i] > W + 60) ex[i] = -60;
          if (ey[i] < -60) ey[i] = H + 60;
          else if (ey[i] > H + 60) ey[i] = -60;

          const tw = 0.55 + 0.45 * Math.sin(t * 1.15 + eseed[i] * 12);
          const base = merseColor(fract(eseed[i] * 0.9 + t * 0.06));
          const a = (0.03 + 0.10 * tw) * (0.75 + 0.35 * intensity);
          const size = 0.6 + 1.35 * tw;

          drawPixel(ctx, ex[i], ey[i], size, base.r, base.g, base.b, a);
        }
      }

      // =========================
      // PLANETAS (sem ring / sem círculo)
      // =========================
      const planetScale = Math.min(W, H) * 0.18;

      const srcOffset = planetScale * 0.55;
      const source1X = build1 < 1 ? meteorX - nx * srcOffset : t1.x;
      const source1Y = build1 < 1 ? meteorY - ny * srcOffset : t1.y;
      const source2X = build2 < 1 ? meteorX - nx * srcOffset : t2.x;
      const source2Y = build2 < 1 ? meteorY - ny * srcOffset : t2.y;
      const source3X = build3 < 1 ? meteorX - nx * srcOffset : t3.x;
      const source3Y = build3 < 1 ? meteorY - ny * srcOffset : t3.y;

      drawPlanetConstruction(t1.x, t1.y, source1X, source1Y, build1, time, planetScale * 1.25, tiltX, tiltY);
      drawPlanetConstruction(t2.x, t2.y, source2X, source2Y, build2, time, planetScale * 1.0, tiltX, tiltY);
      drawPlanetConstruction(t3.x, t3.y, source3X, source3Y, build3, time, planetScale * 1.22, tiltX, tiltY);

      raf = requestAnimationFrame(draw);

      if (!hasDrawn) {
        hasDrawn = true;
        canvas.style.opacity = "1";
      }
    };

    // init
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, [intensity, trailCount, startDelayMs, renderBackdrop, onSequenceComplete]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex,
        pointerEvents: "none",
      }}
    />
  );
}
