# reUI Vega Style — Design Reference

Extracted from https://reui.io/patterns/chart?base=radix&style=vega

## Color Tokens (Light Mode)

| Token | Hex | HSL (approx) | Usage |
|---|---|---|---|
| `--background` | `#fff` | `0 0% 100%` | Page background |
| `--foreground` | `#0a0a0a` | `0 0% 4%` | Primary text |
| `--card` | `#fff` | `0 0% 100%` | Card surfaces |
| `--card-foreground` | `#0a0a0a` | `0 0% 4%` | Card text |
| `--popover` | `#fff` | `0 0% 100%` | Popover/dropdown bg |
| `--popover-foreground` | `#0a0a0a` | `0 0% 4%` | Popover text |
| `--primary` | `#171717` | `0 0% 9%` | Buttons, key actions |
| `--primary-foreground` | `#fafafa` | `0 0% 98%` | Text on primary |
| `--secondary` | `#f5f5f5` | `0 0% 96%` | Secondary surfaces |
| `--secondary-foreground` | `#171717` | `0 0% 9%` | Text on secondary |
| `--muted` | `#f5f5f5` | `0 0% 96%` | Muted backgrounds |
| `--muted-foreground` | `#737373` | `0 0% 45%` | De-emphasized text |
| `--accent` | `#f5f5f5` | `0 0% 96%` | Hover/focus highlight |
| `--accent-foreground` | `#171717` | `0 0% 9%` | Accent text |
| `--destructive` | `#e40014` | `354 100% 45%` | Error/danger actions |
| `--border` | `#e5e5e5` | `0 0% 90%` | Borders |
| `--input` | `#e5e5e5` | `0 0% 90%` | Input borders |
| `--ring` | `#737373` | `0 0% 45%` | Focus ring |

## Color Tokens (Dark Mode)

| Token | Hex | HSL (approx) |
|---|---|---|
| `--background` | `#0a0a0a` | `0 0% 4%` |
| `--foreground` | `#fafafa` | `0 0% 98%` |
| `--card` | `#171717` | `0 0% 9%` |
| `--card-foreground` | `#fafafa` | `0 0% 98%` |
| `--popover` | `#262626` | `0 0% 15%` |
| `--popover-foreground` | `#fafafa` | `0 0% 98%` |
| `--primary` | `#e5e5e5` | `0 0% 90%` |
| `--primary-foreground` | `#171717` | `0 0% 9%` |
| `--secondary` | `#262626` | `0 0% 15%` |
| `--secondary-foreground` | `#fafafa` | `0 0% 98%` |
| `--muted` | `#262626` | `0 0% 15%` |
| `--muted-foreground` | `#a1a1a1` | `0 0% 63%` |
| `--accent` | `#404040` | `0 0% 25%` |
| `--accent-foreground` | `#fafafa` | `0 0% 98%` |
| `--destructive` | `#ff6568` | `359 100% 70%` |
| `--border` | `rgba(255,255,255,0.1)` | white/10% |
| `--input` | `rgba(255,255,255,0.15)` | white/15% |
| `--ring` | `#a1a1a1` | `0 0% 63%` |

## Chart Colors (Light Mode — "Vega" Palette)

| Token | Hex | Description |
|---|---|---|
| `--chart-1` | `#1447e6` | Deep blue — primary metric |
| `--chart-2` | `#009588` | Teal — secondary metric |
| `--chart-3` | `#104e64` | Dark teal — tertiary |
| `--chart-4` | `#ac4bff` | Purple — fourth series |
| `--chart-5` | `#f99c00` | Amber — fifth series |

## Chart Colors (Dark Mode — "Vega" Palette)

| Token | Hex | Description |
|---|---|---|
| `--chart-1` | `#f05100` | Bright orange |
| `--chart-2` | `#00bb7f` | Emerald green |
| `--chart-3` | `#f99c00` | Amber |
| `--chart-4` | `#fcbb00` | Gold |
| `--chart-5` | `#ff2357` | Hot pink/red |

## Sidebar Tokens (Light)

| Token | Hex |
|---|---|
| `--sidebar` | `#fafafa` |
| `--sidebar-foreground` | `#0a0a0a` |
| `--sidebar-primary` | `#171717` |
| `--sidebar-primary-foreground` | `#fafafa` |
| `--sidebar-accent` | `#f5f5f5` |
| `--sidebar-accent-foreground` | `#171717` |
| `--sidebar-border` | `#e5e5e5` |
| `--sidebar-ring` | `#a1a1a1` |
| `--sidebar-width` | `240px` |

## Sidebar Tokens (Dark)

| Token | Hex |
|---|---|
| `--sidebar` | `#171717` |
| `--sidebar-foreground` | `#fafafa` |
| `--sidebar-primary` | `#1447e6` |
| `--sidebar-primary-foreground` | `#fafafa` |
| `--sidebar-accent` | `#262626` |
| `--sidebar-accent-foreground` | `#fafafa` |
| `--sidebar-border` | `rgba(255,255,255,0.1)` |
| `--sidebar-ring` | `#525252` |

## Typography

