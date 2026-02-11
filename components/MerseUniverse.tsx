"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";

type UniverseProps = {
  intensity?: number;
  galaxyOpacity?: number;
  galaxyDarkness?: number;
  showPlanet?: boolean;
  children?: ReactNode;
};

const universePointer = { x: 0, y: 0 };
const universeImpact = { strength: 0, x: 0.5, y: 0.5 };

function triggerUniverseImpact(clientX: number, clientY: number) {
  universeImpact.strength = 1;
  universeImpact.x = THREE.MathUtils.clamp(clientX / Math.max(1, window.innerWidth), 0, 1);
  universeImpact.y = THREE.MathUtils.clamp(1 - clientY / Math.max(1, window.innerHeight), 0, 1);
}

export default function MerseUniverse({
  intensity = 1,
  galaxyOpacity = 1,
  galaxyDarkness = 0,
  showPlanet = true,
  children,
}: UniverseProps) {
  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100vh" }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 9], fov: 55, near: 0.1, far: 200 }}
        raycaster={{ params: { Points: { threshold: 0.25 } } as any }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
        style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 0 }}
      >
        <Scene
          intensity={intensity}
          galaxyOpacity={galaxyOpacity}
          galaxyDarkness={galaxyDarkness}
          showPlanet={showPlanet}
        />
      </Canvas>
      <div
        style={{
          position: "relative",
          pointerEvents: "auto",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div style={{ width: "min(1100px, 92vw)" }}>{children}</div>
      </div>
    </div>
  );
}

function Scene({
  intensity,
  galaxyOpacity,
  galaxyDarkness,
  showPlanet,
}: {
  intensity: number;
  galaxyOpacity: number;
  galaxyDarkness: number;
  showPlanet: boolean;
}) {
  const { gl } = useThree();
  useEffect(() => {
    gl.setClearColor(new THREE.Color("#000000"), 0);
    gl.setClearAlpha(0);
  }, [gl]);

  return (
    <>
      <ambientLight intensity={0.35 * intensity} />
      <directionalLight position={[6, 6, 6]} intensity={0.7 * intensity} />
      <PointerAndScrollController intensity={intensity} />
      <GalaxyField intensity={intensity} opacity={galaxyOpacity} darkness={galaxyDarkness} />
      <GalaxyRingField intensity={intensity} opacity={galaxyOpacity} darkness={galaxyDarkness} />
      {showPlanet ? <ParticlePlanet3D intensity={intensity} /> : null}
    </>
  );
}

