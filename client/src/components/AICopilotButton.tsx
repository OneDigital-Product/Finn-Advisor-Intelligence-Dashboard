"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { BRAIN_SVG } from "./ai-brain-svg";

/* ═══════════════════════════════════════════════════════════
 * AICopilotButton — Animated brain-chip button
 * Replaces the simple blue Brain icon with a full animated
 * brain with circuit traces, electricity, sparkles, and
 * spring-physics interactions.
 *
 * Security note: The BRAIN_SVG constant is a static asset
 * from ai-brain-icon.svg (a trusted file in the repo).
 * It contains only SVG path elements — no scripts or event handlers.
 * ═══════════════════════════════════════════════════════════ */

interface AICopilotButtonProps {
  onClick?: () => void;
  size?: number;
  showLabel?: boolean;
  showToast?: boolean;
  displayOnly?: boolean; // Always-active animated display, no interaction
}

const STAR = "M12 2L13.8 9.2L20 12L13.8 14.8L12 22L10.2 14.8L4 12L10.2 9.2Z";

const BURST_COLORS = [
  "#5CD4FF","#B5E85A","#FFD060","#FF8844","#FFF",
  "#5CD4FF","#B5E85A","#FFD060","#FF8844","#FFF",
  "#5CD4FF","#B5E85A","#FFD060","#FF8844","#FFF","#B5E85A",
];

const SPARKLE_ORBIT = [
  { r: 115, dur: 4.2, del: 0, c: "#5CD4FF" },
  { r: 118, dur: 5.1, del: 0.7, c: "#FFD060" },
  { r: 112, dur: 4.6, del: 1.4, c: "#B5E85A" },
  { r: 120, dur: 5.5, del: 2.1, c: "#FF8844" },
  { r: 110, dur: 4.8, del: 2.8, c: "#5CD4FF" },
  { r: 122, dur: 5.3, del: 3.5, c: "#B5E85A" },
  { r: 114, dur: 4.4, del: 4.2, c: "#FFD060" },
  { r: 119, dur: 5.8, del: 4.9, c: "#FF8844" },
];

const SPARKLE_FLOAT = [
  { x: "8%", y: "15%", dur: 3, del: 0.2, c: "#5CD4FF" },
  { x: "86%", y: "18%", dur: 2.6, del: 1, c: "#FF8844" },
  { x: "12%", y: "72%", dur: 2.8, del: 1.6, c: "#B5E85A" },
  { x: "84%", y: "75%", dur: 3.2, del: 0.5, c: "#FFD060" },
  { x: "48%", y: "4%", dur: 2.4, del: 2, c: "#5CD4FF" },
  { x: "44%", y: "92%", dur: 2.9, del: 1.2, c: "#B5E85A" },
];

const SPARKLE_TWINKLE = [
  { x: "3%", y: "40%", dur: 2.2, del: 0, c: "#5CD4FF" },
  { x: "94%", y: "38%", dur: 1.8, del: 0.8, c: "#FFD060" },
  { x: "22%", y: "8%", dur: 2.5, del: 1.5, c: "#B5E85A" },
  { x: "76%", y: "5%", dur: 2, del: 0.3, c: "#FF8844" },
  { x: "18%", y: "88%", dur: 1.9, del: 1.1, c: "#5CD4FF" },
  { x: "80%", y: "90%", dur: 2.3, del: 1.8, c: "#B5E85A" },
];

