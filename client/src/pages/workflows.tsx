import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Pencil,
  Trash2,
  ListChecks,
  GitBranch,
  ChevronRight,
  X,
  Type,
  List,
  Circle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MessageSquare,
  ClipboardCheck,
  LayoutGrid,
  LayoutList,
  ArrowDown,
  ArrowRight,
} from "lucide-react";

type TaskConfig = {
  createTask: boolean;
  taskTitle?: string;
  taskType?: string;
  dueDateOffset?: number;
};

type TemplateStep = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  outputType: "none" | "freetext" | "choice";
  choices: string[];
  connections: Record<string, string>;
  x: number;
  y: number;
  taskConfig?: TaskConfig;
};

type WorkflowTemplate = {
  id: string;
  advisorId: string;
  name: string;
  description: string | null;
  category: string;
  steps: TemplateStep[];
  createdAt: string;
};

const categoryLabels: Record<string, string> = {
  onboarding: "Onboarding",
  review: "Review",
  planning: "Planning",
  operations: "Operations",
  compliance: "Compliance",
  general: "General",
};

const categoryColors: Record<string, string> = {
  onboarding: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  review: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  planning: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  operations: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  compliance: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

let stepIdCounter = 0;
function genStepId() {
  return `step_${Date.now()}_${++stepIdCounter}`;
}

const taskTypeLabels: Record<string, string> = {
  general: "General",
  follow_up: "Follow-up",
  account_opening: "Account Opening",
  document_request: "Document Request",
  rebalancing: "Rebalancing",
  insurance: "Insurance",
  estate_planning: "Estate Planning",
  tax_planning: "Tax Planning",
  compliance: "Compliance",
};

function normalizeSteps(rawSteps: any[]): TemplateStep[] {
  return (rawSteps || []).map((s: any, i: number) => ({
    id: s.id || genStepId(),
    stepNumber: s.stepNumber || i + 1,
    title: s.title || "",
    description: s.description || "",
    outputType: s.outputType || "none",
    choices: s.choices || [],
    connections: s.connections || {},
    x: s.x ?? 100 + (i % 3) * 280,
    y: s.y ?? 80 + Math.floor(i / 3) * 200,
    taskConfig: s.taskConfig || undefined,
  }));
}

const NODE_W = 240;
const NODE_H_BASE = 100;

function getNodeHeight(step: TemplateStep) {
  let h = NODE_H_BASE;
  if (step.outputType === "choice") h += step.choices.length * 24 + 8;
  else if (step.outputType === "freetext") h += 28;
  return h;
}

function getPortPos(
  step: TemplateStep,
  portKey: string,
  allSteps: TemplateStep[]
): { x: number; y: number } {
  if (portKey === "next" || portKey === "freetext") {
    const h = getNodeHeight(step);
    return { x: step.x + NODE_W / 2, y: step.y + h };
  }
  const idx = step.choices.indexOf(portKey);
  const baseY = NODE_H_BASE + 4;
  return {
    x: step.x + NODE_W,
    y: step.y + baseY + idx * 24 + 12,
  };
}

function getInputPortPos(step: TemplateStep): { x: number; y: number } {
  return { x: step.x + NODE_W / 2, y: step.y };
}

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dy = y2 - y1;
  const dx = x2 - x1;
  const cy = Math.max(40, Math.abs(dy) * 0.5);
  const cx = Math.abs(dx) * 0.3;
  if (Math.abs(dy) > Math.abs(dx) * 0.3) {
    return `M${x1},${y1} C${x1},${y1 + cy} ${x2},${y2 - cy} ${x2},${y2}`;
  }
  return `M${x1},${y1} C${x1 + cx},${y1 + cy} ${x2 - cx},${y2 - cy} ${x2},${y2}`;
}

