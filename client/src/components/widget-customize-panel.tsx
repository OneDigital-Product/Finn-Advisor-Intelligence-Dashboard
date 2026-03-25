/**
 * Widget Customize Panel
 *
 * Reusable popover for toggling widget visibility and reordering.
 * Used across dashboard, client overview, client portfolio, etc.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronUp, ChevronDown, RotateCcw, Settings } from "lucide-react";
import { P } from "@/styles/tokens";
import type { useWidgetConfig } from "@/hooks/use-widget-config";

const OD = {
  bgMed: P.odSurf, border: P.odBorder, text1: P.odT1, text2: P.odT2,
  text3: P.odT3, lightBlue: P.odLBlue, medGreen: P.odGreen,
};

interface Props {
  /** Title shown in the panel header */
  title?: string;
  /** The widget config hook return value */
  widgetConfig: ReturnType<typeof useWidgetConfig>;
  /** Open state control */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WidgetCustomizePanel({ title = "Customize Widgets", widgetConfig, open, onOpenChange }: Props) {
  const { allWidgetsSorted, toggle, moveUp, moveDown, reset } = widgetConfig;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: open ? OD.lightBlue : "transparent",
            border: `1px solid ${open ? OD.lightBlue : OD.border}`,
            borderRadius: 5, padding: "4px 10px",
            fontSize: 10, fontWeight: 600,
            color: open ? "#fff" : OD.text3,
            cursor: "pointer", transition: "all .15s", letterSpacing: ".04em",
          }}
          data-testid="widget-customize-trigger"
        >
          <Settings style={{ width: 12, height: 12 }} />
          Customize
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[320px] p-0"
        style={{
          background: OD.bgMed, border: `1px solid ${OD.border}`,
          borderRadius: 8, padding: "16px 20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header */}
        <div style={{
          fontSize: 12, fontWeight: 600, color: OD.text1, marginBottom: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span>{title}</span>
          <button
            onClick={reset}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10, color: OD.lightBlue, background: "none", border: "none",
              cursor: "pointer", fontWeight: 500,
            }}
            data-testid="widget-reset-all"
          >
            <RotateCcw style={{ width: 10, height: 10 }} />
            Reset
          </button>
        </div>

        {/* Widget list */}
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {allWidgetsSorted.map((widget, idx) => (
            <div
              key={widget.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 0",
                borderBottom: `1px solid rgba(45,55,72,0.25)`,
                opacity: widget.visible ? 1 : 0.5,
              }}
              data-testid={`widget-row-${widget.id}`}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: widget.visible ? OD.text2 : OD.text3 }}>
                  {widget.label}
                </span>
                {widget.description && (
                  <div style={{ fontSize: 9, color: OD.text3, marginTop: 1, lineHeight: 1.3 }}>
                    {widget.description}
                  </div>
                )}
              </div>

              {/* Reorder arrows */}
              <div style={{ display: "flex", flexDirection: "column", marginRight: 8 }}>
                <button
                  onClick={() => moveUp(widget.id)}
                  disabled={idx === 0}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: idx === 0 ? "default" : "pointer",
                    color: idx === 0 ? "rgba(148,163,184,0.2)" : OD.text3,
                  }}
                  data-testid={`widget-move-up-${widget.id}`}
                >
                  <ChevronUp style={{ width: 12, height: 12 }} />
                </button>
                <button
                  onClick={() => moveDown(widget.id)}
                  disabled={idx === allWidgetsSorted.length - 1}
                  style={{
                    background: "none", border: "none", padding: 0,
                    cursor: idx === allWidgetsSorted.length - 1 ? "default" : "pointer",
                    color: idx === allWidgetsSorted.length - 1 ? "rgba(148,163,184,0.2)" : OD.text3,
                  }}
                  data-testid={`widget-move-down-${widget.id}`}
                >
                  <ChevronDown style={{ width: 12, height: 12 }} />
                </button>
              </div>

              {/* Toggle */}
              <button
                onClick={() => toggle(widget.id)}
                style={{
                  width: 36, height: 20, borderRadius: 10, border: "none",
                  background: widget.visible ? OD.medGreen : "rgba(148,163,184,0.2)",
                  position: "relative", cursor: "pointer", transition: "background .2s",
                  flexShrink: 0,
                }}
                data-testid={`widget-toggle-${widget.id}`}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#fff", position: "absolute", top: 2,
                  left: widget.visible ? 18 : 2,
                  transition: "left .2s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                }} />
              </button>
            </div>
          ))}
        </div>

        {/* Footer count */}
        <div style={{
          marginTop: 10, fontSize: 10, color: OD.text3, textAlign: "center",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {allWidgetsSorted.filter(w => w.visible).length}/{allWidgetsSorted.length} widgets visible
        </div>
      </PopoverContent>
    </Popover>
  );
}