// Global CSS injected once for keyframe animations and SVG class selectors
const GLOBAL_STYLES = `
  @keyframes acb-shockOut{0%{transform:scale(.2);opacity:.9;border-width:3px;border-color:rgba(90,210,255,.7)}40%{border-color:rgba(142,185,53,.5)}100%{transform:scale(2);opacity:0;border-width:0;border-color:rgba(255,198,11,.2)}}
  @keyframes acb-shockOut2{0%{transform:scale(.3);opacity:.7;border-width:2px}100%{transform:scale(1.8);opacity:0;border-width:0}}
  @keyframes acb-burstOut{0%{transform:translate(-50%,-50%) scale(0) translate(0,0);opacity:1}30%{opacity:1;transform:translate(-50%,-50%) scale(1.3) translate(var(--tx),var(--ty))}100%{opacity:0;transform:translate(-50%,-50%) scale(.3) translate(calc(var(--tx)*1.6),calc(var(--ty)*1.6))}}
  @keyframes acb-flashPop{0%{opacity:1;transform:scale(.6)}100%{opacity:0;transform:scale(1.4)}}
  @keyframes acb-ambB{0%,100%{transform:scale(.95);opacity:.5}50%{transform:scale(1.1);opacity:1}}
  @keyframes acb-scanY{0%{top:-5%;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:105%;opacity:0}}
  @keyframes acb-cBeat{0%,100%{box-shadow:0 0 8px 2px rgba(90,210,255,.1),0 0 20px 4px rgba(142,185,53,.05)}25%{box-shadow:0 0 16px 6px rgba(90,210,255,.25),0 0 40px 12px rgba(142,185,53,.1),0 0 60px 20px rgba(242,101,34,.05)}50%{box-shadow:0 0 10px 3px rgba(90,210,255,.12),0 0 24px 6px rgba(142,185,53,.06)}75%{box-shadow:0 0 20px 8px rgba(90,210,255,.3),0 0 50px 16px rgba(142,185,53,.12),0 0 70px 24px rgba(255,198,11,.06)}}
  @keyframes acb-sO{0%{transform:rotate(0deg) translateX(var(--r)) rotate(0deg) scale(0);opacity:0}10%{opacity:1;transform:rotate(25deg) translateX(var(--r)) rotate(-25deg) scale(1)}90%{opacity:.6;transform:rotate(335deg) translateX(var(--r)) rotate(-335deg) scale(.6)}100%{transform:rotate(360deg) translateX(var(--r)) rotate(-360deg) scale(0);opacity:0}}
  @keyframes acb-sF{0%{transform:translateY(0) scale(0);opacity:0}15%{transform:translateY(-8px) scale(1.3);opacity:1}50%{transform:translateY(-22px) scale(.9);opacity:.7}85%{transform:translateY(-40px) scale(.4);opacity:.2}100%{transform:translateY(-50px) scale(0);opacity:0}}
  @keyframes acb-sT{0%,100%{opacity:.3;transform:scale(.6) rotate(0deg)}50%{opacity:1;transform:scale(1.2) rotate(20deg)}}
  @keyframes acb-eF{0%{stroke-dashoffset:400;opacity:0}5%{opacity:1}90%{opacity:.9}100%{stroke-dashoffset:-400;opacity:0}}
  @keyframes acb-eFR{0%{stroke-dashoffset:-400;opacity:0}5%{opacity:1}90%{opacity:.9}100%{stroke-dashoffset:400;opacity:0}}
  @keyframes acb-nP{0%,100%{r:4;opacity:.2}50%{r:9;opacity:1}}
  .acb-ep{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:18 14;stroke-dashoffset:400;opacity:0}
  .acb-ep2{fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:0;transition:opacity .6s}
  .acb-en{opacity:0;transition:opacity .5s}
  [data-copilot-active="true"] .acb-ep{animation:acb-eF 1.4s linear infinite}
  [data-copilot-active="true"] .acb-ep.acb-rv{animation:acb-eFR 1.4s linear infinite}
  [data-copilot-active="true"] .acb-ep2{opacity:.25}
  [data-copilot-active="true"] .acb-ep.acb-w2{animation-duration:2s}
  [data-copilot-active="true"] .acb-ep.acb-rv.acb-w2{animation-duration:2s}
  [data-copilot-active="true"] .acb-en{opacity:1;animation:acb-nP 1.2s ease-in-out infinite}
  [data-copilot-active="true"] .acb-t0{animation-delay:0s}
  [data-copilot-active="true"] .acb-t1{animation-delay:.1s}
  [data-copilot-active="true"] .acb-t2{animation-delay:.2s}
  [data-copilot-active="true"] .acb-t3{animation-delay:.3s}
  [data-copilot-active="true"] .acb-t4{animation-delay:.4s}
  [data-copilot-active="true"] .acb-t5{animation-delay:.5s}
  [data-copilot-active="true"] .acb-t6{animation-delay:.6s}
  [data-copilot-active="true"] .acb-t7{animation-delay:.7s}
  [data-copilot-active="true"] .acb-t8{animation-delay:.15s}
  [data-copilot-active="true"] .acb-t9{animation-delay:.25s}
  [data-copilot-active="true"] .acb-t10{animation-delay:.35s}
  [data-copilot-active="true"] .acb-t11{animation-delay:.45s}
`;