function PointerAndScrollController({ intensity }: { intensity: number }) {
  const { camera } = useThree();
  const scrollY = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      universePointer.x = x;
      universePointer.y = y;
    };
    const onScroll = () => {
      scrollY.current = window.scrollY || 0;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useFrame(() => {
    universeImpact.strength *= 0.92;
    const targetX = universePointer.x * 0.65 * intensity;
    const targetY = universePointer.y * 0.35 * intensity;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (-targetY - camera.position.y) * 0.05;
    const zBase = 9;
    const zScroll = THREE.MathUtils.clamp(scrollY.current / 1200, 0, 3.5);
    const zTarget = zBase - zScroll * 0.75 * intensity;
    camera.position.z += (zTarget - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function GalaxyField({
  intensity,
  opacity = 1,
  darkness = 0,
}: {
  intensity: number;
  opacity?: number;
  darkness?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const COUNT = 36000;
  const SWEEP_COLORS = useMemo(
    () => ["#A855F7", "#7C3AED", "#3B82F6", "#22D3EE", "#EC4899"].map((hex) => new THREE.Color(hex)),
    []
  );
  const SWEEP_MS = 5200;
  const { positions, sizes, colors, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const colors = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const colA = new THREE.Color("#62A8FF");
    const colB = new THREE.Color("#B86BFF");
    const colC = new THREE.Color("#FF4FD8");

    for (let i = 0; i < COUNT; i += 1) {
      const t = Math.random() * Math.PI * 2;
      // Mais "concentrado" no centro e menos espalhado no espaço.
      const r = Math.pow(Math.random(), 0.88) * 28;
      const y = (Math.random() - 0.5) * 4.2;
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      sizes[i] = 0.2 + Math.pow(Math.random(), 0.7) * 0.9;
      const mix1 = Math.random();
      const mix2 = Math.random();
      const c = colA.clone().lerp(colB, mix1).lerp(colC, mix2 * 0.35);
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      seeds[i] = Math.random();
    }
    return { positions, sizes, colors, seeds };
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vSeed;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        float hash(float n){ return fract(sin(n)*43758.5453123); }
        void main(){
          vColor = aColor;
          vSeed = aSeed;
          vec3 p = position;
          float n = hash(aSeed * 1000.0);
          float wobble = sin(uTime * (0.35 + n) + aSeed * 12.0) * 0.18 * uIntensity;
          p.y += wobble;
          float angle = 0.06 * uIntensity;
          float cs = cos(angle);
          float sn = sin(angle);
          p.xz = mat2(cs, -sn, sn, cs) * p.xz;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vec2 ndc = gl_Position.xy / max(1e-6, gl_Position.w);
          vScreenX = ndc.x * 0.5 + 0.5;
          vScreenY = ndc.y * 0.5 + 0.5;
          float dist = -mv.z;
          float s = aSize * (230.0 / dist);
          gl_PointSize = clamp(s, 0.7, 5.4);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec3 vColor;
        varying float vSeed;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uOpacity;
        uniform float uDarkness;
        uniform float uSweep;
        uniform float uSweepDir;
        uniform float uSweepBand;
        uniform vec3 uColorFrom;
        uniform vec3 uColorTo;
        uniform float uImpact;
        uniform vec2 uImpactPos;
        void main(){
          vec2 uv = gl_PointCoord.xy - 0.5;
          float d = length(uv);
          float soft = smoothstep(0.45, 0.0, d);
          float pulse = 0.65 + 0.35 * sin(uTime * (0.8 + vSeed) + vSeed * 10.0);
          float x = vScreenX;
          if (uSweepDir < 0.0) {
            x = 1.0 - x;
          }
          float sweep = smoothstep(uSweep - uSweepBand, uSweep + uSweepBand, x);
          vec3 sweepCol = mix(uColorFrom, uColorTo, sweep);
          vec3 col = sweepCol * (1.05 + 0.85 * uIntensity) * pulse;

          float dist = distance(vec2(vScreenX, vScreenY), uImpactPos);
          float wave = sin(dist * 58.0 - uTime * 13.0);
          float falloff = exp(-dist * 5.5);
          float ripple = uImpact * wave * falloff;
          col *= clamp(1.0 + ripple * 0.75, 0.25, 2.2);
          col = mix(col, vec3(0.0), clamp(uDarkness, 0.0, 1.0));

          float alpha = soft * 0.72 * clamp(uOpacity, 0.0, 1.0);
          alpha *= clamp(1.0 + ripple * 0.55, 0.15, 2.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uOpacity: { value: 1 },
        uDarkness: { value: 0 },
        uSweep: { value: 0 },
        uSweepDir: { value: 1 },
        uSweepBand: { value: 0.13 },
        uColorFrom: { value: new THREE.Color("#A855F7") },
        uColorTo: { value: new THREE.Color("#A855F7") },
        uImpact: { value: 0 },
        uImpactPos: { value: new THREE.Vector2(0.5, 0.5) },
      },
    });
  }, [intensity]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    (material.uniforms.uTime as any).value = t;
    (material.uniforms.uOpacity as any).value = opacity;
    (material.uniforms.uDarkness as any).value = darkness;

    const phase = Math.floor((t * 1000) / SWEEP_MS);
    const u = ((t * 1000) % SWEEP_MS) / SWEEP_MS;
    const dir = phase % 2 === 0 ? 1 : -1;
    const toIndex = phase % SWEEP_COLORS.length;
    const fromIndex = (toIndex - 1 + SWEEP_COLORS.length) % SWEEP_COLORS.length;

    (material.uniforms.uSweep as any).value = u;
    (material.uniforms.uSweepDir as any).value = dir;
    (material.uniforms.uColorFrom as any).value = SWEEP_COLORS[fromIndex];
    (material.uniforms.uColorTo as any).value = SWEEP_COLORS[toIndex];
    (material.uniforms.uImpact as any).value = universeImpact.strength;
    (material.uniforms.uImpactPos as any).value.set(universeImpact.x, universeImpact.y);

    pointsRef.current.rotation.y += 0.0007 * intensity;
    pointsRef.current.rotation.x += 0.0002 * intensity;
    pointsRef.current.position.x = THREE.MathUtils.lerp(
      pointsRef.current.position.x,
      universePointer.x * 0.45 * intensity,
      0.03
    );
    pointsRef.current.position.y = THREE.MathUtils.lerp(
      pointsRef.current.position.y,
      universePointer.y * 0.35 * intensity,
      0.03
    );
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [positions, sizes, colors, seeds]);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

function GalaxyRingField({
  intensity,
  opacity = 1,
  darkness = 0,
}: {
  intensity: number;
  opacity?: number;
  darkness?: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const cyanRef = useRef<THREE.Points>(null);
  const purpleRef = useRef<THREE.Points>(null);
  const COUNT = 72000;
  const CYAN_COUNT = 65000;
  const PURPLE_COUNT = 70000;
  const SWEEP_COLORS = useMemo(
    () => ["#A855F7", "#7C3AED", "#3B82F6", "#22D3EE", "#60A5FA"].map((hex) => new THREE.Color(hex)),
    []
  );

  const { positions, sizes, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const seeds = new Float32Array(COUNT);

    // "Galáxia branca": disco cheio (sem buraco no centro) com leve espiral.
    const outerR = 3.25;
    const arms = 3;
    const turns = 6.5;
    const thicknessY = 0.22;

    for (let i = 0; i < COUNT; i += 1) {
      // Disco cheio + espiral com múltiplos braços (galáxia).
      const arm = Math.floor(Math.random() * arms);
      // Mais denso no centro (sem buraco): puxa r para perto de 0.
      const u = Math.pow(Math.random(), 0.55);
      const r = u * outerR + (Math.random() - 0.5) * 0.035;
      const a =
        u * turns * Math.PI * 2 +
        arm * (Math.PI * 2) / arms +
        (Math.random() - 0.5) * 0.25;
      const y = (Math.random() - 0.5) * thicknessY;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 0.14 + Math.pow(Math.random(), 0.7) * 0.65;
      seeds[i] = Math.random();
    }

    return { positions, sizes, seeds };
  }, []);

  const cyanCloud = useMemo(() => {
    const positions = new Float32Array(CYAN_COUNT * 3);
    const sizes = new Float32Array(CYAN_COUNT);
    const seeds = new Float32Array(CYAN_COUNT);

    const outerR = 3.25;
    const arms = 3;
    const turns = 7.2;
    const thicknessY = 0.24;

    for (let i = 0; i < CYAN_COUNT; i += 1) {
      const arm = Math.floor(Math.random() * arms);
      const u = Math.pow(Math.random(), 0.5);
      const r = u * outerR + (Math.random() - 0.5) * 0.03;
      const a =
        u * turns * Math.PI * 2 +
        arm * (Math.PI * 2) / arms +
        (Math.random() - 0.5) * 0.22;
      const y = (Math.random() - 0.5) * thicknessY;

      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;

      sizes[i] = 0.12 + Math.pow(Math.random(), 0.75) * 0.62;
      seeds[i] = Math.random();
    }

    return { positions, sizes, seeds };
  }, []);

  const purpleCloud = useMemo(() => {
    const positions = new Float32Array(PURPLE_COUNT * 3);
    const sizes = new Float32Array(PURPLE_COUNT);
    const seeds = new Float32Array(PURPLE_COUNT);

    const outerR = 3.25;
    const arms = 3;
    const turns = 7.6;
    const thicknessY = 0.24;

    for (let i = 0; i < PURPLE_COUNT; i += 1) {
      const arm = Math.floor(Math.random() * arms);
      const u = Math.pow(Math.random(), 0.5);
      const r = u * outerR + (Math.random() - 0.5) * 0.03;
      const a =
        u * turns * Math.PI * 2 +
        arm * (Math.PI * 2) / arms +
        (Math.random() - 0.5) * 0.22;
      const y = (Math.random() - 0.5) * thicknessY;

      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;

      sizes[i] = 0.12 + Math.pow(Math.random(), 0.75) * 0.62;
      seeds[i] = Math.random();
    }

    return { positions, sizes, seeds };
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        varying float vSeed;
        varying float vAngle;
        varying float vRad;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        float hash(float n){ return fract(sin(n)*43758.5453123); }
        void main(){
          vSeed = aSeed;
          vec3 p = position;
          float n = hash(aSeed * 1000.0);
          // "anel do planeta": gira + vibra + respira (sem parecer que está "pulando")
          float wobble = sin(uTime * (0.55 + 0.35 * n) + aSeed * 11.0) * 0.12 * uIntensity;
          p.y += wobble;

          float spin = uTime * (0.18 + 0.22 * n) * (0.75 + 0.55 * uIntensity);
          float cs = cos(spin);
          float sn = sin(spin);
          p.xz = mat2(cs, -sn, sn, cs) * p.xz;

          float radial = sin(uTime * (0.65 + 0.25 * n) + aSeed * 6.0) * 0.06 * uIntensity;
          p += normalize(vec3(p.x, 0.0, p.z)) * radial;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vAngle = atan(p.z, p.x);
          vRad = length(p.xz);
          vec2 ndc = gl_Position.xy / max(1e-6, gl_Position.w);
          vScreenX = ndc.x * 0.5 + 0.5;
          vScreenY = ndc.y * 0.5 + 0.5;
          float dist = -mv.z;
          float s = aSize * (245.0 / dist);
          gl_PointSize = clamp(s, 0.55, 4.2);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vSeed;
        varying float vAngle;
        varying float vRad;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uOpacity;
        uniform float uDarkness;
        uniform vec3 uPal0;
        uniform vec3 uPal1;
        uniform vec3 uPal2;
        uniform vec3 uPal3;
        uniform vec3 uPal4;
        uniform float uImpact;
        uniform vec2 uImpactPos;
        const float PI = 3.1415926535897932384626433832795;
        float hash(float n){ return fract(sin(n)*43758.5453123); }
        vec3 pick(float idx){
          if (idx < 0.5) return uPal0;
          if (idx < 1.5) return uPal1;
          if (idx < 2.5) return uPal2;
          if (idx < 3.5) return uPal3;
          return uPal4;
        }
        void main(){
          vec2 uv = gl_PointCoord.xy - 0.5;
          float d = length(uv);
          float soft = smoothstep(0.42, 0.0, d);
          float pulse = 0.62 + 0.38 * sin(uTime * (0.65 + vSeed) + vSeed * 9.0);
          // 5 cores ao mesmo tempo + animação "espiral" (mais cara de galáxia)
          float ang = (vAngle / (2.0 * PI)) + 0.5; // 0..1
          float r = clamp(vRad / 3.25, 0.0, 1.0); // normaliza ~outerR

          // Coordenada em espiral (braços) + distorção sutil para não ficar "liso"
          float n = hash(vSeed * 1000.0);
          float swirl = ang + r * 0.62 - uTime * 0.035;
          swirl += 0.02 * sin(uTime * 0.8 + r * 10.0 + n * 6.2831);
          swirl += (n - 0.5) * 0.03;

          // Paleta rodando continuamente (sempre 5 cores presentes)
          float t = fract(swirl);
          float seg = t * 5.0;
          float idx = floor(seg);
          float f = fract(seg);
          vec3 c0 = pick(idx);
          vec3 c1 = pick(mod(idx + 1.0, 5.0));
          vec3 col = mix(c0, c1, smoothstep(0.0, 1.0, f));

          // Realça "braços" e dá profundidade no centro
          float arms = 0.55 + 0.45 * smoothstep(0.15, 0.95, 0.5 + 0.5 * sin((swirl * 6.2831) * 3.0));
          float core = 1.0 - smoothstep(0.0, 0.42, r);
          float depth = 0.78 + 0.52 * arms + 0.35 * core;

          col *= (0.85 + 0.55 * uIntensity) * pulse * depth;
          float dist = distance(vec2(vScreenX, vScreenY), uImpactPos);
          float wave = sin(dist * 52.0 - uTime * 12.0);
          float falloff = exp(-dist * 5.0);
          float ripple = uImpact * wave * falloff;
          col *= clamp(1.0 + ripple * 0.9, 0.25, 2.4);
          col = mix(col, vec3(0.0), clamp(uDarkness, 0.0, 1.0));

          float alpha = soft * 0.42 * clamp(uOpacity, 0.0, 1.0);
          alpha *= clamp(1.0 + ripple * 0.7, 0.15, 2.2);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uOpacity: { value: 1 },
        uDarkness: { value: 0 },
        uPal0: { value: new THREE.Color("#A855F7") },
        uPal1: { value: new THREE.Color("#3B82F6") },
        uPal2: { value: new THREE.Color("#22D3EE") },
        uPal3: { value: new THREE.Color("#EC4899") },
        uPal4: { value: new THREE.Color("#60A5FA") },
        uImpact: { value: 0 },
        uImpactPos: { value: new THREE.Vector2(0.5, 0.5) },
      },
    });
  }, [intensity]);

  const cyanMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        varying float vSeed;
        varying float vAngle;
        varying float vRad;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        float hash(float n){ return fract(sin(n)*43758.5453123); }
        void main(){
          vSeed = aSeed;
          vec3 p = position;
          float n = hash(aSeed * 1000.0);
          float wobble = sin(uTime * (0.6 + 0.35 * n) + aSeed * 10.0) * 0.12 * uIntensity;
          p.y += wobble;
          float spin = uTime * (0.2 + 0.25 * n) * (0.75 + 0.55 * uIntensity);
          float cs = cos(spin);
          float sn = sin(spin);
          p.xz = mat2(cs, -sn, sn, cs) * p.xz;
          float radial = sin(uTime * (0.7 + 0.25 * n) + aSeed * 7.0) * 0.065 * uIntensity;
          p += normalize(vec3(p.x, 0.0, p.z)) * radial;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vAngle = atan(p.z, p.x);
          vRad = length(p.xz);
          vec2 ndc = gl_Position.xy / max(1e-6, gl_Position.w);
          vScreenX = ndc.x * 0.5 + 0.5;
          vScreenY = ndc.y * 0.5 + 0.5;
          float dist = -mv.z;
          float s = aSize * (250.0 / dist);
          gl_PointSize = clamp(s, 0.6, 4.6);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vSeed;
        varying float vAngle;
        varying float vRad;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uOpacity;
        uniform float uDarkness;
        uniform vec3 uCyan;
        uniform vec3 uCyanAlt;
        uniform float uImpact;
        uniform vec2 uImpactPos;
        const float PI = 3.1415926535897932384626433832795;
        float hash(float n){ return fract(sin(n)*43758.5453123); }
        void main(){
          vec2 uv = gl_PointCoord.xy - 0.5;
          float d = length(uv);
          float soft = smoothstep(0.44, 0.0, d);

          float ang = (vAngle / (2.0 * PI)) + 0.5;
          float r = clamp(vRad / 3.25, 0.0, 1.0);
          float n = hash(vSeed * 1000.0);
          float swirl = ang + r * 0.62 - uTime * 0.035;
          swirl += 0.02 * sin(uTime * 0.8 + r * 10.0 + n * 6.2831);
          swirl += (n - 0.5) * 0.03;
          float t = fract(swirl);

          // Só aparece no segmento "ciano" (idx == 3), com fade nas bordas
          float seg = t * 5.0;
          float idx = floor(seg);
          float f = fract(seg);
          float isCyan = 1.0 - step(0.5, abs(idx - 3.0));
          float edge = smoothstep(0.0, 0.10, f) * (1.0 - smoothstep(0.90, 1.0, f));
          float mask = isCyan * edge;

          float sparkle = 0.75 + 0.25 * sin(uTime * (0.95 + vSeed) + vSeed * 12.0);
          vec3 col = mix(uCyanAlt, uCyan, 0.55 + 0.25 * sin(uTime * 0.35 + r * 6.0 + n * 6.2831));
          col *= (0.95 + 0.7 * uIntensity) * sparkle;

          float dist = distance(vec2(vScreenX, vScreenY), uImpactPos);
          float wave = sin(dist * 52.0 - uTime * 12.0);
          float falloff = exp(-dist * 5.0);
          float ripple = uImpact * wave * falloff;
          col *= clamp(1.0 + ripple * 0.9, 0.25, 2.4);
          col = mix(col, vec3(0.0), clamp(uDarkness, 0.0, 1.0));

          float alpha = soft * 0.72 * mask * clamp(uOpacity, 0.0, 1.0);
          alpha *= clamp(1.0 + ripple * 0.7, 0.15, 2.2);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uOpacity: { value: 1 },
        uDarkness: { value: 0 },
        uCyan: { value: new THREE.Color("#22D3EE") },
        uCyanAlt: { value: new THREE.Color("#3B82F6") },
        uImpact: { value: 0 },
        uImpactPos: { value: new THREE.Vector2(0.5, 0.5) },
      },
    });
  }, [intensity]);

  const purpleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        varying float vSeed;
        varying float vAngle;
        varying float vRad;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        float hash(float n){ return fract(sin(n)*43758.5453123); }
        void main(){
          vSeed = aSeed;
          vec3 p = position;
          float n = hash(aSeed * 1000.0);
          float wobble = sin(uTime * (0.6 + 0.35 * n) + aSeed * 10.0) * 0.12 * uIntensity;
          p.y += wobble;
          float spin = uTime * (0.2 + 0.25 * n) * (0.75 + 0.55 * uIntensity);
          float cs = cos(spin);
          float sn = sin(spin);
          p.xz = mat2(cs, -sn, sn, cs) * p.xz;
          float radial = sin(uTime * (0.7 + 0.25 * n) + aSeed * 7.0) * 0.065 * uIntensity;
          p += normalize(vec3(p.x, 0.0, p.z)) * radial;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          vAngle = atan(p.z, p.x);
          vRad = length(p.xz);
          vec2 ndc = gl_Position.xy / max(1e-6, gl_Position.w);
          vScreenX = ndc.x * 0.5 + 0.5;
          vScreenY = ndc.y * 0.5 + 0.5;
          float dist = -mv.z;
          float s = aSize * (250.0 / dist);
          gl_PointSize = clamp(s, 0.6, 4.6);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying float vSeed;
        varying float vAngle;
        varying float vRad;
        varying float vScreenX;
        varying float vScreenY;
        uniform float uTime;
        uniform float uIntensity;
        uniform float uOpacity;
        uniform float uDarkness;
        uniform vec3 uPurple;
        uniform vec3 uPurpleAlt;
        uniform float uImpact;
        uniform vec2 uImpactPos;
        const float PI = 3.1415926535897932384626433832795;
        float hash(float n){ return fract(sin(n)*43758.5453123); }
        void main(){
          vec2 uv = gl_PointCoord.xy - 0.5;
          float d = length(uv);
          float soft = smoothstep(0.44, 0.0, d);

          float ang = (vAngle / (2.0 * PI)) + 0.5;
          float r = clamp(vRad / 3.25, 0.0, 1.0);
          float n = hash(vSeed * 1000.0);
          float swirl = ang + r * 0.62 - uTime * 0.035;
          swirl += 0.02 * sin(uTime * 0.8 + r * 10.0 + n * 6.2831);
          swirl += (n - 0.5) * 0.03;
          float t = fract(swirl);

          // Só aparece nos segmentos "roxos" (idx 0 ou 1), com fade nas bordas
          float seg = t * 5.0;
          float idx = floor(seg);
          float f = fract(seg);
          float isPurple = 1.0 - step(1.5, idx); // idx 0 ou 1
          float edge = smoothstep(0.0, 0.10, f) * (1.0 - smoothstep(0.90, 1.0, f));
          float mask = isPurple * edge;

          float sparkle = 0.75 + 0.25 * sin(uTime * (0.95 + vSeed) + vSeed * 12.0);
          vec3 col = mix(uPurpleAlt, uPurple, 0.55 + 0.25 * sin(uTime * 0.35 + r * 6.0 + n * 6.2831));
          col *= (0.95 + 0.7 * uIntensity) * sparkle;

          float dist = distance(vec2(vScreenX, vScreenY), uImpactPos);
          float wave = sin(dist * 52.0 - uTime * 12.0);
          float falloff = exp(-dist * 5.0);
          float ripple = uImpact * wave * falloff;
          col *= clamp(1.0 + ripple * 0.9, 0.25, 2.4);
          col = mix(col, vec3(0.0), clamp(uDarkness, 0.0, 1.0));

          float alpha = soft * 0.72 * mask * clamp(uOpacity, 0.0, 1.0);
          alpha *= clamp(1.0 + ripple * 0.7, 0.15, 2.2);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uOpacity: { value: 1 },
        uDarkness: { value: 0 },
        uPurple: { value: new THREE.Color("#A855F7") },
        uPurpleAlt: { value: new THREE.Color("#7C3AED") },
        uImpact: { value: 0 },
        uImpactPos: { value: new THREE.Vector2(0.5, 0.5) },
      },
    });
  }, [intensity]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [positions, sizes, seeds]);

  const cyanGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(cyanCloud.positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(cyanCloud.sizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(cyanCloud.seeds, 1));
    return g;
  }, [cyanCloud.positions, cyanCloud.sizes, cyanCloud.seeds]);

  const purpleGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(purpleCloud.positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(purpleCloud.sizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(purpleCloud.seeds, 1));
    return g;
  }, [purpleCloud.positions, purpleCloud.sizes, purpleCloud.seeds]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    (material.uniforms.uTime as any).value = t;
    (material.uniforms.uOpacity as any).value = opacity;
    (material.uniforms.uDarkness as any).value = darkness;
    (cyanMaterial.uniforms.uTime as any).value = t;
    (cyanMaterial.uniforms.uOpacity as any).value = opacity;
    (cyanMaterial.uniforms.uDarkness as any).value = darkness;
    (purpleMaterial.uniforms.uTime as any).value = t;
    (purpleMaterial.uniforms.uOpacity as any).value = opacity;
    (purpleMaterial.uniforms.uDarkness as any).value = darkness;
    (material.uniforms.uPal0 as any).value = SWEEP_COLORS[0];
    (material.uniforms.uPal1 as any).value = SWEEP_COLORS[1];
    (material.uniforms.uPal2 as any).value = SWEEP_COLORS[2];
    (material.uniforms.uPal3 as any).value = SWEEP_COLORS[3];
    (material.uniforms.uPal4 as any).value = SWEEP_COLORS[4];
    (cyanMaterial.uniforms.uCyanAlt as any).value = SWEEP_COLORS[2];
    (cyanMaterial.uniforms.uCyan as any).value = SWEEP_COLORS[3];
    (purpleMaterial.uniforms.uPurple as any).value = SWEEP_COLORS[0];
    (purpleMaterial.uniforms.uPurpleAlt as any).value = SWEEP_COLORS[1];
    (material.uniforms.uImpact as any).value = universeImpact.strength;
    (material.uniforms.uImpactPos as any).value.set(universeImpact.x, universeImpact.y);
    (cyanMaterial.uniforms.uImpact as any).value = universeImpact.strength;
    (cyanMaterial.uniforms.uImpactPos as any).value.set(universeImpact.x, universeImpact.y);
    (purpleMaterial.uniforms.uImpact as any).value = universeImpact.strength;
    (purpleMaterial.uniforms.uImpactPos as any).value.set(universeImpact.x, universeImpact.y);

    // Mais afastada e mais à direita (profundidade)
    const baseX = 7.35;
    const baseY = -0.22;
    const baseZ = -8.25;

    pointsRef.current.rotation.y += 0.00035 * intensity;
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(
      pointsRef.current.rotation.x,
      0.35 + universePointer.y * 0.06,
      0.03
    );
    pointsRef.current.rotation.z = THREE.MathUtils.lerp(
      pointsRef.current.rotation.z,
      -0.12 + universePointer.x * 0.08,
      0.03
    );
    pointsRef.current.position.x = THREE.MathUtils.lerp(
      pointsRef.current.position.x,
      baseX + universePointer.x * 0.35 * intensity,
      0.02
    );
    pointsRef.current.position.y = THREE.MathUtils.lerp(
      pointsRef.current.position.y,
      baseY + universePointer.y * 0.35 * intensity,
      0.02
    );
    pointsRef.current.position.z = THREE.MathUtils.lerp(pointsRef.current.position.z, baseZ, 0.02);

    if (cyanRef.current) {
      cyanRef.current.rotation.copy(pointsRef.current.rotation);
      cyanRef.current.position.copy(pointsRef.current.position);
    }
    if (purpleRef.current) {
      purpleRef.current.rotation.copy(pointsRef.current.rotation);
      purpleRef.current.position.copy(pointsRef.current.position);
    }
  });

  return (
    <>
      <points ref={pointsRef} geometry={geometry} material={material} />
      <points ref={cyanRef} geometry={cyanGeometry} material={cyanMaterial} />
      <points ref={purpleRef} geometry={purpleGeometry} material={purpleMaterial} />
    </>
  );
}

