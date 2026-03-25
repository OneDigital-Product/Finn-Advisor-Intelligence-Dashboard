# Dashboard Wall Street Redesign

## Overview
Replace the dashboard hero and add a Live Portfolio Monitor with a Wall Street terminal aesthetic using OneDigital brand colors with gold accents.

## Color Palette (Hybrid)
- Background: `#0f1419` / `#1a1f2e` (OD brand dark)
- Accent/greeting: `#e8be6e` (gold)
- Data/interactive: `#0078A2` (OD Medium Blue)
- Positive: `#8EB935` (OD Medium Green)
- Warning: `#F47D20` (OD Orange)
- Text: `#FFFFFF` / `#C7D0DD` / `#94A3B8`
- Borders: `#2D3748`

## Sections
1. API Status Bar — real connection status from /api/data-sources
2. Hero — greeting + 3 stat blocks (AUM, Clients, Revenue) from /api/clients/stats
3. Activity Ticker — scrolling counts from stats endpoint
4. Live Portfolio Monitor — collapsible table from /api/clients, real data, sorted by AUM

## Files
- NEW: `client/src/components/dashboard/ApiStatusBar.tsx`
- NEW: `client/src/components/dashboard/WallStreetHero.tsx`
- NEW: `client/src/components/dashboard/LivePortfolioMonitor.tsx`
- MODIFY: `client/src/pages/dashboard.tsx`
- REMOVE: `BookSnapshotCards` usage (replaced by hero stats)