let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-acb", "");
  style.textContent = GLOBAL_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

function ElectricitySVG() {
  return (
    <svg viewBox="0 0 928 1129" style={{ width: "100%", height: "100%" }}>
      <defs>
        <filter id="gB" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="gO" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="gG" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* BLUE traces */}
      <g stroke="rgba(90,210,255,.12)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline className="acb-ep2" points="430,490 430,420 380,370 380,265 340,220"/>
        <polyline className="acb-ep2" points="415,510 345,510 295,460 215,460"/>
        <polyline className="acb-ep2" points="420,475 390,440 330,440 290,395 230,395"/>
        <polyline className="acb-ep2" points="410,540 335,540 290,495 225,495 170,540"/>
        <polyline className="acb-ep2" points="380,370 320,370 280,320"/>
        <polyline className="acb-ep2" points="450,470 450,400 410,355"/>
      </g>
      <g filter="url(#gB)" stroke="#5CD4FF" strokeWidth="4" fill="none">
        <polyline className="acb-ep acb-t0" points="430,490 430,420 380,370 380,265 340,220"/>
        <polyline className="acb-ep acb-t1" points="415,510 345,510 295,460 215,460"/>
        <polyline className="acb-ep acb-t2" points="420,475 390,440 330,440 290,395 230,395"/>
        <polyline className="acb-ep acb-t3" points="410,540 335,540 290,495 225,495 170,540"/>
        <polyline className="acb-ep acb-t4" points="380,370 320,370 280,320"/>
        <polyline className="acb-ep acb-t5" points="450,470 450,400 410,355"/>
      </g>
      <g filter="url(#gB)" stroke="#5CD4FF" strokeWidth="3" opacity=".4" fill="none">
        <polyline className="acb-ep acb-w2 acb-t3" points="430,490 430,420 380,370 380,265 340,220"/>
        <polyline className="acb-ep acb-w2 acb-t5" points="415,510 345,510 295,460 215,460"/>
      </g>
      <g fill="#5CD4FF" filter="url(#gB)">
        <circle className="acb-en" cx="340" cy="220" r="5" style={{animationDelay:"0s"}}/>
        <circle className="acb-en" cx="215" cy="460" r="5" style={{animationDelay:".2s"}}/>
        <circle className="acb-en" cx="230" cy="395" r="5" style={{animationDelay:".4s"}}/>
        <circle className="acb-en" cx="170" cy="540" r="5" style={{animationDelay:".6s"}}/>
        <circle className="acb-en" cx="280" cy="320" r="5" style={{animationDelay:".1s"}}/>
        <circle className="acb-en" cx="410" cy="355" r="5" style={{animationDelay:".3s"}}/>
      </g>
      {/* ORANGE traces */}
      <g stroke="rgba(255,180,84,.12)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline className="acb-ep2" points="500,490 500,420 550,370 550,265 590,220"/>
        <polyline className="acb-ep2" points="515,510 585,510 635,460 715,460"/>
        <polyline className="acb-ep2" points="510,475 540,440 600,440 640,395 700,395"/>
        <polyline className="acb-ep2" points="520,540 595,540 640,495 705,495 760,540"/>
        <polyline className="acb-ep2" points="550,370 610,370 650,320"/>
        <polyline className="acb-ep2" points="480,470 480,400 520,355"/>
      </g>
      <g filter="url(#gO)" stroke="#FFB454" strokeWidth="4" fill="none">
        <polyline className="acb-ep acb-t6" points="500,490 500,420 550,370 550,265 590,220"/>
        <polyline className="acb-ep acb-t7" points="515,510 585,510 635,460 715,460"/>
        <polyline className="acb-ep acb-t8" points="510,475 540,440 600,440 640,395 700,395"/>
        <polyline className="acb-ep acb-t9" points="520,540 595,540 640,495 705,495 760,540"/>
        <polyline className="acb-ep acb-t10" points="550,370 610,370 650,320"/>
        <polyline className="acb-ep acb-t11" points="480,470 480,400 520,355"/>
      </g>
      <g filter="url(#gO)" stroke="#FFB454" strokeWidth="3" opacity=".4" fill="none">
        <polyline className="acb-ep acb-w2 acb-t9" points="500,490 500,420 550,370 550,265 590,220"/>
        <polyline className="acb-ep acb-w2 acb-t11" points="515,510 585,510 635,460 715,460"/>
      </g>
      <g fill="#FFB454" filter="url(#gO)">
        <circle className="acb-en" cx="590" cy="220" r="5" style={{animationDelay:".1s"}}/>
        <circle className="acb-en" cx="715" cy="460" r="5" style={{animationDelay:".3s"}}/>
        <circle className="acb-en" cx="700" cy="395" r="5" style={{animationDelay:".5s"}}/>
        <circle className="acb-en" cx="760" cy="540" r="5" style={{animationDelay:".7s"}}/>
        <circle className="acb-en" cx="650" cy="320" r="5" style={{animationDelay:".2s"}}/>
        <circle className="acb-en" cx="520" cy="355" r="5" style={{animationDelay:".4s"}}/>
      </g>
      {/* GREEN traces */}
      <g stroke="rgba(181,232,90,.12)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline className="acb-ep2" points="430,650 430,710 380,760 380,840 320,890"/>
        <polyline className="acb-ep2" points="420,670 355,670 310,720 245,720 185,760"/>
        <polyline className="acb-ep2" points="410,640 355,640 300,690 240,690 180,730"/>
        <polyline className="acb-ep2" points="445,680 445,760 410,810 410,870 385,920"/>
        <polyline className="acb-ep2" points="435,695 385,740 330,740 285,790 245,790"/>
        <polyline className="acb-ep2" points="500,650 500,710 550,760 550,840 610,890"/>
        <polyline className="acb-ep2" points="510,670 575,670 620,720 685,720 745,760"/>
        <polyline className="acb-ep2" points="520,640 575,640 630,690 690,690 750,730"/>
        <polyline className="acb-ep2" points="485,680 485,760 520,810 520,870 545,920"/>
        <polyline className="acb-ep2" points="495,695 545,740 600,740 645,790 685,790"/>
      </g>
      <g filter="url(#gG)" stroke="#B5E85A" strokeWidth="4" fill="none">
        <polyline className="acb-ep acb-rv acb-t0" points="430,650 430,710 380,760 380,840 320,890"/>
        <polyline className="acb-ep acb-rv acb-t2" points="420,670 355,670 310,720 245,720 185,760"/>
        <polyline className="acb-ep acb-rv acb-t4" points="410,640 355,640 300,690 240,690 180,730"/>
        <polyline className="acb-ep acb-rv acb-t6" points="445,680 445,760 410,810 410,870 385,920"/>
        <polyline className="acb-ep acb-rv acb-t8" points="435,695 385,740 330,740 285,790 245,790"/>
        <polyline className="acb-ep acb-rv acb-t1" points="500,650 500,710 550,760 550,840 610,890"/>
        <polyline className="acb-ep acb-rv acb-t3" points="510,670 575,670 620,720 685,720 745,760"/>
        <polyline className="acb-ep acb-rv acb-t5" points="520,640 575,640 630,690 690,690 750,730"/>
        <polyline className="acb-ep acb-rv acb-t7" points="485,680 485,760 520,810 520,870 545,920"/>
        <polyline className="acb-ep acb-rv acb-t9" points="495,695 545,740 600,740 645,790 685,790"/>
      </g>
      <g filter="url(#gG)" stroke="#B5E85A" strokeWidth="3" opacity=".4" fill="none">
        <polyline className="acb-ep acb-rv acb-w2 acb-t4" points="430,650 430,710 380,760 380,840 320,890"/>
        <polyline className="acb-ep acb-rv acb-w2 acb-t8" points="500,650 500,710 550,760 550,840 610,890"/>
      </g>
      <g fill="#B5E85A" filter="url(#gG)">
        <circle className="acb-en" cx="320" cy="890" r="5" style={{animationDelay:"0s"}}/>
        <circle className="acb-en" cx="185" cy="760" r="5" style={{animationDelay:".2s"}}/>
        <circle className="acb-en" cx="180" cy="730" r="5" style={{animationDelay:".4s"}}/>
        <circle className="acb-en" cx="385" cy="920" r="5" style={{animationDelay:".6s"}}/>
        <circle className="acb-en" cx="245" cy="790" r="5" style={{animationDelay:".1s"}}/>
        <circle className="acb-en" cx="610" cy="890" r="5" style={{animationDelay:".3s"}}/>
        <circle className="acb-en" cx="745" cy="760" r="5" style={{animationDelay:".5s"}}/>
        <circle className="acb-en" cx="750" cy="730" r="5" style={{animationDelay:".7s"}}/>
        <circle className="acb-en" cx="545" cy="920" r="5" style={{animationDelay:".15s"}}/>
        <circle className="acb-en" cx="685" cy="790" r="5" style={{animationDelay:".35s"}}/>
      </g>
    </svg>
  );
}