function ParticlePlanet3D({ intensity }: { intensity: number }) {
  const planetRef = useRef<THREE.Points>(null);
  const ringRef = useRef<THREE.Points>(null);
  const pulseRef = useRef(0);
  const spinBurstRef = useRef(0);
  const paletteARef = useRef(new THREE.Color("#A855F7"));
  const paletteBRef = useRef(new THREE.Color("#3B82F6"));

  const onPlanetTap = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pulseRef.current = 0.35;
    spinBurstRef.current = 1;
    triggerUniverseImpact(e.clientX, e.clientY);
  };

  const onPlanetOver = () => {
    document.body.style.cursor = "pointer";
  };
  const onPlanetOut = () => {
    document.body.style.cursor = "";
  };

  const WORD_THEMES = useMemo(
    () => [
      // CREATE
      { a: new THREE.Color("#A855F7"), b: new THREE.Color("#3B82F6") },
      // DISCOVER
      { a: new THREE.Color("#22D3EE"), b: new THREE.Color("#3B82F6") },
      // EVOLVE
      { a: new THREE.Color("#EC4899"), b: new THREE.Color("#A855F7") },
    ],
    []
  );
  const WORD_MS = 4200;

  const PLANET_COUNT = 65000;
  const planetPositions = useMemo(() => fibonacciSphere(PLANET_COUNT, 1.85), []);
  const planetSizes = useMemo(() => {
    const s = new Float32Array(PLANET_COUNT);
    for (let i = 0; i < PLANET_COUNT; i += 1) s[i] = 0.85 + Math.random() * 1.55;
    return s;
  }, []);
  const planetSeeds = useMemo(() => {
    const a = new Float32Array(PLANET_COUNT);
    for (let i = 0; i < PLANET_COUNT; i += 1) a[i] = Math.random();
    return a;
  }, []);

  const planetMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPulse;
        uniform float uIntensity;
        varying float vSeed;
        void main(){
          vSeed = aSeed;
          vec3 p = position;
          float wave = sin(uTime * (1.2 + aSeed) + aSeed * 18.0) * 0.05 * uIntensity;
          p += normalize(p) * wave;
          p += normalize(p) * (uPulse * 0.18);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = -mv.z;
          float s = aSize * (170.0 / dist);
          gl_PointSize = clamp(s, 0.95, 8.5);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform float uPulse;
        uniform float uIntensity;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vSeed;
        void main(){
          vec2 uv = gl_PointCoord.xy - 0.5;
          float d = length(uv);
          float soft = smoothstep(0.5, 0.0, d);
          float glow = 0.7 + 0.3 * sin(uTime * (1.0 + vSeed) + vSeed * 9.0);
          float extra = 1.0 + uPulse * 0.7;
          vec3 col = mix(uColorA, uColorB, vSeed);
          col *= (1.2 + 0.7 * uIntensity) * glow * extra;
          gl_FragColor = vec4(col, soft * 0.95);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uIntensity: { value: intensity },
        uColorA: { value: new THREE.Color("#A855F7") },
        uColorB: { value: new THREE.Color("#3B82F6") },
      },
    });
  }, [intensity]);

  const RING_COUNT = 45000;
  const ringPositions = useMemo(() => ringPoints3D(RING_COUNT, 2.35, 3.25), []);
  const ringSizes = useMemo(() => {
    const s = new Float32Array(RING_COUNT);
    for (let i = 0; i < RING_COUNT; i += 1) s[i] = 0.75 + Math.random() * 1.35;
    return s;
  }, []);
  const ringSeeds = useMemo(() => {
    const a = new Float32Array(RING_COUNT);
    for (let i = 0; i < RING_COUNT; i += 1) a[i] = Math.random();
    return a;
  }, []);

  const ringMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aSeed;
        uniform float uTime;
        uniform float uPulse;
        uniform float uIntensity;
        varying float vSeed;
        void main(){
          vSeed = aSeed;
          vec3 p = position;
          p.y += sin(uTime * (1.4 + aSeed) + aSeed * 14.0) * 0.06 * uIntensity;
          p += normalize(vec3(p.x, 0.0, p.z)) * (uPulse * 0.15);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float dist = -mv.z;
          float s = aSize * (160.0 / dist);
          gl_PointSize = clamp(s, 0.75, 6.6);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uTime;
        uniform float uPulse;
        uniform float uIntensity;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vSeed;
        void main(){
          vec2 uv = gl_PointCoord.xy - 0.5;
          float d = length(uv);
          float soft = smoothstep(0.5, 0.0, d);
          float glow = 0.6 + 0.4 * sin(uTime * (1.1 + vSeed) + vSeed * 11.0);
          float extra = 1.0 + uPulse * 0.6;
          vec3 col = mix(uColorA, uColorB, vSeed);
          col *= (1.1 + 0.7 * uIntensity) * glow * extra;
          gl_FragColor = vec4(col, soft * 0.9);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uIntensity: { value: intensity },
        uColorA: { value: new THREE.Color("#A855F7") },
        uColorB: { value: new THREE.Color("#3B82F6") },
      },
    });
  }, [intensity]);

  const planetGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(planetPositions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(planetSizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(planetSeeds, 1));
    return g;
  }, [planetPositions, planetSizes, planetSeeds]);

  const ringGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(ringPositions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(ringSizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(ringSeeds, 1));
    return g;
  }, [ringPositions, ringSizes, ringSeeds]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    spinBurstRef.current = Math.max(0, spinBurstRef.current - 0.035);
    pulseRef.current = Math.max(0, pulseRef.current - 0.03);
    const pulse = pulseRef.current;
    const spinBoost = spinBurstRef.current;

    (planetMat.uniforms.uTime as any).value = t;
    (ringMat.uniforms.uTime as any).value = t;

    const phase = Math.floor((t * 1000) / WORD_MS) % WORD_THEMES.length;
    const u = ((t * 1000) % WORD_MS) / WORD_MS;
    const next = (phase + 1) % WORD_THEMES.length;
    const smooth = u * u * (3 - 2 * u);
    paletteARef.current.copy(WORD_THEMES[phase].a).lerp(WORD_THEMES[next].a, smooth);
    paletteBRef.current.copy(WORD_THEMES[phase].b).lerp(WORD_THEMES[next].b, smooth);
    (planetMat.uniforms.uColorA as any).value = paletteARef.current;
    (planetMat.uniforms.uColorB as any).value = paletteBRef.current;
    (ringMat.uniforms.uColorA as any).value = paletteARef.current;
    (ringMat.uniforms.uColorB as any).value = paletteBRef.current;

    (planetMat.uniforms.uPulse as any).value = pulse;
    (ringMat.uniforms.uPulse as any).value = pulse;
    if (planetRef.current) {
      planetRef.current.rotation.y += (0.0032 + 0.016 * spinBoost) * intensity;
      planetRef.current.rotation.x += (0.0012 + 0.006 * spinBoost) * intensity;
      planetRef.current.rotation.y += universePointer.x * 0.002 * intensity;
      planetRef.current.rotation.x += universePointer.y * 0.0015 * intensity;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y += (0.0022 + 0.012 * spinBoost) * intensity;
      ringRef.current.rotation.z = THREE.MathUtils.lerp(
        ringRef.current.rotation.z,
        0.35 + universePointer.x * 0.08,
        0.03
      );
      ringRef.current.rotation.x = THREE.MathUtils.lerp(
        ringRef.current.rotation.x,
        0.15 + universePointer.y * 0.06,
        0.03
      );
    }
  });

  return (
    <group position={[0.2, -0.2, 0]}>
      <mesh onPointerDown={onPlanetTap} onPointerOver={onPlanetOver} onPointerOut={onPlanetOut}>
        <sphereGeometry args={[2.15, 18, 18]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onPointerDown={onPlanetTap}
        onPointerOver={onPlanetOver}
        onPointerOut={onPlanetOut}
      >
        <torusGeometry args={[2.8, 0.6, 10, 48]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <points ref={planetRef} geometry={planetGeo} material={planetMat} onPointerDown={onPlanetTap} />
      <points ref={ringRef} geometry={ringGeo} material={ringMat} onPointerDown={onPlanetTap} />
      <Html position={[0, -2.7, 0]} center style={{ pointerEvents: "none" }}>
        <div
          style={{
            fontFamily: "ui-sans-serif, system-ui",
            fontSize: 12,
            letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
            userSelect: "none",
          }}
        >
          MERSE UNIVERSE
        </div>
      </Html>
    </group>
  );
}

function Constellations({ intensity }: { intensity: number }) {
  const lineRef = useRef<THREE.LineSegments>(null);
  const STAR_COUNT = 260;
  const { linePositions } = useMemo(() => {
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const t = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.6) * 9.5;
      const y = (Math.random() - 0.5) * 4.5;
      starPositions[i * 3 + 0] = Math.cos(t) * r;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = Math.sin(t) * r;
    }
    const maxLinksPerStar = 2;
    const links: number[] = [];
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const ix = starPositions[i * 3 + 0];
      const iy = starPositions[i * 3 + 1];
      const iz = starPositions[i * 3 + 2];
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < STAR_COUNT; j += 1) {
        if (i === j) continue;
        const jx = starPositions[j * 3 + 0];
        const jy = starPositions[j * 3 + 1];
        const jz = starPositions[j * 3 + 2];
        const dx = ix - jx;
        const dy = iy - jy;
        const dz = iz - jz;
        const d = dx * dx + dy * dy + dz * dz;
        dists.push({ j, d });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let k = 0; k < maxLinksPerStar; k += 1) {
        const j = dists[k].j;
        links.push(i, j);
      }
    }
    const linePositions = new Float32Array(links.length * 3);
    for (let idx = 0; idx < links.length; idx += 1) {
      const s = links[idx];
      linePositions[idx * 3 + 0] = starPositions[s * 3 + 0];
      linePositions[idx * 3 + 1] = starPositions[s * 3 + 1];
      linePositions[idx * 3 + 2] = starPositions[s * 3 + 2];
    }
    return { linePositions };
  }, []);

  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    return g;
  }, [linePositions]);

  const mat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.18,
      color: new THREE.Color("#9DD0FF"),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;
    const t = clock.getElapsedTime();
    lineRef.current.rotation.y = 0.12 + Math.sin(t * 0.2) * 0.05;
    lineRef.current.rotation.x = 0.08 + Math.cos(t * 0.15) * 0.05;
    lineRef.current.position.x = THREE.MathUtils.lerp(
      lineRef.current.position.x,
      universePointer.x * 0.25 * intensity,
      0.03
    );
    lineRef.current.position.y = THREE.MathUtils.lerp(
      lineRef.current.position.y,
      universePointer.y * 0.18 * intensity,
      0.03
    );
  });

  return <lineSegments ref={lineRef} geometry={geo} material={mat} />;
}

function fibonacciSphere(count: number, radius: number) {
  const pts = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;
    pts[i * 3 + 0] = x * radius;
    pts[i * 3 + 1] = y * radius;
    pts[i * 3 + 2] = z * radius;
  }
  return pts;
}

function ringPoints3D(count: number, innerR: number, outerR: number) {
  const pts = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const t = Math.random() * Math.PI * 2;
    const r = innerR + Math.random() * (outerR - innerR);
    pts[i * 3 + 0] = Math.cos(t) * r;
    pts[i * 3 + 1] = (Math.random() - 0.5) * 0.22;
    pts[i * 3 + 2] = Math.sin(t) * r;
  }
  return pts;
}