function StepNodeEditor({
  step,
  onUpdate,
  onClose,
}: {
  step: TemplateStep;
  onUpdate: (s: TemplateStep) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<TemplateStep>({ ...step, choices: [...step.choices] });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="node-title" className="text-xs">Title</Label>
        <Input
          id="node-title"
          value={local.title}
          onChange={(e) => setLocal({ ...local, title: e.target.value })}
          placeholder="Step title"
          data-testid="input-node-title"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="node-description" className="text-xs">Description</Label>
        <Textarea
          id="node-description"
          value={local.description}
          onChange={(e) => setLocal({ ...local, description: e.target.value })}
          placeholder="Step description"
          rows={2}
          data-testid="input-node-description"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="node-output-type" className="text-xs">Output Type</Label>
        <Select
          value={local.outputType}
          onValueChange={(v) => {
            const ot = v as "none" | "freetext" | "choice";
            const newChoices = ot === "choice" && local.choices.length === 0 ? ["Option A", "Option B"] : local.choices;
            const newConnections = { ...local.connections };
            if (ot === "none") {
              Object.keys(newConnections).forEach((k) => {
                if (k !== "next") delete newConnections[k];
              });
            } else if (ot === "freetext") {
              Object.keys(newConnections).forEach((k) => {
                if (k !== "next" && k !== "freetext") delete newConnections[k];
              });
            }
            setLocal({ ...local, outputType: ot, choices: ot === "choice" ? newChoices : [], connections: newConnections });
          }}
        >
          <SelectTrigger id="node-output-type" data-testid="select-output-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (simple checkbox)</SelectItem>
            <SelectItem value="freetext">Free Text Response</SelectItem>
            <SelectItem value="choice">Multiple Choice (branching)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {local.outputType === "choice" && (
        <div className="space-y-2">
          <Label className="text-xs">Choices</Label>
          {local.choices.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={c}
                onChange={(e) => {
                  const nc = [...local.choices];
                  const oldVal = nc[i];
                  nc[i] = e.target.value;
                  const newConn = { ...local.connections };
                  if (newConn[oldVal] !== undefined) {
                    newConn[e.target.value] = newConn[oldVal];
                    delete newConn[oldVal];
                  }
                  setLocal({ ...local, choices: nc, connections: newConn });
                }}
                placeholder={`Choice ${i + 1}`}
                data-testid={`input-choice-${i}`}
              />
              {local.choices.length > 2 && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const nc = local.choices.filter((_, j) => j !== i);
                    const newConn = { ...local.connections };
                    delete newConn[local.choices[i]];
                    setLocal({ ...local, choices: nc, connections: newConn });
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocal({ ...local, choices: [...local.choices, `Option ${local.choices.length + 1}`] })}
            data-testid="button-add-choice"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Choice
          </Button>
        </div>
      )}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <ClipboardCheck className="w-3 h-3" />
            Create task on completion
          </Label>
          <Switch
            checked={local.taskConfig?.createTask ?? false}
            onCheckedChange={(checked) =>
              setLocal({
                ...local,
                taskConfig: {
                  ...(local.taskConfig || { createTask: false }),
                  createTask: checked,
                },
              })
            }
            data-testid="switch-create-task"
          />
        </div>
        {local.taskConfig?.createTask && (
          <div className="space-y-2 pl-1">
            <div className="space-y-1">
              <Label htmlFor="node-task-title" className="text-[10px] text-muted-foreground">Task Title</Label>
              <Input
                id="node-task-title"
                value={local.taskConfig?.taskTitle ?? ""}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    taskConfig: { ...local.taskConfig!, taskTitle: e.target.value },
                  })
                }
                placeholder={local.title ? `Follow up: ${local.title}` : "Task title..."}
                className="h-7 text-xs"
                data-testid="input-task-title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="node-task-type" className="text-[10px] text-muted-foreground">Task Type</Label>
              <Select
                value={local.taskConfig?.taskType ?? "general"}
                onValueChange={(v) =>
                  setLocal({
                    ...local,
                    taskConfig: { ...local.taskConfig!, taskType: v },
                  })
                }
              >
                <SelectTrigger id="node-task-type" className="h-7 text-xs" data-testid="select-task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(taskTypeLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="node-due-offset" className="text-[10px] text-muted-foreground">Due Date Offset (days)</Label>
              <Input
                id="node-due-offset"
                type="number"
                min={0}
                value={local.taskConfig?.dueDateOffset ?? 7}
                onChange={(e) =>
                  setLocal({
                    ...local,
                    taskConfig: {
                      ...local.taskConfig!,
                      dueDateOffset: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="h-7 text-xs"
                data-testid="input-due-date-offset"
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onUpdate(local);
            onClose();
          }}
          data-testid="button-save-node"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

function VisualCanvas({
  steps,
  setSteps,
}: {
  steps: TemplateStep[];
  setSteps: (s: TemplateStep[]) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; portKey: string; mx: number; my: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; px: number; py: number }>({ x: 0, y: 0, px: 0, py: 0 });
  const [viewMode, setViewMode] = useState<"canvas" | "list">("canvas");

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [zoom, pan]
  );

  const handleMouseDown = (e: React.MouseEvent, stepId: string) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-port]")) return;
    e.stopPropagation();
    const step = steps.find((s) => s.id === stepId);
    if (!step) return;
    const pos = toCanvas(e.clientX, e.clientY);
    setDragging({ id: stepId, ox: pos.x - step.x, oy: pos.y - step.y });
    setSelectedId(stepId);
  };

  const handlePortMouseDown = (e: React.MouseEvent, stepId: string, portKey: string) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = toCanvas(e.clientX, e.clientY);
    setConnecting({ fromId: stepId, portKey, mx: pos.x, my: pos.y });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !dragging && !connecting) {
      if (e.target === canvasRef.current || (e.target as HTMLElement).closest("[data-canvas-bg]")) {
        setSelectedId(null);
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const pos = toCanvas(e.clientX, e.clientY);
      setSteps(
        steps.map((s) =>
          s.id === dragging.id
            ? { ...s, x: Math.max(0, pos.x - dragging.ox), y: Math.max(0, pos.y - dragging.oy) }
            : s
        )
      );
    }
    if (connecting) {
      const pos = toCanvas(e.clientX, e.clientY);
      setConnecting({ ...connecting, mx: pos.x, my: pos.y });
    }
    if (isPanning) {
      setPan({
        x: panStart.px + (e.clientX - panStart.x),
        y: panStart.py + (e.clientY - panStart.y),
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (connecting) {
      const pos = toCanvas(e.clientX, e.clientY);
      const target = steps.find(
        (s) =>
          s.id !== connecting.fromId &&
          pos.x >= s.x &&
          pos.x <= s.x + NODE_W &&
          pos.y >= s.y &&
          pos.y <= s.y + getNodeHeight(s)
      );
      if (target) {
        setSteps(
          steps.map((s) =>
            s.id === connecting.fromId
              ? { ...s, connections: { ...s.connections, [connecting.portKey]: target.id } }
              : s
          )
        );
      }
      setConnecting(null);
    }
    setDragging(null);
    setIsPanning(false);
  };

  const removeConnection = (stepId: string, portKey: string) => {
    setSteps(
      steps.map((s) => {
        if (s.id !== stepId) return s;
        const nc = { ...s.connections };
        delete nc[portKey];
        return { ...s, connections: nc };
      })
    );
  };

  const deleteStep = (stepId: string) => {
    setSteps(
      steps
        .filter((s) => s.id !== stepId)
        .map((s) => {
          const nc = { ...s.connections };
          for (const k of Object.keys(nc)) {
            if (nc[k] === stepId) delete nc[k];
          }
          return { ...s, connections: nc };
        })
    );
    if (selectedId === stepId) setSelectedId(null);
  };

  const addStep = () => {
    const maxX = steps.reduce((m, s) => Math.max(m, s.x), 0);
    const maxY = steps.reduce((m, s) => Math.max(m, s.y), 0);
    const newStep: TemplateStep = {
      id: genStepId(),
      stepNumber: steps.length + 1,
      title: "",
      description: "",
      outputType: "none",
      choices: [],
      connections: {},
      x: steps.length === 0 ? 100 : maxX + 300 > 800 ? 100 : maxX + 300,
      y: steps.length === 0 ? 80 : maxX + 300 > 800 ? maxY + 200 : maxY,
    };
    setSteps([...steps, newStep]);
    setSelectedId(newStep.id);
  };

  const updateStep = (updated: TemplateStep) => {
    setSteps(steps.map((s) => (s.id === updated.id ? updated : s)));
  };

  const fitView = () => {
    if (steps.length === 0) return;
    const minX = Math.min(...steps.map((s) => s.x));
    const minY = Math.min(...steps.map((s) => s.y));
    const maxX = Math.max(...steps.map((s) => s.x + NODE_W));
    const maxY = Math.max(...steps.map((s) => s.y + getNodeHeight(s)));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const padW = 60, padH = 60;
    const w = maxX - minX + padW * 2;
    const h = maxY - minY + padH * 2;
    const z = Math.min(rect.width / w, rect.height / h, 1.5);
    setZoom(z);
    setPan({
      x: (rect.width - w * z) / 2 - (minX - padW) * z,
      y: (rect.height - h * z) / 2 - (minY - padH) * z,
    });
  };

  const selectedStep = steps.find((s) => s.id === selectedId);

  const connectionLines: { key: string; x1: number; y1: number; x2: number; y2: number; stepId: string; portKey: string; color: string; label?: string }[] = [];
  for (const step of steps) {
    for (const [portKey, targetId] of Object.entries(step.connections)) {
      const target = steps.find((s) => s.id === targetId);
      if (!target) continue;
      const from = getPortPos(step, portKey, steps);
      const to = getInputPortPos(target);
      const color =
        step.outputType === "choice"
          ? `hsl(${(step.choices.indexOf(portKey) * 60 + 200) % 360}, 60%, 50%)`
          : "hsl(var(--primary))";
      connectionLines.push({
        key: `${step.id}-${portKey}`,
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        stepId: step.id,
        portKey,
        color,
        label: step.outputType === "choice" ? portKey : undefined,
      });
    }
  }

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 relative border rounded-lg overflow-hidden bg-[repeating-linear-gradient(0deg,transparent,transparent_19px,hsl(var(--border)/0.3)_19px,hsl(var(--border)/0.3)_20px),repeating-linear-gradient(90deg,transparent,transparent_19px,hsl(var(--border)/0.3)_19px,hsl(var(--border)/0.3)_20px)]">
        <div className="absolute top-2 left-2 z-10 flex gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(z + 0.15, 2))} data-testid="button-zoom-in">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(z - 0.15, 0.3))} data-testid="button-zoom-out">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={fitView} data-testid="button-fit-view">
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7" onClick={addStep} data-testid="button-add-node">
            <Plus className="w-3.5 h-3.5 mr-1" /> Step
          </Button>
          <Button
            size="icon"
            variant={viewMode === "list" ? "default" : "outline"}
            className="h-7 w-7"
            onClick={() => setViewMode(viewMode === "canvas" ? "list" : "canvas")}
            aria-label={viewMode === "list" ? "Switch to canvas view" : "Switch to list view"}
            data-testid="button-toggle-view"
          >
            {viewMode === "list" ? <LayoutGrid className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
          </Button>
        </div>
        {viewMode === "canvas" && (
          <>
        <div className="absolute bottom-2 left-2 z-10 text-[10px] text-muted-foreground">
          {Math.round(zoom * 100)}% &middot; {steps.length} steps
        </div>
        <div
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          data-canvas-bg
        >
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
            <svg className="absolute top-0 left-0 w-[4000px] h-[4000px] pointer-events-none" style={{ overflow: "visible" }}>
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" />
                </marker>
                {connectionLines.map((cl) => (
                  <marker
                    key={`marker-${cl.key}`}
                    id={`arrow-${cl.key}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" fill={cl.color} />
                  </marker>
                ))}
              </defs>
              {connectionLines.map((cl) => (
                <g key={cl.key}>
                  <path
                    d={bezierPath(cl.x1, cl.y1, cl.x2, cl.y2)}
                    fill="none"
                    stroke={cl.color}
                    strokeWidth={2}
                    markerEnd={`url(#arrow-${cl.key})`}
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConnection(cl.stepId, cl.portKey);
                    }}
                  />
                  {cl.label && (
                    <text
                      x={(cl.x1 + cl.x2) / 2}
                      y={(cl.y1 + cl.y2) / 2 - 6}
                      textAnchor="middle"
                      fill={cl.color}
                      fontSize="10"
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {cl.label}
                    </text>
                  )}
                </g>
              ))}
              {connecting && (() => {
                const fromStep = steps.find((s) => s.id === connecting.fromId);
                if (!fromStep) return null;
                const from = getPortPos(fromStep, connecting.portKey, steps);
                return (
                  <path
                    d={bezierPath(from.x, from.y, connecting.mx, connecting.my)}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    className="pointer-events-none"
                  />
                );
              })()}
            </svg>

            {steps.map((step) => {
              const nh = getNodeHeight(step);
              const isSelected = selectedId === step.id;
              return (
                <div
                  key={step.id}
                  className={`absolute rounded-lg border-2 bg-card shadow-md transition-shadow ${
                    isSelected ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border"
                  }`}
                  style={{ left: step.x, top: step.y, width: NODE_W, minHeight: nh }}
                  onMouseDown={(e) => handleMouseDown(e, step.id)}
                  data-testid={`canvas-node-${step.id}`}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-primary bg-background z-10" />

                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        #{step.stepNumber}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {step.taskConfig?.createTask && <ClipboardCheck className="w-3 h-3 text-amber-500" />}
                        {step.outputType === "freetext" && <Type className="w-3 h-3 text-blue-500" />}
                        {step.outputType === "choice" && <List className="w-3 h-3 text-purple-500" />}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }}
                          data-testid={`button-delete-node-${step.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm font-semibold truncate" data-testid={`text-node-title-${step.id}`}>
                      {step.title || "Untitled Step"}
                    </div>
                    {step.description && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {step.description}
                      </div>
                    )}
                  </div>

                  {step.outputType === "none" && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <div
                        data-port
                        className="w-4 h-4 rounded-full border-2 border-emerald-500 bg-background cursor-crosshair z-10 hover:bg-emerald-500 hover:border-emerald-600 transition-colors"
                        onMouseDown={(e) => handlePortMouseDown(e, step.id, "next")}
                        data-testid={`port-next-${step.id}`}
                      />
                    </div>
                  )}

                  {step.outputType === "freetext" && (
                    <div className="px-3 pb-1">
                      <div className="flex items-center gap-1 text-[10px] text-blue-500 mb-1">
                        <MessageSquare className="w-3 h-3" />
                        Free text response
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                        <div
                          data-port
                          className="w-4 h-4 rounded-full border-2 border-blue-500 bg-background cursor-crosshair z-10 hover:bg-blue-500 hover:border-blue-600 transition-colors"
                          onMouseDown={(e) => handlePortMouseDown(e, step.id, "next")}
                          data-testid={`port-freetext-${step.id}`}
                        />
                      </div>
                    </div>
                  )}

                  {step.outputType === "choice" && (
                    <div className="px-3 pb-2">
                      {step.choices.map((choice, ci) => (
                        <div key={ci} className="flex items-center justify-between text-[10px] py-0.5">
                          <span className="text-muted-foreground truncate flex-1">{choice}</span>
                          <div
                            data-port
                            className="w-3.5 h-3.5 rounded-full border-2 border-purple-500 bg-background cursor-crosshair ml-1 shrink-0 hover:bg-purple-500 hover:border-purple-600 transition-colors"
                            onMouseDown={(e) => handlePortMouseDown(e, step.id, choice)}
                            data-testid={`port-choice-${step.id}-${ci}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
          </>
        )}
        {viewMode === "list" && (
          <div className="p-4 overflow-y-auto h-full" role="list" aria-label="Workflow steps" data-testid="workflow-list-view">
            {steps.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">No steps yet. Click "+ Step" to begin.</div>
            )}
            {[...steps].sort((a, b) => a.stepNumber - b.stepNumber).map((step, idx) => {
              const targets = Object.entries(step.connections).map(([port, targetId]) => {
                const target = steps.find(s => s.id === targetId);
                return { port, target };
              }).filter(t => t.target);
              return (
                <div
                  key={step.id}
                  role="listitem"
                  tabIndex={0}
                  className={`p-3 rounded-lg border mb-2 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedId === step.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/40"}`}
                  onClick={() => setSelectedId(step.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(step.id); }
                    if (e.key === "ArrowDown") { e.preventDefault(); const el = e.currentTarget.nextElementSibling as HTMLElement; el?.focus(); }
                    if (e.key === "ArrowUp") { e.preventDefault(); const el = e.currentTarget.previousElementSibling as HTMLElement; el?.focus(); }
                  }}
                  data-testid={`list-step-${step.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5">#{step.stepNumber}</span>
                    <span className="text-sm font-semibold flex-1 truncate">{step.title || "Untitled Step"}</span>
                    <div className="flex items-center gap-1">
                      {step.taskConfig?.createTask && <ClipboardCheck className="w-3 h-3 text-amber-500" />}
                      {step.outputType === "freetext" && <Badge variant="outline" className="text-[10px] h-4 no-default-active-elevate">Text</Badge>}
                      {step.outputType === "choice" && <Badge variant="outline" className="text-[10px] h-4 no-default-active-elevate">Choice</Badge>}
                    </div>
                  </div>
                  {step.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1">{step.description}</p>}
                  {step.outputType === "choice" && step.choices.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {step.choices.map((c, ci) => (
                        <span key={ci} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{c}</span>
                      ))}
                    </div>
                  )}
                  {targets.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {targets.map(t => (
                        <span key={t.port} className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <ArrowRight className="w-2.5 h-2.5" />
                          {t.port !== "next" && <span className="font-medium">{t.port}:</span>}
                          <span>#{t.target?.stepNumber} {t.target?.title || "Untitled"}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-64 border rounded-lg p-3 overflow-y-auto bg-card">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          {selectedStep ? "Edit Step" : "Properties"}
        </h3>
        {selectedStep ? (
          <StepNodeEditor
            key={selectedStep.id}
            step={selectedStep}
            onUpdate={updateStep}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="text-xs text-muted-foreground space-y-3">
            <p>Select a step node to edit its properties.</p>
            <div className="space-y-2 border-t pt-3">
              <p className="font-semibold text-foreground">How to use:</p>
              <div className="space-y-1.5">
                <p><span className="font-medium">Click + Step</span> to add a node</p>
                <p><span className="font-medium">Drag nodes</span> to reposition</p>
                <p><span className="font-medium">Click a node</span> to edit</p>
                <p><span className="font-medium">Drag from port</span> (circle) to connect</p>
                <p><span className="font-medium">Click a line</span> to remove connection</p>
                <p><span className="font-medium">Drag background</span> to pan</p>
              </div>
              <div className="border-t pt-2 space-y-1">
                <p className="font-semibold text-foreground">Output types:</p>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 text-emerald-500" />
                  <span>None — simple step</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Type className="w-3 h-3 text-blue-500" />
                  <span>Free text — text input</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <List className="w-3 h-3 text-purple-500" />
                  <span>Choice — branching</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template?: WorkflowTemplate;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [steps, setSteps] = useState<TemplateStep[]>([]);

  useEffect(() => {
    if (open) {
      setName(template?.name || "");
      setDescription(template?.description || "");
      setCategory(template?.category || "general");
      const rawSteps = template?.steps || [];
      if (rawSteps.length === 0) {
        setSteps([
          {
            id: genStepId(),
            stepNumber: 1,
            title: "",
            description: "",
            outputType: "none",
            choices: [],
            connections: {},
            x: 100,
            y: 80,
          },
        ]);
      } else {
        setSteps(normalizeSteps(rawSteps));
      }
    }
  }, [open, template]);

  const mutation = useMutation({
    mutationFn: async () => {
      const validSteps = steps.filter((s) => s.title.trim());
      const renumbered = validSteps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
      if (template) {
        return apiRequest("PATCH", `/api/workflows/templates/${template.id}`, {
          name,
          description,
          category,
          steps: renumbered,
        });
      } else {
        return apiRequest("POST", "/api/workflows/templates", {
          name,
          description,
          category,
          steps: renumbered,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/templates"] });
      onOpenChange(false);
      toast({ title: template ? "Template updated" : "Template created" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] !rounded-none border-0 p-0 gap-0 overflow-hidden [&>button]:z-20">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-3 border-b bg-background shrink-0">
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle data-testid="text-template-dialog-title" className="text-lg">
                {template ? "Edit Workflow Template" : "Create Workflow Template"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name..."
                  className="w-52 h-8"
                  data-testid="input-template-name"
                />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-36 h-8" data-testid="select-template-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description..."
                  className="w-56 h-8"
                  data-testid="input-template-description"
                />
              </div>
              <div className="flex items-center gap-2 border-l pl-3">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid="button-cancel-template">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => mutation.mutate()}
                  disabled={!name.trim() || steps.filter((s) => s.title.trim()).length === 0 || mutation.isPending}
                  data-testid="button-save-template"
                >
                  {mutation.isPending ? "Saving..." : template ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-4">
            <VisualCanvas steps={steps} setSteps={setSteps} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniFlowPreview({ steps: rawSteps }: { steps: any[] }) {
  const steps = normalizeSteps(rawSteps);
  if (steps.length === 0) return null;

  const minX = Math.min(...steps.map((s) => s.x));
  const minY = Math.min(...steps.map((s) => s.y));
  const maxX = Math.max(...steps.map((s) => s.x + NODE_W));
  const maxY = Math.max(...steps.map((s) => s.y + getNodeHeight(s)));
  const w = maxX - minX + 40;
  const h = maxY - minY + 40;
  const scale = Math.min(1, 400 / w, 200 / h);

  return (
    <div className="relative overflow-hidden" style={{ height: Math.min(200, h * scale + 20) }}>
      <svg width="100%" height="100%" viewBox={`${minX - 20} ${minY - 20} ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="mini-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(var(--primary))" opacity="0.6" />
          </marker>
        </defs>
        {steps.flatMap((step) =>
          Object.entries(step.connections).map(([portKey, targetId]) => {
            const target = steps.find((s) => s.id === targetId);
            if (!target) return null;
            const from = getPortPos(step, portKey, steps);
            const to = getInputPortPos(target);
            return (
              <path
                key={`${step.id}-${portKey}`}
                d={bezierPath(from.x, from.y, to.x, to.y)}
                fill="none"
                stroke={step.outputType === "choice" ? `hsl(${(step.choices.indexOf(portKey) * 60 + 200) % 360}, 60%, 50%)` : "hsl(var(--primary))"}
                strokeWidth={1.5}
                opacity={0.5}
                markerEnd="url(#mini-arrow)"
              />
            );
          })
        )}
        {steps.map((step) => (
          <g key={step.id}>
            <rect
              x={step.x}
              y={step.y}
              width={NODE_W}
              height={getNodeHeight(step)}
              rx={8}
              fill="hsl(var(--card))"
              stroke={step.outputType === "choice" ? "hsl(280, 60%, 50%)" : step.outputType === "freetext" ? "hsl(210, 60%, 50%)" : "hsl(var(--border))"}
              strokeWidth={1.5}
            />
            <text
              x={step.x + 10}
              y={step.y + 20}
              fontSize="11"
              fontWeight="600"
              fill="hsl(var(--foreground))"
            >
              {step.title.length > 28 ? step.title.slice(0, 26) + "…" : step.title}
            </text>
            {step.outputType !== "none" && (
              <text x={step.x + 10} y={step.y + 34} fontSize="9" fill="hsl(var(--muted-foreground))">
                {step.outputType === "choice" ? `${step.choices.length} choices` : "free text"}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: WorkflowTemplate | null;
}) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      if (!template) return;
      return apiRequest("DELETE", `/api/workflows/templates/${template.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/templates"] });
      onOpenChange(false);
      toast({ title: "Template deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Template</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete &quot;{template?.name}&quot;? This action cannot be undone.
          Existing client workflows using this template will not be affected.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-delete">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="button-confirm-delete"
          >
            {mutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Workflows() {
  const { data: templates, isLoading } = useQuery<WorkflowTemplate[]>({
    queryKey: ["/api/workflows/templates"],
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<WorkflowTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingTemplate(undefined);
    setFormOpen(true);
  };

  const openEdit = (t: WorkflowTemplate) => {
    setEditingTemplate(t);
    setFormOpen(true);
  };

  const openDelete = (t: WorkflowTemplate) => {
    setDeletingTemplate(t);
    setDeleteOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const grouped: Record<string, WorkflowTemplate[]> = {};
  for (const t of templates || []) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-workflows-title">
            Workflow Templates
          </h1>
          <p className="text-muted-foreground text-sm">
            Design visual workflows with branching logic that can be applied to clients
          </p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-template">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {(!templates || templates.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GitBranch className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Workflow Templates</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first workflow template with the visual designer.
            </p>
            <Button onClick={openCreate} data-testid="button-create-first-template">
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catTemplates]) => (
            <div key={cat} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {categoryLabels[cat] || cat}
              </h2>
              <div className="grid gap-3">
                {catTemplates.map((t) => {
                  const isExpanded = expandedId === t.id;
                  const stepCount = t.steps?.length || 0;
                  const hasBranching = (t.steps || []).some(
                    (s: any) => s.outputType === "choice"
                  );
                  return (
                    <Card key={t.id} data-testid={`card-template-${t.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            data-testid={`button-expand-${t.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight
                                className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              />
                              <CardTitle className="text-base">{t.name}</CardTitle>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${categoryColors[t.category] || categoryColors.general} no-default-active-elevate`}
                              >
                                {categoryLabels[t.category] || t.category}
                              </Badge>
                              {hasBranching && (
                                <Badge variant="outline" className="text-[10px] no-default-active-elevate">
                                  <GitBranch className="w-3 h-3 mr-0.5" />
                                  Branching
                                </Badge>
                              )}
                            </div>
                            {t.description && (
                              <CardDescription className="ml-6 mt-1">{t.description}</CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs no-default-active-elevate">
                              <ListChecks className="w-3 h-3 mr-1" />
                              {stepCount} step{stepCount !== 1 ? "s" : ""}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(t)}
                              data-testid={`button-edit-${t.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDelete(t)}
                              data-testid={`button-delete-${t.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent>
                          <MiniFlowPreview steps={t.steps || []} />
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateFormDialog open={formOpen} onOpenChange={setFormOpen} template={editingTemplate} />
      <DeleteConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} template={deletingTemplate} />
    </div>
  );
}