- **Body font**: `Inter` (variable weight, font-feature-settings with cv02, cv03, cv04, cv11)
- **Font size**: `--text-sm` (14px) for body, `--text-xs` (12px) for labels/badges
- **Font weight**: `--font-weight-medium` (500) for titles/buttons, normal (400) for body
- **Heading tracking**: `-0.02em` (tight)

## Spacing

- `--spacing`: `0.25rem` (4px base unit)
- Component padding uses `calc(var(--spacing) * N)`:
  - Card padding: `spacing * 6` (24px)
  - Card small: `spacing * 4` (16px)
  - Input padding-inline: `spacing * 2.5` (10px)
  - Button padding: `spacing * 2 / spacing * 4` (8px/16px)
  - Badge padding: `spacing * 2` inline, `spacing * 0.5` block
  - Chart tooltip padding: `spacing * 2.5` inline, `spacing * 1.5` block

## Border Radius

- `--radius`: `0.625rem` (10px base)
- `--radius-sm`: `calc(var(--radius) - 4px)` → 6px
- `--radius-md`: `calc(var(--radius) - 2px)` → 8px
- `--radius-lg`: `var(--radius)` → 10px
- `--radius-xl`: `calc(var(--radius) + 4px)` → 14px
- `--radius-4xl`: `2rem` → 32px
- Card: `radius + 4px` (14px, radius-xl)
- Button: `radius - 2px` (8px, radius-md)
- Badge: `radius-4xl` (32px, fully rounded)
- Input: `radius - 2px` (8px, radius-md)
- Dialog: `radius + 4px` (14px, radius-xl)

## Shadows

- Card: `0 1px 2px 0 rgba(0,0,0,0.05)` (very subtle)
- Card ring: `1px foreground/10%` inset ring border
- Dialog: inherits card shadow pattern
- Button outline: `0 1px 2px 0 rgba(0,0,0,0.05)`
- Chart tooltip: `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` (elevated)
- Hover card: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)`

## Component Patterns

### Card (Vega)
- border-radius: `radius + 4px` (14px)
- background: `var(--card)`
- ring: `1px foreground/10%` (very subtle border via box-shadow ring, not CSS border)
- shadow: `0 1px 2px rgba(0,0,0,0.05)` — barely visible
- gap: `spacing * 6` (24px) between sections
- padding-block: `spacing * 6` (24px)
- Title: `text-base`, font-weight medium
- Description: `text-sm`, color `muted-foreground`
- Content padding-inline: `spacing * 6` (24px)

### Button (Vega)
- border-radius: `radius - 2px` (8px)
- 1px transparent border (for alignment with outlined variants)
- background-clip: `padding-box`
- Default: bg `primary`, text `primary-foreground`; hover via `color-mix(oklab, primary 80%)`
- Outline: border `var(--border)`, bg `background`, shadow `0 1px 2px rgba(0,0,0,0.05)`, hover bg `muted`
- Focus: border `ring`, ring `3px ring/50%`

### Badge (Vega)
- height: `spacing * 5` (20px)
- border-radius: `radius-4xl` (fully rounded pill)
- font-size: `text-xs`
- font-weight: medium
- 1px transparent border
- Default: bg `primary`, text `primary-foreground`
- Secondary: bg `secondary`, text `secondary-foreground`
- Outline: border `var(--border)`, text `foreground`
- Destructive: bg `destructive/10%`, border `destructive/40%`

### Input (Vega)
- height: `spacing * 9` (36px)
- border-radius: `radius - 2px` (8px)
- border: 1px `var(--input)`
- shadow: `0 1px 2px rgba(0,0,0,0.05)`
- font-size: `text-sm`
- Focus: border `ring`, ring `3px ring/50%`
- Dark: bg `input/30%`
- Invalid: border `destructive`, ring `destructive/20%`

### Chart Tooltip (Vega)
- border-radius: `var(--radius)` (10px)
- border: 1px `border/50%`
- background: `var(--background)`
- padding: `spacing * 2.5` inline, `spacing * 1.5` block
- font-size: `text-xs`
- shadow: large elevation (`shadow-xl` level)
- gap: `spacing * 1.5`

### Dialog/Alert Dialog (Vega)
- border-radius: `radius + 4px` (14px)
- background: `var(--background)`
- padding: `spacing * 6` (24px)
- ring: `1px foreground/10%`
- Overlay: `rgba(0,0,0,0.1)`, backdrop-blur `xs`, duration `0.1s`

## Key Design Principles

1. **Neutral-first palette**: Primary/accent are grayscale in light mode — color comes from chart data and status indicators only
2. **Subtle borders**: Uses `foreground/10%` ring instead of hard borders for cards/dialogs
3. **Consistent radius scale**: Everything derives from the `--radius` base (10px)
4. **Inter font family**: Clean, modern sans-serif with OpenType features enabled
5. **Spacing rhythm**: 4px base unit, components use consistent multiples
6. **Dark mode via color-mix**: Hover states use `color-mix(in oklab, color 80%, transparent)` for smooth dimming
7. **Chart uses Recharts**: All chart patterns built with Recharts library
8. **Radix primitives**: Component base layer uses Radix UI for accessibility
