import { useState, useEffect, useCallback, useRef } from "react";
import { P, EASE } from "@/styles/tokens";
import { X, ChevronRight, ChevronLeft, Navigation, Users, Calculator, MessageSquare, PartyPopper } from "lucide-react";

const STORAGE_KEY = "od-onboarding-complete";
const STEP_KEY = "od-onboarding-step";
const SPOTLIGHT_PAD = 8;

interface WalkthroughStep {
  title: string;
  description: string;
  icon: typeof Navigation;
  targetSelector?: string;
  tooltipAnchor: "center" | "right" | "bottom-right";
}

const STEPS: WalkthroughStep[] = [
  {
    title: "Navigation Rail",
    description: "This sidebar is your control center. Access your dashboard, client book, calculators, meetings, and AI copilot — all one click away.",
    icon: Navigation,
    targetSelector: "[data-testid='nav-rail']",
    tooltipAnchor: "right",
  },
  {
    title: "Client Records",
    description: "Click any client row to expand quick details — status, sparkline, contact info — or open the full profile with a contextual sidebar for portfolio, tax strategy, estate planning, and more.",
    icon: Users,
    targetSelector: "[data-testid='link-nav-clients']",
    tooltipAnchor: "right",
  },
  {
    title: "Smart Calculators",
    description: "11 built-in calculators with AI interpretation panels. Run a Monte Carlo simulation or Roth conversion analysis, then let Finn explain the results and recommend next steps.",
    icon: Calculator,
    targetSelector: "[data-testid='link-nav-calculators']",
    tooltipAnchor: "right",
  },
  {
    title: "Finn AI Copilot",
    description: "Your AI assistant understands each client's full financial picture. Ask questions, get portfolio recommendations, or have Finn draft client communications — all in context.",
    icon: MessageSquare,
    targetSelector: "[data-testid='link-nav-fin-copilot']",
    tooltipAnchor: "right",
  },
  {
    title: "You're All Set!",
    description: "Explore at your own pace. Finn is always one click away in the sidebar. Start by opening a client record or running a quick calculator analysis.",
    icon: PartyPopper,
    tooltipAnchor: "center",
  },
];

function getTargetRect(selector?: string): DOMRect | null {
  if (!selector) return null;
  const selectors = selector.split(",").map(s => s.trim());
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el.getBoundingClientRect();
  }
  return null;
}

function SpotlightOverlay({ rect, opacity }: { rect: DOMRect | null; opacity: number }) {
  if (!rect) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(12,18,34,.55)",
          backdropFilter: "blur(2px)",
          opacity,
          transition: `opacity .3s ${EASE}`,
        }}
        data-testid="onboarding-overlay"
      />
    );
  }

  const sx = rect.left - SPOTLIGHT_PAD;
  const sy = rect.top - SPOTLIGHT_PAD;
  const sw = rect.width + SPOTLIGHT_PAD * 2;
  const sh = rect.height + SPOTLIGHT_PAD * 2;

  return (
    <svg
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 9998,
        opacity,
        transition: `opacity .3s ${EASE}`,
      }}
      data-testid="onboarding-overlay"
    >
      <defs>
        <mask id="spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect x={sx} y={sy} width={sw} height={sh} rx="8" fill="black" />
        </mask>
      </defs>
      <rect
        x="0" y="0" width="100%" height="100%"
        fill="rgba(12,18,34,.55)"
        mask="url(#spotlight-mask)"
        style={{ backdropFilter: "blur(2px)" }}
      />
      <rect
        x={sx} y={sy} width={sw} height={sh} rx="8"
        fill="none" stroke={P.blue} strokeWidth="2" strokeOpacity="0.5"
      />
    </svg>
  );
}

