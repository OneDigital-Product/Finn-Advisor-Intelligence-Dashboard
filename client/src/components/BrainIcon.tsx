import { BRAIN_SVG } from "./ai-brain-svg";

/**
 * Renders the custom brain-chip SVG at any size with configurable fill color.
 * Uses the same traced brain from ai-brain-icon.svg.
 *
 * Security note: BRAIN_SVG is a static trusted asset from the repo
 * containing only SVG path elements — no scripts or event handlers.
 */
export function BrainIcon({
  size = 16,
  color = "#FFFFFF",
  className,
  style,
}: {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Replace white fills with the requested color for dark-on-light contexts
  const coloredSvg = color === "#FFFFFF"
    ? BRAIN_SVG
    : BRAIN_SVG.replace(/fill="#FFFFFF"/g, `fill="${color}"`);

  // Static trusted SVG content from ai-brain-icon.svg (no user input)
  const html = { __html: coloredSvg };

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
      dangerouslySetInnerHTML={html}
    />
  );
}
