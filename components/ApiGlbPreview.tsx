"use client";

import * as THREE from "three";
import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, OrbitControls, useGLTF } from "@react-three/drei";

type ModelProps = {
  url: string;
};

function RotatingModel({ url }: ModelProps) {
  const modelRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useFrame((_, delta) => {
    if (!modelRef.current) return;
    modelRef.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={modelRef}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </group>
  );
}

export default function ApiGlbPreview() {
  return <ApiGlbPreviewWithUrl />;
}

type ApiGlbPreviewProps = {
  url?: string;
};

export function ApiGlbPreviewWithUrl({ url }: ApiGlbPreviewProps) {
  const resolvedUrl = url ?? "/api/replicate-prediction-tbr5wsz519rmw0cvpnd80rsx68.glb";
  return (
    <Canvas camera={{ position: [0, 1.2, 3.8], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#07070b"]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      <Suspense fallback={null}>
        <RotatingModel url={resolvedUrl} />
        <Environment preset="city" />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={2.3} maxDistance={6} />
    </Canvas>
  );
}

useGLTF.preload("/api/replicate-prediction-tbr5wsz519rmw0cvpnd80rsx68.glb");