export function OnboardingWalkthrough() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done === "true") return;
    if (window.location.pathname.startsWith("/onboarding")) return;
    const saved = localStorage.getItem(STEP_KEY);
    if (saved) setStep(parseInt(saved, 10));
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const update = () => {
      const rect = getTargetRect(STEPS[step]?.targetSelector);
      setTargetRect(rect);
      rafRef.current = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(rafRef.current);
  }, [visible, step]);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.removeItem(STEP_KEY);
    }, 300);
  }, []);

  const next = useCallback(() => {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    localStorage.setItem(STEP_KEY, String(nextStep));
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step <= 0) return;
    const prevStep = step - 1;
    setStep(prevStep);
    localStorage.setItem(STEP_KEY, String(prevStep));
  }, [step]);

  // Escape key dismisses the walkthrough
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); dismiss(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, dismiss]);

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  let tooltipStyle: Record<string, any>;
  if (current.tooltipAnchor === "center" || !targetRect) {
    tooltipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  } else if (current.tooltipAnchor === "right") {
    tooltipStyle = {
      top: Math.max(16, targetRect.top),
      left: targetRect.right + SPOTLIGHT_PAD + 16,
    };
  } else {
    tooltipStyle = {
      top: targetRect.bottom + SPOTLIGHT_PAD + 16,
      right: 32,
    };
  }

  return (
    <>
      <SpotlightOverlay rect={targetRect} opacity={exiting ? 0 : 1} />

      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          pointerEvents: exiting ? "none" : "auto",
        }}
        onClick={dismiss}
      />

      <div
        style={{
          position: "fixed", zIndex: 9999,
          ...tooltipStyle,
          width: "min(400px, calc(100vw - 32px))",
          background: P.navy,
          borderRadius: 12,
          padding: 0,
          boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          opacity: exiting ? 0 : 1,
          transition: `all .3s ${EASE}`,
          pointerEvents: "auto",
        }}
        onClick={e => e.stopPropagation()}
        data-testid="onboarding-card"
      >
        <div style={{
          height: 3, borderRadius: "12px 12px 0 0", background: "rgba(255,255,255,.08)",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${progress}%`, height: "100%",
            background: `linear-gradient(90deg, ${P.blue}, ${P.bHi})`,
            transition: `width .3s ${EASE}`,
          }} />
        </div>

        <div style={{ padding: "24px 28px 20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `linear-gradient(135deg, ${P.blue}, ${P.bDk})`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon style={{ width: 20, height: 20, color: "#fff" }} />
            </div>
            <button
              onClick={dismiss}
              style={{
                border: "none", background: "none", cursor: "pointer",
                color: P.nMid, padding: 4,
              }}
              data-testid="button-onboarding-close"
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div style={{
            fontSize: 18, fontWeight: 600, color: P.nText,
            fontFamily: "'Cormorant Garamond', serif",
            marginBottom: 8, lineHeight: 1.3,
          }}>
            {current.title}
          </div>

          <div style={{
            fontSize: 13, color: P.nMid, lineHeight: 1.65,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {current.description}
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 28px 20px",
          borderTop: "1px solid rgba(255,255,255,.06)",
        }}>
          <div style={{ display: "flex", gap: 5 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === step ? P.blue : "rgba(255,255,255,.15)",
                  transition: `all .25s ${EASE}`,
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={dismiss}
              style={{
                border: "none", background: "none", cursor: "pointer",
                fontSize: 12, color: P.nMid, fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500, padding: "6px 10px",
              }}
              data-testid="button-onboarding-skip"
            >
              Skip tour
            </button>

            {!isFirst && (
              <button
                onClick={prev}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  border: `1px solid rgba(255,255,255,.12)`, borderRadius: 6,
                  background: "transparent", cursor: "pointer",
                  fontSize: 12, color: P.nText, fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 600, padding: "6px 14px",
                  transition: `all .15s ${EASE}`,
                }}
                data-testid="button-onboarding-prev"
              >
                <ChevronLeft style={{ width: 14, height: 14 }} /> Back
              </button>
            )}

            <button
              onClick={next}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                border: "none", borderRadius: 6,
                background: P.blue, cursor: "pointer",
                fontSize: 12, color: "#fff", fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600, padding: "6px 16px",
                transition: `all .15s ${EASE}`,
              }}
              data-testid="button-onboarding-next"
            >
              {isLast ? "Get Started" : "Next"} <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function useResetOnboarding() {
  return useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_KEY);
    window.location.reload();
  }, []);
}