export function AICopilotButton({
  onClick,
  size = 64,
  showLabel = false,
  showToast = true,
  displayOnly = false,
}: AICopilotButtonProps) {
  const [active, setActive] = useState(displayOnly);
  const [pressed, setPressed] = useState(false);
  const [popping, setPopping] = useState(false);
  const [settling, setSettling] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastText, setToastText] = useState("");
  const [shockFired, setShockFired] = useState(false);
  const [flashFired, setFlashFired] = useState(false);
  const [burstDots, setBurstDots] = useState<React.ReactNode[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const pointerHandled = useRef(false);
  const height = Math.round(size * (268 / 220));

  // Draggable state
  const [pos, setPos] = useState<{ right: number; bottom: number }>(() => {
    if (typeof window === "undefined") return { right: 24, bottom: 24 };
    try {
      const saved = localStorage.getItem("od-copilot-pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { right: 24, bottom: 24 };
  });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, right: 0, bottom: 0 });
  const dragMoved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { injectStyles(); }, []);

  const fireShock = useCallback(() => {
    setShockFired(false);
    setFlashFired(false);
    requestAnimationFrame(() => {
      setShockFired(true);
      setFlashFired(true);
    });
  }, []);

  const spawnBurst = useCallback(() => {
    const dots = Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const dist = 60 + Math.random() * 50;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const s = 3 + Math.random() * 5;
      return (
        <div
          key={`${Date.now()}-${i}`}
          style={{
            position: "absolute" as const, top: "50%", left: "50%",
            width: s, height: s, borderRadius: "50%",
            background: BURST_COLORS[i % BURST_COLORS.length],
            transform: "translate(-50%,-50%) scale(0)", opacity: 0,
            animation: "acb-burstOut .6s cubic-bezier(.1,.8,.2,1) forwards",
            animationDelay: `${Math.random() * 0.08}s`,
            // @ts-ignore — CSS custom properties
            "--tx": `${tx}px`, "--ty": `${ty}px`,
          }}
        />
      );
    });
    setBurstDots(dots);
  }, []);

  // Drag handling — uses right/bottom positioning
  // Moving mouse RIGHT = dx positive = right DECREASES
  // Moving mouse DOWN = dy positive = bottom DECREASES
  const onDragStart = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, right: pos.right, bottom: pos.bottom };
    // Capture on the container div, not the target (could be SVG child)
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [pos]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragMoved.current = true;
    if (!dragMoved.current) return;
    // right decreases as mouse moves right, bottom decreases as mouse moves down
    const newRight = Math.max(8, Math.min(window.innerWidth - size - 8, dragStart.current.right - dx));
    const newBottom = Math.max(8, Math.min(window.innerHeight - height - 8, dragStart.current.bottom - dy));
    setPos({ right: newRight, bottom: newBottom });
  }, [size, height]);

  const onDragEnd = useCallback(() => {
    if (dragging.current && dragMoved.current) {
      try { localStorage.setItem("od-copilot-pos", JSON.stringify(pos)); } catch {}
    }
    dragging.current = false;
  }, [pos]);

  const handlePointerDown = (e: React.PointerEvent) => {
    onDragStart(e);
    setPressed(true);
    setPopping(false);
    setSettling(false);
  };

  const handleActivation = () => {
    const newActive = !active;
    setActive(newActive);

    // Fire visual effects immediately
    fireShock();
    spawnBurst();

    if (showToast) {
      const msg = newActive ? "AI Copilot Activated" : "AI Copilot Deactivated";
      setToastText(msg);
      setToastVisible(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), 2000);
    }

    // Delay onClick so effects are visible before component potentially unmounts
    setTimeout(() => onClick?.(), 350);
  };

  const handlePointerUp = () => {
    onDragEnd();
    setPressed(false);
    if (dragMoved.current) {
      dragMoved.current = false;
      return; // Was a drag, not a click
    }
    setPopping(true);
    setTimeout(() => { setPopping(false); setSettling(true); }, 200);
    setTimeout(() => setSettling(false), 600);
    pointerHandled.current = true;
    handleActivation();
  };

  const handleClick = () => {
    // Fallback for environments where pointer events don't fire (e.g. automated tools)
    if (pointerHandled.current) {
      pointerHandled.current = false;
      return; // Already handled by pointerUp
    }
    handleActivation();
  };

  const handlePointerLeave = () => setPressed(false);

  const btnTransform = pressed
    ? "scale(.88)"
    : popping
    ? "scale(1.12)"
    : settling
    ? "scale(1)"
    : undefined;

  const btnTransition = pressed
    ? "transform .08s ease-in"
    : popping
    ? "transform .2s cubic-bezier(.17,.67,.21,1.4)"
    : settling
    ? "transform .4s cubic-bezier(.34,1.56,.64,1)"
    : "transform .15s cubic-bezier(.2,1,.3,1)";

  // The BRAIN_SVG is a static trusted asset (ai-brain-icon.svg from the repo),
  // containing only SVG path/circle elements with no scripts or event handlers.
  const brainHtml = { __html: BRAIN_SVG };

  // Display-only mode: render just the animated brain inline, always active
  if (displayOnly) {
    return (
      <div
        data-copilot-active="true"
        style={{ position: "relative", width: size, height, display: "inline-block" }}
      >
        {/* Ambient glow */}
        <div style={{
          position: "absolute", inset: -20, borderRadius: "50%",
          pointerEvents: "none" as const, zIndex: 0, opacity: 1,
          background: "radial-gradient(circle,rgba(26,150,191,.08) 10%,rgba(142,185,53,.05) 28%,rgba(242,101,34,.02) 42%,transparent 58%)",
          animation: "acb-ambB 5s ease-in-out infinite",
        }} />
        {/* Sparkles */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" as const, opacity: 1, zIndex: 6 }}>
          {SPARKLE_ORBIT.slice(0, 4).map((s, i) => (
            <div key={`o${i}`} style={{
              position: "absolute", top: "50%", left: "50%",
              margin: "-5px 0 0 -5px", width: 10, height: 10,
              animation: `acb-sO ${s.dur}s linear infinite`,
              animationDelay: `${s.del}s`,
              // @ts-ignore
              "--r": `${s.r * size / 220}px`,
            }}>
              <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%" }}>
                <path d={STAR} fill={s.c} opacity=".85" />
              </svg>
            </div>
          ))}
        </div>
        {/* Scan line */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none" as const,
          opacity: 1, zIndex: 4, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", left: "5%", right: "5%", height: 1,
            background: "linear-gradient(90deg,transparent,rgba(90,210,255,.25),rgba(142,185,53,.35),rgba(90,210,255,.25),transparent)",
            animation: "acb-scanY 3.5s ease-in-out infinite",
            filter: "blur(1px)",
          }} />
        </div>
        {/* Electricity */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none" as const,
          opacity: 1, zIndex: 3,
        }}>
          <ElectricitySVG />
        </div>
        {/* Chip pulse */}
        <div style={{
          position: "absolute", top: "33.5%", left: "31.5%", width: "37%", height: "30%",
          borderRadius: 8, pointerEvents: "none" as const,
          opacity: 1, zIndex: 4,
          animation: "acb-cBeat 2.4s ease-in-out infinite",
        }} />
        {/* Brain SVG */}
        <div
          style={{
            width: "100%", height: "100%", position: "relative", zIndex: 2,
            filter: "drop-shadow(0 0 6px rgba(90,210,255,.12)) drop-shadow(0 0 16px rgba(142,185,53,.06))",
          }}
          dangerouslySetInnerHTML={brainHtml}
        />
      </div>
    );
  }

  return (
    <>
      {showToast && (
        <div style={{
          position: "fixed", top: 30, left: "50%",
          padding: "10px 28px", borderRadius: 100,
          fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" as const,
          color: "#B5E85A",
          background: "rgba(142,185,53,.08)",
          border: "1px solid rgba(142,185,53,.2)",
          backdropFilter: "blur(12px)",
          transform: toastVisible ? "translate(-50%, 0)" : "translate(-50%, -60px)",
          opacity: toastVisible ? 1 : 0,
          transition: "all .5s cubic-bezier(.34,1.56,.64,1)",
          pointerEvents: "none" as const, zIndex: 9999,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}>
          {toastText}
        </div>
      )}

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={onDragMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{ position: "fixed", bottom: pos.bottom, right: pos.right, zIndex: 50, touchAction: "none", cursor: "grab" }}
      >
        <button
          data-copilot-active={active ? "true" : "false"}
          data-testid="button-finn-sidecar-open"
          title="Open Finn (⌘J) — drag to reposition"
          onClick={handleClick}
          style={{
            position: "relative", width: size, height,
            cursor: "pointer", background: "none", border: "none", outline: "none",
            WebkitTapHighlightColor: "transparent",
            transform: btnTransform, transition: btnTransition,
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: "absolute", inset: -60, borderRadius: "50%",
            pointerEvents: "none" as const, zIndex: 0,
            opacity: active ? 1 : 0, transition: "opacity .6s",
            background: active ? "radial-gradient(circle,rgba(26,150,191,.05) 10%,rgba(142,185,53,.035) 28%,rgba(242,101,34,.015) 42%,transparent 58%)" : undefined,
            animation: active ? "acb-ambB 5s ease-in-out infinite" : undefined,
          }} />

          {/* Hover ring */}
          <div style={{
            position: "absolute", inset: -12, borderRadius: "50%",
            border: "1.5px solid rgba(142,185,53,.15)",
            pointerEvents: "none" as const, opacity: 0,
            transform: "scale(.94)", transition: "opacity .3s, transform .3s",
          }} />

          {/* Shockwaves */}
          <div style={{
            position: "absolute", inset: "10%", borderRadius: "50%",
            border: "2px solid rgba(90,210,255,.5)",
            pointerEvents: "none" as const, opacity: 0, zIndex: 10,
            transform: "scale(.2)",
            animation: shockFired ? "acb-shockOut .7s cubic-bezier(0,.5,.2,1) forwards" : undefined,
          }} />
          <div style={{
            position: "absolute", inset: "15%", borderRadius: "50%",
            border: "1.5px solid rgba(142,185,53,.4)",
            pointerEvents: "none" as const, opacity: 0, zIndex: 10,
            transform: "scale(.3)",
            animation: shockFired ? "acb-shockOut2 .9s cubic-bezier(0,.5,.2,1) forwards .08s" : undefined,
          }} />

          {/* Flash */}
          <div style={{
            position: "absolute", inset: "20%", borderRadius: "50%",
            background: "radial-gradient(circle,rgba(255,255,255,.2) 0%,transparent 70%)",
            pointerEvents: "none" as const, opacity: 0, zIndex: 8,
            mixBlendMode: "overlay" as const,
            animation: flashFired ? "acb-flashPop .4s ease-out forwards" : undefined,
          }} />

          {/* Burst particles */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" as const, zIndex: 9 }}>
            {burstDots}
          </div>

          {/* Sparkles */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none" as const,
            opacity: active ? 1 : 0, zIndex: 6, transition: "opacity .5s",
          }}>
            {SPARKLE_ORBIT.map((s, i) => (
              <div key={`o${i}`} style={{
                position: "absolute", top: "50%", left: "50%",
                margin: "-7px 0 0 -7px", width: 14, height: 14,
                animation: `acb-sO ${s.dur}s linear infinite`,
                animationDelay: `${s.del}s`,
                // @ts-ignore
                "--r": `${s.r}px`,
              }}>
                <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%" }}>
                  <path d={STAR} fill={s.c} opacity=".85" />
                </svg>
              </div>
            ))}
            {SPARKLE_FLOAT.map((s, i) => (
              <div key={`f${i}`} style={{
                position: "absolute", top: s.y, left: s.x, width: 10, height: 10,
                animation: `acb-sF ${s.dur}s ease-out infinite`,
                animationDelay: `${s.del}s`,
              }}>
                <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%" }}>
                  <path d={STAR} fill={s.c} opacity=".5" />
                </svg>
              </div>
            ))}
            {SPARKLE_TWINKLE.map((s, i) => (
              <div key={`t${i}`} style={{
                position: "absolute", top: s.y, left: s.x, width: 8, height: 8,
                animation: `acb-sT ${s.dur}s ease-in-out infinite`,
                animationDelay: `${s.del}s`,
              }}>
                <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%" }}>
                  <path d={STAR} fill={s.c} opacity=".35" />
                </svg>
              </div>
            ))}
          </div>

          {/* Scan line */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none" as const,
            opacity: active ? 1 : 0, zIndex: 4, overflow: "hidden", transition: "opacity .5s",
          }}>
            {active && (
              <div style={{
                position: "absolute", left: "5%", right: "5%", height: 2,
                background: "linear-gradient(90deg,transparent,rgba(90,210,255,.25),rgba(142,185,53,.35),rgba(90,210,255,.25),transparent)",
                animation: "acb-scanY 3.5s ease-in-out infinite",
                filter: "blur(1px)",
              }} />
            )}
          </div>

          {/* Electricity overlay */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none" as const,
            opacity: active ? 1 : 0, zIndex: 3, transition: "opacity .4s",
          }}>
            <ElectricitySVG />
          </div>

          {/* Chip heartbeat pulse */}
          <div style={{
            position: "absolute", top: "33.5%", left: "31.5%", width: "37%", height: "30%",
            borderRadius: 14, pointerEvents: "none" as const,
            opacity: active ? 1 : 0, zIndex: 4, transition: "opacity .5s",
            animation: active ? "acb-cBeat 2.4s ease-in-out infinite" : undefined,
          }} />

          {/* Brain SVG */}
          <div
            style={{
              width: "100%", height: "100%", position: "relative", zIndex: 2,
              transition: "filter .3s",
              filter: active
                ? "drop-shadow(0 0 6px rgba(90,210,255,.12)) drop-shadow(0 0 16px rgba(142,185,53,.06))"
                : undefined,
            }}
            dangerouslySetInnerHTML={brainHtml}
          />
        </button>

        {showLabel && (
          <div style={{
            marginTop: 24, fontSize: 11, fontWeight: 600,
            letterSpacing: 2.5, textTransform: "uppercase" as const,
            color: active ? "#8EB935" : "#2a2a3a",
            textShadow: active ? "0 0 12px rgba(142,185,53,.4)" : undefined,
            transition: "all .4s", userSelect: "none" as const,
            textAlign: "center" as const,
          }}>
            {active ? "AI Copilot Active" : "Summon AI Copilot"}
          </div>
        )}
      </div>
    </>
  );
}
