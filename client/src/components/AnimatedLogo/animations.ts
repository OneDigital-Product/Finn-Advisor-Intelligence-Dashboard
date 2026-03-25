// ---------------------------------------------------------------------------
// Easing functions
// ---------------------------------------------------------------------------
export const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const easeIn = (t: number) => t * t * t;

export const elastic = (t: number) =>
  t === 0
    ? 0
    : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

// ---------------------------------------------------------------------------
// Core runner — drives a single tween via rAF
// ---------------------------------------------------------------------------
export function animate(
  duration: number,
  onFrame: (t: number) => void,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      onFrame(t);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

// ---------------------------------------------------------------------------
// Helpers — apply transforms to logo + shadow elements
// ---------------------------------------------------------------------------
type Elements = {
  logo: HTMLDivElement;
  shadow: HTMLDivElement;
};

function setTransform(el: HTMLElement, t: string) {
  el.style.transform = t;
}

function setShadow(
  shadow: HTMLDivElement,
  scaleX: number,
  scaleY: number,
  opacity: number,
) {
  shadow.style.transform = `scaleX(${scaleX}) scaleY(${scaleY})`;
  shadow.style.opacity = String(opacity);
}

/** Map a logo Y-offset to shadow params */
function shadowFromY(y: number, maxY: number) {
  const ratio = Math.min(Math.abs(y) / maxY, 1);
  const sx = 1 - ratio * 0.5;
  const sy = 1 - ratio * 0.5;
  const op = 0.6 - ratio * 0.4;
  return { sx, sy, op };
}

function reset({ logo, shadow }: Elements) {
  setTransform(logo, "translate(0,0) scale(1,1) rotate(0deg)");
  setShadow(shadow, 1, 1, 0.6);
}

// ---------------------------------------------------------------------------
// 1. Bounce
// ---------------------------------------------------------------------------
export async function bounce({ logo, shadow }: Elements) {
  // Anticipation crouch
  await animate(120, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(${p * 6}px) scaleX(${1 + p * 0.1}) scaleY(${1 - p * 0.1})`);
    setShadow(shadow, 1 + p * 0.15, 1 + p * 0.1, 0.6 + p * 0.15);
  });

  // Launch
  await animate(280, (t) => {
    const p = easeOut(t);
    const y = 6 - p * 70; // 6 → -64
    const stretch = 1 + p * 0.06;
    setTransform(logo, `translateY(${y}px) scaleX(${1.1 - p * 0.12}) scaleY(${0.9 + p * 0.06 + p * 0.06})`);
    const s = shadowFromY(y, 64);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Apex hang
  await animate(300, (t) => {
    const bob = Math.sin(t * Math.PI * 2) * 4;
    setTransform(logo, `translateY(${-64 + bob}px) scaleX(0.98) scaleY(1.02)`);
    setShadow(shadow, 0.5, 0.5, 0.2);
  });

  // Fall
  await animate(250, (t) => {
    const p = easeIn(t);
    const y = -64 + p * 64;
    setTransform(logo, `translateY(${y}px) scaleX(${0.98 - p * 0.02}) scaleY(${1.02 + p * 0.04})`);
    const s = shadowFromY(y, 64);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Impact squash
  await animate(80, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(0px) scaleX(${1 + p * 0.12}) scaleY(${1 - p * 0.12})`);
    setShadow(shadow, 1 + p * 0.2, 1 + p * 0.1, 0.6 + p * 0.2);
  });

  // Elastic rebound
  await animate(200, (t) => {
    const p = elastic(t);
    const y = -12 * (1 - p);
    setTransform(logo, `translateY(${-12 + p * 12}px) scaleX(${1.12 - p * 0.12}) scaleY(${0.88 + p * 0.12})`);
    const s = shadowFromY(y, 64);
    setShadow(shadow, s.sx + p * (1 - s.sx), s.sy + p * (1 - s.sy), s.op + p * (0.6 - s.op));
  });

  // Settle
  await animate(250, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(0px) scaleX(1) scaleY(1)`);
    setShadow(shadow, 1, 1, 0.6);
  });

  reset({ logo, shadow });
}

// ---------------------------------------------------------------------------
// 2. Spin
// ---------------------------------------------------------------------------
export async function spin({ logo, shadow }: Elements) {
  // Lift
  await animate(400, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(${-16 * p}px)`);
    const s = shadowFromY(-16 * p, 40);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // 360° rotation with wobble
  await animate(1400, (t) => {
    const p = ease(t);
    const deg = p * 360;
    const wobble = Math.sin(t * Math.PI * 4) * 3;
    setTransform(logo, `translateY(${-16 + wobble}px) rotate(${deg}deg)`);
    setShadow(shadow, 0.65, 0.65, 0.3);
  });

  // Descend
  await animate(500, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(${-16 + 16 * p}px) rotate(360deg)`);
    const y = -16 + 16 * p;
    const s = shadowFromY(y, 40);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Micro-bounce settle
  await animate(200, (t) => {
    const p = elastic(t);
    setTransform(logo, `translateY(${(1 - p) * -3}px) scaleX(${1 + (1 - p) * 0.04}) scaleY(${1 - (1 - p) * 0.04})`);
    setShadow(shadow, 1, 1, 0.6);
  });

  reset({ logo, shadow });
}

// ---------------------------------------------------------------------------
// 3. Backflip
// ---------------------------------------------------------------------------
export async function backflip({ logo, shadow }: Elements) {
  // Crouch
  await animate(150, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(${p * 8}px) scaleX(${1 + p * 0.12}) scaleY(${1 - p * 0.12})`);
    setShadow(shadow, 1 + p * 0.1, 1 + p * 0.05, 0.6 + p * 0.1);
  });

  // Launch + flip
  await animate(600, (t) => {
    const arc = Math.sin(t * Math.PI) * -90; // sine arc, peak at -90
    const y = 8 + arc;
    const deg = -t * 360;
    const p = ease(t);
    setTransform(logo, `translateY(${y}px) rotate(${deg}deg) scaleX(${1.12 - p * 0.12}) scaleY(${0.88 + p * 0.12})`);
    const s = shadowFromY(y, 90);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Landing squash
  await animate(80, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(0px) rotate(-360deg) scaleX(${1 + p * 0.1}) scaleY(${1 - p * 0.1})`);
    setShadow(shadow, 1 + p * 0.15, 1 + p * 0.08, 0.7 + p * 0.1);
  });

  // Elastic settle
  await animate(350, (t) => {
    const p = elastic(t);
    setTransform(logo, `translateY(${(1 - p) * -6}px) scaleX(${1.1 - p * 0.1}) scaleY(${0.9 + p * 0.1})`);
    setShadow(shadow, 1 + (1 - p) * 0.1, 1, 0.6);
  });

  reset({ logo, shadow });
}

// ---------------------------------------------------------------------------
// 4. Wiggle
// ---------------------------------------------------------------------------
export async function wiggle({ logo, shadow }: Elements) {
  const angles = [8, -10, 7, -5, 3, -1.5, 0];
  for (const deg of angles) {
    await animate(100, (t) => {
      const p = ease(t);
      const currentDeg = deg * p;
      setTransform(logo, `translateX(${currentDeg * 0.3}px) rotate(${currentDeg}deg)`);
      setShadow(shadow, 1 + Math.abs(currentDeg) * 0.003, 1, 0.6);
    });
  }
  // Settle
  await animate(200, (t) => {
    const p = ease(t);
    setTransform(logo, `translateX(0px) rotate(0deg)`);
    setShadow(shadow, 1, 1, 0.6);
  });

  reset({ logo, shadow });
}

// ---------------------------------------------------------------------------
// 5. Pulse
// ---------------------------------------------------------------------------
export async function pulse({ logo, shadow }: Elements) {
  // Expand
  await animate(400, (t) => {
    const p = ease(t);
    const s = 1 + p * 0.15;
    setTransform(logo, `translateY(${-4 * p}px) scale(${s})`);
    setShadow(shadow, 1 + p * 0.2, 1 + p * 0.1, 0.6 - p * 0.1);
  });

  // Hold
  await animate(200, () => {
    setTransform(logo, `translateY(-4px) scale(1.15)`);
    setShadow(shadow, 1.2, 1.1, 0.5);
  });

  // Snap back
  await animate(300, (t) => {
    const p = elastic(t);
    const s = 1.15 - p * 0.15;
    setTransform(logo, `translateY(${-4 + p * 4}px) scale(${s})`);
    setShadow(shadow, 1.2 - p * 0.2, 1.1 - p * 0.1, 0.5 + p * 0.1);
  });

  // Settle
  await animate(200, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(0px) scale(1)`);
    setShadow(shadow, 1, 1, 0.6);
  });

  reset({ logo, shadow });
}

