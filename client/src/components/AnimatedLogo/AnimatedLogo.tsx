"use client";

import { useRef, useEffect, useCallback, useId } from "react";
import { ANIMATIONS, pickRandom, type AnimationName } from "./animations";
import styles from "./AnimatedLogo.module.css";

export interface AnimatedLogoProps {
  size?: number;
  interval?: number;
  showDivider?: boolean;
  animation?: AnimationName | "random" | "none";
  className?: string;
}

let instanceCounter = 0;

export function AnimatedLogo({
  size = 80,
  interval = 300_000,
  showDivider = false,
  animation = "random",
  className = "",
}: AnimatedLogoProps) {
  const logoRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);
  const reactId = useId();
  const instanceRef = useRef<number | null>(null);

  if (instanceRef.current === null) {
    instanceRef.current = ++instanceCounter;
  }

  // Unique gradient IDs so multiple instances don't clash
  const ns = `al${instanceRef.current}`;
  const idBl = `${ns}-bl`;
  const idOr = `${ns}-or`;
  const idGr = `${ns}-gr`;

  const runSpecific = useCallback(async (name: AnimationName) => {
    if (animatingRef.current || !logoRef.current || !shadowRef.current) return;
    animatingRef.current = true;
    const fn = ANIMATIONS[name];
    if (fn) {
      try {
        await fn({ logo: logoRef.current!, shadow: shadowRef.current! });
      } catch { /* unmount */ }
    }
    animatingRef.current = false;
  }, []);

  const runAnimation = useCallback(async () => {
    const name: AnimationName =
      animation === "random" ? pickRandom() : (animation as AnimationName);
    await runSpecific(name);
  }, [animation, runSpecific]);

  // Listen for imperative "logo:animate" events from anywhere in the app
  useEffect(() => {
    const handler = (e: Event) => {
      const name = (e as CustomEvent<AnimationName>).detail;
      if (name && ANIMATIONS[name]) runSpecific(name);
    };
    document.addEventListener("logo:animate", handler);
    return () => document.removeEventListener("logo:animate", handler);
  }, [runSpecific]);

  useEffect(() => {
    if (animation === "none") return;

    const id = setInterval(runAnimation, interval);
    return () => clearInterval(id);
  }, [animation, interval, runAnimation]);

  return (
    <div className={`${styles.wrapper} ${className}`} style={{ width: size }}>
      {/* Logo container — transforms apply here */}
      <div ref={logoRef} className={styles.logoContainer}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-4 -4 88 100"
          width={size}
          height={size}
          aria-label="OneDigital logo"
          role="img"
        >
          <defs>
            <linearGradient
              id={idBl}
              x1="30"
              y1="0"
              x2="0"
              y2="51"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#4FB3CE" />
              <stop offset="45%" stopColor="#1A96BF" />
              <stop offset="100%" stopColor="#006B92" />
            </linearGradient>
            <linearGradient
              id={idOr}
              x1="70"
              y1="13"
              x2="70"
              y2="78"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#F26522" />
              <stop offset="35%" stopColor="#F89A1C" />
              <stop offset="70%" stopColor="#FCB016" />
              <stop offset="100%" stopColor="#FFC60B" />
            </linearGradient>
            <linearGradient
              id={idGr}
              x1="0"
              y1="70"
              x2="80"
              y2="70"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#3A7A30" />
              <stop offset="20%" stopColor="#55A043" />
              <stop offset="45%" stopColor="#8EB935" />
              <stop offset="70%" stopColor="#C2C427" />
              <stop offset="90%" stopColor="#F0C410" />
              <stop offset="100%" stopColor="#FFC60B" />
            </linearGradient>
          </defs>
          <polygon points="51,0 72,12 0,51 0,30" fill={`url(#${idBl})`} />
          <polygon
            points="73,12 79,16 79,76 61,76 61,20"
            fill={`url(#${idOr})`}
          />
          <polygon
            points="0,52 60,76 79,76 51,91 0,62"
            fill={`url(#${idGr})`}
          />
        </svg>
      </div>

      {/* Ground shadow */}
      <div
        ref={shadowRef}
        className={styles.shadow}
        style={{
          width: size * 0.6,
          height: size * 0.12,
        }}
      />

      {/* Green divider */}
      {showDivider && (
        <hr
          className={styles.divider}
          style={{ width: size, marginTop: size * 0.15 }}
        />
      )}
    </div>
  );
}
