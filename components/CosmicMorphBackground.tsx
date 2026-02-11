"use client";

import React, { useEffect, useRef } from "react";

type Vec2 = { x: number; y: number };

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

function radiusTorus() {
  return 0.62;
}

function radiusFlower(t: number) {
  const base = 0.5;
  const amp = 0.18;
  const k = 9;
  return base + amp * Math.sin(k * t);
}

function polarToScreen(center: Vec2, r: number, theta: number, scale: number): Vec2 {
  return {
    x: center.x + Math.cos(theta) * r * scale,
    y: center.y + Math.sin(theta) * r * scale,
  };
}

export default function CosmicMorphBackground({
  intensity = 1,
  particleCount = 14000,
  enableMeteorPlanets = true,
  burstKey = 0,
  burstCenter = { x: 0.5, y: 0.5 },
}: {
  intensity?: number;
  particleCount?: number;
  enableMeteorPlanets?: boolean;
  burstKey?: number;
  burstCenter?: Vec2;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const burstKeyRef = useRef(burstKey);
  const burstCenterRef = useRef(burstCenter);

  useEffect(() => {
    burstKeyRef.current = burstKey;
  }, [burstKey]);

  useEffect(() => {
    burstCenterRef.current = burstCenter;
  }, [burstCenter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let hasDrawn = false;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    let W = 0;
    let H = 0;
    const mouse: Vec2 = { x: 0, y: 0 };
    const mouseSmoothed: Vec2 = { x: 0, y: 0 };
    let hasMouse = false;

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
    canvas.style.transition = "opacity 400ms ease";
    canvas.style.background = "transparent";

    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      hasMouse = true;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const N = particleCount;
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const seed = new Float32Array(N);

    const rand = (a = 1) => (Math.random() * 2 - 1) * a;
    for (let i = 0; i < N; i++) {
      px[i] = W * 0.5 + rand(W * 0.25);
      py[i] = H * 0.5 + rand(H * 0.25);
      vx[i] = rand(0.2);
      vy[i] = rand(0.2);
      seed[i] = Math.random();
    }

    let modeTarget = 0;
    let mode = 0;
    let lastSwitch = performance.now();
    const switchEveryMs = 5200;

    let burstSeen = burstKeyRef.current || 0;
    let burstStart = -1;
    let galaxyMode = false;
    const BURST_MS = 1400;

    const noise = (x: number, y: number, t: number) =>
      Math.sin(x * 0.008 + t * 0.0015) * 0.6 +
      Math.cos(y * 0.007 - t * 0.0012) * 0.4 +
      Math.sin((x + y) * 0.004 + t * 0.001) * 0.3;

    const PLANET_COUNT = 2400;
    const RING_COUNT = 1400;
    const planet = new Float32Array(PLANET_COUNT * 3);
    const ring = new Float32Array(RING_COUNT * 3);
    const planetSeed = new Float32Array(PLANET_COUNT);
    const ringSeed = new Float32Array(RING_COUNT);
    const planetSpawn = new Float32Array(PLANET_COUNT * 3);
    const ringSpawn = new Float32Array(RING_COUNT * 3);

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
      planetSpawn[i * 3 + 0] = (Math.random() - 0.5) * 1.1;
      planetSpawn[i * 3 + 1] = (Math.random() - 0.5) * 1.1;
      planetSpawn[i * 3 + 2] = (Math.random() - 0.5) * 1.1;
    }

    for (let i = 0; i < RING_COUNT; i++) {
      const t = Math.random() * Math.PI * 2;
      const r = 1.35 + Math.random() * 0.5;
      ring[i * 3 + 0] = Math.cos(t) * r;
      ring[i * 3 + 1] = (Math.random() - 0.5) * 0.16;
      ring[i * 3 + 2] = Math.sin(t) * r;
      ringSeed[i] = Math.random();
      ringSpawn[i * 3 + 0] = (Math.random() - 0.5) * 1.4;
      ringSpawn[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
      ringSpawn[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    }


    const draw = (time: number) => {
      const currentBurstKey = burstKeyRef.current || 0;
      if (currentBurstKey !== burstSeen) {
        burstSeen = currentBurstKey;
        burstStart = time;
        galaxyMode = false;

        const bc = burstCenterRef.current || { x: 0.5, y: 0.5 };
        const cx = clamp(bc.x, 0, 1) * W;
        const cy = clamp(bc.y, 0, 1) * H;

        // Re-inicializa as partículas no centro do "boom".
        for (let i = 0; i < N; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.pow(Math.random(), 0.35) * Math.min(W, H) * 0.04;
          px[i] = cx + Math.cos(a) * r;
          py[i] = cy + Math.sin(a) * r;
          const sp = (1.2 + Math.random() * 3.2) * (0.85 + 0.55 * intensity);
          vx[i] = Math.cos(a) * sp;
          vy[i] = Math.sin(a) * sp;
        }
      }

      const burstElapsed = burstStart >= 0 ? time - burstStart : 0;
      const inBurst = burstStart >= 0 && burstElapsed < BURST_MS;
      if (burstStart >= 0 && burstElapsed >= BURST_MS) {
        galaxyMode = true;
      }

      if (time - lastSwitch > switchEveryMs) {
        lastSwitch = time;
        modeTarget = modeTarget === 0 ? 1 : 0;
      }
      mode = lerp(mode, modeTarget, 0.02);

      const targetMouseX = hasMouse ? mouse.x : W * 0.5;
      const targetMouseY = hasMouse ? mouse.y : H * 0.5;
      mouseSmoothed.x = lerp(mouseSmoothed.x, targetMouseX, 0.08);
      mouseSmoothed.y = lerp(mouseSmoothed.y, targetMouseY, 0.08);

      if (inBurst || galaxyMode) {
        const bc = burstCenterRef.current || { x: 0.5, y: 0.5 };
        const cx = clamp(bc.x, 0, 1) * W;
        const cy = clamp(bc.y, 0, 1) * H;

        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = inBurst ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.07)";
        ctx.fillRect(0, 0, W, H);

        ctx.globalCompositeOperation = "lighter";

        const drag = inBurst ? 0.992 : 0.996;
        const swirl = (inBurst ? 0.0009 : 0.00028) * intensity;
        const inward = galaxyMode ? 0.00002 * intensity : 0;
        const jitter = inBurst ? 0.03 : 0.012;
        const fade = inBurst ? clamp(1 - burstElapsed / BURST_MS, 0, 1) : 1;

        for (let i = 0; i < N; i++) {
          const dx = px[i] - cx;
          const dy = py[i] - cy;
          const d = Math.hypot(dx, dy) + 1e-6;
          const ndx = dx / d;
          const ndy = dy / d;
          const pdx = -ndy;
          const pdy = ndx;

          // Campo de velocidade: vórtice + ruído + leve puxão pro centro (galáxia).
          const n = noise(px[i], py[i], time + seed[i] * 999);
          vx[i] += pdx * swirl * 220 + n * jitter;
          vy[i] += pdy * swirl * 220 - n * jitter;
          if (galaxyMode) {
            vx[i] -= ndx * inward * d;
            vy[i] -= ndy * inward * d;
          }

          vx[i] *= drag;
          vy[i] *= drag;

          px[i] += vx[i];
          py[i] += vy[i];

          // wrap suave
          if (px[i] < -40) px[i] = W + 40;
          else if (px[i] > W + 40) px[i] = -40;
          if (py[i] < -40) py[i] = H + 40;
          else if (py[i] > H + 40) py[i] = -40;

          const hot = smoothstep(
            0.15,
            1.0,
            Math.sin(seed[i] * 20 + time * 0.001) * 0.5 + 0.5
          );
          const a = (inBurst ? 0.14 : 0.07) * (0.35 + 0.65 * hot) * fade;
          const size = (inBurst ? 1.0 : 0.7) + 1.4 * hot;

          // Paleta "galaxy" (mais branco/rosa/roxo, sem bolhas azuladas grandes).
          ctx.fillStyle = `rgba(${lerp(190, 255, hot)}, ${lerp(
            120,
            80,
            hot
          )}, ${lerp(220, 255, hot)}, ${a})`;
          ctx.fillRect(px[i], py[i], size, size);
        }

        raf = requestAnimationFrame(draw);
        if (!hasDrawn) {
          hasDrawn = true;
          canvas.style.opacity = "1";
        }
        return;
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, W, H);

      const center: Vec2 = {
        x: lerp(W * 0.5, mouseSmoothed.x, 0.15),
        y: lerp(H * 0.5, mouseSmoothed.y, 0.15),
      };

      const scale = Math.min(W, H) * 0.46;
      const basePull = 0.02 * intensity;
      const swirl = 0.0026 * intensity;
      const drag = 0.985;

      ctx.globalCompositeOperation = "lighter";

      const t0 = Math.max(0, time - 200);

      // Timeline do meteoro + construção de planetas (opcional).
      // Algumas páginas usam esse canvas só como “fundo cósmico”, então dá pra desligar.
      const travel1 = 1900;
      const orbit1 = 1400;
      const travel2 = 1700;
      const orbit2 = 1400;
      const travel3 = 1700;
      const orbit3 = 1400;

      const startX = -W * 0.45;
      const startY = H * 0.18;
      const target1 = { x: W * 0.5, y: H * 0.72 };
      const target2 = { x: W * 0.78, y: H * 0.44 };
      const target3 = { x: W * 0.2, y: H * 0.78 };

      let meteorX = startX;
      let meteorY = startY;
      let dirX = target1.x - startX;
      let dirY = target1.y - startY;
      let build1 = 0;
      let build2 = 0;
      let build3 = 0;

      if (enableMeteorPlanets) {
        if (t0 < travel1) {
          const u = t0 / travel1;
          meteorX = lerp(startX, target1.x, u);
          meteorY = lerp(startY, target1.y, u);
        } else if (t0 < travel1 + orbit1) {
          const u = (t0 - travel1) / orbit1;
          const angle = u * Math.PI * 2;
          const radius = Math.min(W, H) * 0.085;
          meteorX = target1.x + Math.cos(angle) * radius;
          meteorY = target1.y + Math.sin(angle) * radius;
          dirX = -Math.sin(angle);
          dirY = Math.cos(angle);
          build1 = u;
        } else if (t0 < travel1 + orbit1 + travel2) {
          const u = (t0 - travel1 - orbit1) / travel2;
          meteorX = lerp(target1.x, target2.x, u);
          meteorY = lerp(target1.y, target2.y, u);
          dirX = target2.x - target1.x;
          dirY = target2.y - target1.y;
          build1 = 1;
        } else if (t0 < travel1 + orbit1 + travel2 + orbit2) {
          const u = (t0 - travel1 - orbit1 - travel2) / orbit2;
          const angle = u * Math.PI * 2;
          const radius = Math.min(W, H) * 0.075;
          meteorX = target2.x + Math.cos(angle) * radius;
          meteorY = target2.y + Math.sin(angle) * radius;
          dirX = -Math.sin(angle);
          dirY = Math.cos(angle);
          build1 = 1;
          build2 = u;
        } else if (t0 < travel1 + orbit1 + travel2 + orbit2 + travel3) {
          const u = (t0 - travel1 - orbit1 - travel2 - orbit2) / travel3;
          meteorX = lerp(target2.x, target3.x, u);
          meteorY = lerp(target2.y, target3.y, u);
          dirX = target3.x - target2.x;
          dirY = target3.y - target2.y;
          build1 = 1;
          build2 = 1;
        } else if (t0 < travel1 + orbit1 + travel2 + orbit2 + travel3 + orbit3) {
          const u =
            (t0 - travel1 - orbit1 - travel2 - orbit2 - travel3) / orbit3;
          const angle = u * Math.PI * 2;
          const radius = Math.min(W, H) * 0.08;
          meteorX = target3.x + Math.cos(angle) * radius;
          meteorY = target3.y + Math.sin(angle) * radius;
          dirX = -Math.sin(angle);
          dirY = Math.cos(angle);
          build1 = 1;
          build2 = 1;
          build3 = u;
        } else {
          const angle =
            (t0 - travel1 - orbit1 - travel2 - orbit2 - travel3 - orbit3) *
            0.002;
          const radius = Math.min(W, H) * 0.08;
          meteorX = target3.x + Math.cos(angle) * radius;
          meteorY = target3.y + Math.sin(angle) * radius;
          dirX = -Math.sin(angle);
          dirY = Math.cos(angle);
          build1 = 1;
          build2 = 1;
          build3 = 1;
        }
      }

      const dirLen = Math.hypot(dirX, dirY) || 1;
      const nx = dirX / dirLen;
      const ny = dirY / dirLen;
      const tailLen = Math.min(W, H) * 0.35;
      const meteorActive =
        enableMeteorPlanets &&
        t0 < travel1 + orbit1 + travel2 + orbit2 + travel3 + orbit3;

      for (let i = 0; i < N; i++) {
        if (meteorActive) {
          const t = seed[i];
          const tx = meteorX - nx * tailLen * t;
          const ty = meteorY - ny * tailLen * t;
          px[i] = lerp(px[i], tx, 0.35);
          py[i] = lerp(py[i], ty, 0.35);
          vx[i] *= 0.2;
          vy[i] *= 0.2;
        }
        const theta =
          seed[i] * Math.PI * 2 + Math.sin(time * 0.001 + seed[i] * 10) * 0.08;
        const r0 = radiusTorus();
        const r1 = radiusFlower(theta);
        const r = lerp(r0, r1, mode);

        const target = polarToScreen(center, r, theta, scale);

        let dx = target.x - px[i];
        let dy = target.y - py[i];
        const dist = Math.hypot(dx, dy) + 1e-6;
        dx /= dist;
        dy /= dist;

        const pull = basePull * (0.6 + 0.7 * smoothstep(0, 220, dist));
        const nx2 = -dy;
        const ny2 = dx;
        const n = noise(px[i], py[i], time);
        const n2 = noise(py[i], px[i], time + 999);

        vx[i] = (vx[i] + dx * pull + nx2 * swirl * n) * drag;
        vy[i] = (vy[i] + dy * pull + ny2 * swirl * n2) * drag;

        const mx = mouseSmoothed.x - px[i];
        const my = mouseSmoothed.y - py[i];
        const md = Math.hypot(mx, my) + 1e-6;
        const mouseForce = 0.00055 * intensity * (1 / (1 + md * 0.012));
        vx[i] += (mx / md) * mouseForce * 40;
        vy[i] += (my / md) * mouseForce * 40;

        px[i] += vx[i];
        py[i] += vy[i];

        if (px[i] < -200 || px[i] > W + 200 || py[i] < -200 || py[i] > H + 200) {
          px[i] = center.x + rand(scale * 0.9);
          py[i] = center.y + rand(scale * 0.9);
          vx[i] = rand(0.4);
          vy[i] = rand(0.4);
        }

        const hot = smoothstep(
          0.15,
          1.0,
          Math.sin(seed[i] * 20 + time * 0.001) * 0.5 + 0.5
        );
        const a = 0.07 + 0.1 * hot;
        const size = 0.7 + 1.2 * hot;

        ctx.fillStyle = `rgba(${lerp(140, 255, hot)}, ${lerp(
          170,
          80,
          hot
        )}, ${lerp(255, 120, hot)}, ${a})`;
        ctx.fillRect(px[i], py[i], size, size);
      }

      const drawPlanet = (
        centerX: number,
        centerY: number,
        builderX: number,
        builderY: number,
        progress: number
      ) => {
        if (progress <= 0) return;
        const planetScale = Math.min(W, H) * 0.13;
        const ringScale = Math.min(W, H) * 0.14;
        const t = time * 0.001;
        const build = Math.min(1.2, progress * 1.2);
        const rotY = t * 0.35;
        const rotX = Math.sin(t * 0.35) * 0.25;

        const project = (x: number, y: number, z: number, scaleVal: number) => {
          const cz = 3.0;
          const dz = cz + z;
          const s = scaleVal / dz;
          return { x: centerX + x * s, y: centerY + y * s, s };
        };

        for (let i = 0; i < PLANET_COUNT; i++) {
          const order = planetSeed[i];
          const local = clamp((build - order) / 0.2, 0, 1);
          const sx = builderX + planetSpawn[i * 3 + 0] * planetScale * 0.5;
          const sy = builderY + planetSpawn[i * 3 + 1] * planetScale * 0.5;
          const ix = planet[i * 3 + 0];
          const iy = planet[i * 3 + 1];
          const iz = planet[i * 3 + 2];
          const xz = ix * Math.cos(rotY) - iz * Math.sin(rotY);
          const zz = ix * Math.sin(rotY) + iz * Math.cos(rotY);
          const yz = iy * Math.cos(rotX) - zz * Math.sin(rotX);
          const zz2 = iy * Math.sin(rotX) + zz * Math.cos(rotX);
          const fp = project(xz, yz, zz2, planetScale);
          const p = {
            x: lerp(sx, fp.x, local),
            y: lerp(sy, fp.y, local),
            s: lerp(0.5, fp.s, local),
          };
          const heat = 1 - smoothstep(0.6, 1.0, local);
          const r = lerp(120, 255, heat);
          const g = lerp(170, 120, heat);
          const b = lerp(255, 200, heat);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.9})`;
          const sz = 1.1 + p.s * 0.02;
          ctx.fillRect(p.x, p.y, sz, sz);
        }

        for (let i = 0; i < RING_COUNT; i++) {
          const order = ringSeed[i];
          const local = clamp((build - order) / 0.2, 0, 1);
          const sx = builderX + ringSpawn[i * 3 + 0] * ringScale * 0.5;
          const sy = builderY + ringSpawn[i * 3 + 1] * ringScale * 0.5;
          const ix = ring[i * 3 + 0];
          const iy = ring[i * 3 + 1];
          const iz = ring[i * 3 + 2];
          const xz = ix * Math.cos(rotY * 0.9) - iz * Math.sin(rotY * 0.9);
          const zz = ix * Math.sin(rotY * 0.9) + iz * Math.cos(rotY * 0.9);
          const yz = iy * Math.cos(rotX * 0.6) - zz * Math.sin(rotX * 0.6);
          const zz2 = iy * Math.sin(rotX * 0.6) + zz * Math.cos(rotX * 0.6);
          const fp = project(xz, yz, zz2, ringScale);
          const p = {
            x: lerp(sx, fp.x, local),
            y: lerp(sy, fp.y, local),
            s: lerp(0.4, fp.s, local),
          };
          const heat = 1 - smoothstep(0.6, 1.0, local);
          ctx.fillStyle = `rgba(${lerp(255, 210, heat)}, ${lerp(
            140,
            120,
            heat
          )}, ${lerp(220, 200, heat)}, 0.75)`;
          const sz = 0.9 + p.s * 0.015;
          ctx.fillRect(p.x, p.y, sz, sz);
        }
      };

      const builder1X = build1 < 1 ? meteorX : target1.x;
      const builder1Y = build1 < 1 ? meteorY : target1.y;
      const builder2X = build2 < 1 ? meteorX : target2.x;
      const builder2Y = build2 < 1 ? meteorY : target2.y;
      const builder3X = build3 < 1 ? meteorX : target3.x;
      const builder3Y = build3 < 1 ? meteorY : target3.y;

      if (enableMeteorPlanets) {
        drawPlanet(target1.x, target1.y, builder1X, builder1Y, build1);
        drawPlanet(target2.x, target2.y, builder2X, builder2Y, build2);
        drawPlanet(target3.x, target3.y, builder3X, builder3Y, build3);
      }

      raf = requestAnimationFrame(draw);

      if (!hasDrawn) {
        hasDrawn = true;
        canvas.style.opacity = "1";
      }
    };

    mouseSmoothed.x = window.innerWidth * 0.5;
    mouseSmoothed.y = window.innerHeight * 0.5;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [intensity, particleCount, enableMeteorPlanets]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