// ---------------------------------------------------------------------------
// 6. Float Up
// ---------------------------------------------------------------------------
export async function floatUp({ logo, shadow }: Elements) {
  // Slow rise
  await animate(800, (t) => {
    const p = ease(t);
    const y = -50 * p;
    const rot = 8 * p;
    setTransform(logo, `translateY(${y}px) rotate(${rot}deg)`);
    const s = shadowFromY(y, 50);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Gentle sway
  await animate(1000, (t) => {
    const dx = Math.sin(t * Math.PI * 2) * 5;
    const dy = Math.sin(t * Math.PI * 3) * 4;
    const rot = 8 + Math.sin(t * Math.PI * 2) * 3;
    setTransform(logo, `translateX(${dx}px) translateY(${-50 + dy}px) rotate(${rot}deg)`);
    setShadow(shadow, 0.5 + Math.abs(dx) * 0.01, 0.5, 0.2);
  });

  // Drift down
  await animate(700, (t) => {
    const p = ease(t);
    const y = -50 + 50 * p;
    const rot = 8 * (1 - p);
    setTransform(logo, `translateY(${y}px) rotate(${rot}deg)`);
    const s = shadowFromY(y, 50);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Tiny landing
  await animate(150, (t) => {
    const p = elastic(t);
    setTransform(logo, `translateY(${(1 - p) * -3}px) scaleX(${1 + (1 - p) * 0.03}) scaleY(${1 - (1 - p) * 0.03})`);
    setShadow(shadow, 1, 1, 0.6);
  });

  reset({ logo, shadow });
}

// ---------------------------------------------------------------------------
// 7. Drop Slam
// ---------------------------------------------------------------------------
export async function dropSlam({ logo, shadow }: Elements) {
  // Silent rise
  await animate(500, (t) => {
    const p = ease(t);
    const y = -80 * p;
    setTransform(logo, `translateY(${y}px)`);
    const s = shadowFromY(y, 80);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Ominous hang
  await animate(400, (t) => {
    const bob = Math.sin(t * Math.PI * 4) * 2;
    setTransform(logo, `translateY(${-80 + bob}px)`);
    setShadow(shadow, 0.45, 0.45, 0.15);
  });

  // SLAM
  await animate(150, (t) => {
    const p = easeIn(t);
    const y = -80 + 80 * p;
    setTransform(logo, `translateY(${y}px) scaleX(${1 - p * 0.05}) scaleY(${1 + p * 0.08})`);
    const s = shadowFromY(y, 80);
    setShadow(shadow, s.sx, s.sy, s.op);
  });

  // Big impact squash
  await animate(60, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(0px) scaleX(${1 + p * 0.18}) scaleY(${1 - p * 0.18})`);
    setShadow(shadow, 1 + p * 0.3, 1 + p * 0.15, 0.7 + p * 0.15);
  });

  // Rebound
  await animate(200, (t) => {
    const p = easeOut(t);
    const y = -18 * (1 - p);
    setTransform(logo, `translateY(${-18 + p * 18}px) scaleX(${1.18 - p * 0.18}) scaleY(${0.82 + p * 0.18})`);
    setShadow(shadow, 1.3 - p * 0.3, 1.15 - p * 0.15, 0.85 - p * 0.25);
  });

  // Fall back
  await animate(180, (t) => {
    const p = easeIn(t);
    setTransform(logo, `translateY(${(1 - p) * -4}px)`);
    setShadow(shadow, 1, 1, 0.6);
  });

  // Small squash
  await animate(60, (t) => {
    const p = ease(t);
    setTransform(logo, `translateY(0px) scaleX(${1 + p * 0.06}) scaleY(${1 - p * 0.04})`);
    setShadow(shadow, 1 + p * 0.08, 1, 0.65);
  });

  // Elastic settle
  await animate(300, (t) => {
    const p = elastic(t);
    setTransform(logo, `translateY(0px) scaleX(${1.06 - p * 0.06}) scaleY(${0.96 + p * 0.04})`);
    setShadow(shadow, 1.08 - p * 0.08, 1, 0.65 - p * 0.05);
  });

  reset({ logo, shadow });
}

// ---------------------------------------------------------------------------
// Animation registry
// ---------------------------------------------------------------------------
export const ANIMATIONS = {
  bounce,
  spin,
  flip: backflip,
  wiggle,
  pulse,
  float: floatUp,
  slam: dropSlam,
} as const;

export type AnimationName = keyof typeof ANIMATIONS;

export const ANIMATION_NAMES = Object.keys(ANIMATIONS) as AnimationName[];

export function pickRandom(): AnimationName {
  return ANIMATION_NAMES[Math.floor(Math.random() * ANIMATION_NAMES.length)];
}
