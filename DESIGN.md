---
version: alpha
name: GitFolio
description: Visual identity for GitFolio — a desktop git contribution exporter for developers.
colors:
  primary: "#f3eadb"
  secondary: "#b6a792"
  tertiary: "#d9a441"
  on-primary: "#14110f"
  on-tertiary: "#14110f"
  background: "#14110f"
  surface: "#1d1815"
  surface-raised: "#28211d"
  border: "#3a302a"
  error: "#e0625b"
  on-error: "#f3eadb"
typography:
  h1:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 1.43rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  body:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.05em
    textTransform: uppercase
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.lg}"
  button-primary-hover:
    backgroundColor: "#e4b65c"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.lg}"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm} {spacing.md}"
  input-focus:
    backgroundColor: "{colors.surface-raised}"
  progress-track:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    height: "8px"
  progress-fill:
    backgroundColor: "{colors.tertiary}"
    rounded: "{rounded.lg}"
  table-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.label}"
  table-row:
    backgroundColor: "transparent"
  table-row-selected:
    backgroundColor: "#2d2419"
    textColor: "{colors.tertiary}"
  divider:
    backgroundColor: "{colors.border}"
    height: "1px"
  error-banner:
    backgroundColor: "#341512"
    textColor: "{colors.error}"
    rounded: "{rounded.md}"
---

## Overview

GitFolio is a focused desktop utility for developers. The interface should feel like a native developer tool: dark, dense, and fast. The visual identity emphasizes clarity and momentum while borrowing some warmth from editorial tools rather than terminal UIs. The app guides the user through a linear workflow (pick folder → scan → select authors → export) with minimal chrome and clear feedback.

The aesthetic is **warm editorial minimalism**: charcoal-brown surfaces, paper-tinted text, subtle borders, and a single restrained amber accent for action and progress.

## Colors

The palette is intentionally constrained to keep the UI legible during long sessions while reducing the cold, terminal-like feel.

- **Primary (#f3eadb):** Paper-tinted text for headings, labels, and primary content without the glare of pure gray-white.
- **Secondary (#b6a792):** Warm muted text for metadata, captions, and placeholders.
- **Tertiary (#d9a441):** Restrained amber for the primary action, progress indicators, focus states, and selection states.
- **Background (#14110f):** Deep charcoal foundation for the app window.
- **Surface (#1d1815):** Warm panel background for cards, table headers, and section shells.
- **Surface-Raised (#28211d):** Inputs, buttons, and elevated controls.
- **Border (#3a302a):** Subtle warm separators that preserve density without feeling sterile.
- **Error (#e0625b):** Reserved for failures and blocking error banners; warmer than the base red so it fits the palette.

## Typography

GitFolio uses the system sans-serif stack for native feel and fast rendering.

- **Headings:** Bold, slightly tighter tracking for the app title and phase headings.
- **Body:** 14px regular for labels, lists, and form content.
- **Body Small:** 13px for secondary metadata such as commit counts and helper text.
- **Labels:** Uppercase, tracked-out 12px labels for table headers and button text.

## Layout

The app is a single-window workflow with a fixed header and a scrollable main area.

- **Window padding:** 24px around the content edge.
- **Section gaps:** 16px between major blocks.
- **Inline gaps:** 8px between related controls.
- **Max content width:** Fluid; the app fills the Electron window.
- **Workflow phases:** Each phase replaces the previous one in the main area, keeping the user focused on one action at a time.

## Components

### Buttons

Primary buttons use the tertiary amber on near-black text. Secondary buttons use the raised surface with a subtle border. Both use 6px rounding and transition smoothly on hover.

### Inputs

Text inputs match the raised surface, with the border turning amber on focus. Checkboxes use the system control with `accent-color` mapped to tertiary.

### Progress

Progress bars use a rounded 8px track in surface color and an amber fill. Text below the bar shows current/total counts in secondary color.

### Tables

Author tables use a sticky header in surface color with uppercase label typography. Rows have a thin bottom border; selected rows get a faint amber tint and tertiary text.

### Error Banner

Errors appear as a compact banner with a dark red background, red border, and red text — never as disruptive modals.

## Do's and Don'ts

- Do use the amber tertiary color sparingly — only for the single primary action and progress/selection states.
- Do keep the workflow phase-based; avoid showing multiple phases at once.
- Do maintain high contrast for code and data surfaces.
- Don't introduce additional accent colors; amber is the only intentional accent beyond neutrals and error red.
- Don't use large shadows or depth effects; rely on borders and surface layers instead.
- Don't display raw errors inline with content; use the error banner pattern.
