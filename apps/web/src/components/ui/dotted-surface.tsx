import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

type DottedSurfaceProps = React.ComponentProps<"div">;

export function DottedSurface({ className, ...props }: DottedSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 60;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000,
    );
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);

    container.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
        positions.push(x, 0, z);
        colors.push(1, 1, 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 7,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const positionAttribute = geometry.attributes.position;
      const arr = positionAttribute.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;
          arr[index + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }

      positionAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.1;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    animate();

    sceneRef.current = { renderer, animationId };

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
      aria-hidden
      {...props}
    />
  );
}
