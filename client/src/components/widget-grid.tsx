/**
 * Widget Grid — Drag-and-drop reorderable widget container
 *
 * Wraps child widgets in a @dnd-kit sortable context.
 * When editing is enabled, widgets show drag handles and can be rearranged.
 * Order is persisted via the useWidgetConfig hook (localStorage).
 */
import { useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, Unlock } from "lucide-react";
import { P } from "@/styles/tokens";
import type { useWidgetConfig } from "@/hooks/use-widget-config";

const OD = {
  bgMed: P.odSurf, border: P.odBorder, text1: P.odT1, text2: P.odT2,
  text3: P.odT3, lightBlue: P.odLBlue, medGreen: P.odGreen,
};

/* ── Sortable Widget Wrapper ── */
function SortableWidget({
  id,
  children,
  editing,
}: {
  id: string;
  children: ReactNode;
  editing: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {editing && (
        <div
          {...listeners}
          style={{
            position: "absolute",
            top: 8,
            left: -28,
            zIndex: 10,
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 4,
            background: "rgba(79,179,205,0.12)",
            border: "1px solid rgba(79,179,205,0.25)",
            color: OD.lightBlue,
          }}
          title="Drag to reorder"
        >
          <GripVertical style={{ width: 14, height: 14 }} />
        </div>
      )}
      <div style={{
        outline: editing ? `2px dashed rgba(79,179,205,0.3)` : "none",
        outlineOffset: 2,
        borderRadius: 8,
        transition: "outline 0.15s",
      }}>
        {children}
      </div>
    </div>
  );
}

/* ── Widget Grid Component ── */
interface WidgetGridProps {
  /** The widget config hook return value */
  widgetConfig: ReturnType<typeof useWidgetConfig>;
  /**
   * Render function: receives visible widget IDs in order,
   * returns a map of id → ReactNode. Widgets not in the map are skipped.
   */
  children: Record<string, ReactNode | null | undefined>;
  /** External editing state control (optional — uses internal state if omitted) */
  editing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

export function WidgetGrid({
  widgetConfig,
  children,
  editing: externalEditing,
  onEditingChange,
}: WidgetGridProps) {
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = externalEditing ?? internalEditing;
  const setEditing = onEditingChange ?? setInternalEditing;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      widgetConfig.reorder(String(active.id), String(over.id));
    }
  };

  // Only show visible widgets that have a corresponding child element
  const visibleIds = widgetConfig.visibleWidgets.filter(
    (id) => children[id] != null,
  );

  return (
    <div>
      {/* Edit mode toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={() => setEditing(!editing)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: editing ? "rgba(79,179,205,0.12)" : "transparent",
            border: `1px solid ${editing ? OD.lightBlue : OD.border}`,
            borderRadius: 5, padding: "4px 10px",
            fontSize: 10, fontWeight: 600,
            color: editing ? OD.lightBlue : OD.text3,
            cursor: "pointer", transition: "all .15s", letterSpacing: ".04em",
          }}
          data-testid="widget-edit-toggle"
        >
          {editing ? (
            <Unlock style={{ width: 12, height: 12 }} />
          ) : (
            <Lock style={{ width: 12, height: 12 }} />
          )}
          {editing ? "Done Editing" : "Edit Layout"}
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleIds}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ paddingLeft: editing ? 32 : 0, transition: "padding 0.15s", display: "flex", flexDirection: "column", gap: 20 }}>
            {visibleIds.map((id) => (
              <SortableWidget key={id} id={id} editing={editing}>
                {children[id]}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
