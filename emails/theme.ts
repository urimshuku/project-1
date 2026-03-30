/**
 * Brand design tokens for React Email (Tailwind-inspired: indigo primary, neutral text).
 * Single source of truth for colors, typography, and spacing.
 */
export const brandColors = {
  primary: "#4F46E5",
  secondary: "#FBBF24",
  background: "#F6F9FC",
  surface: "#ffffff",
  text: "#111827",
  muted: "#6B7280",
  link: "#3B82F6",
} as const;

export const fonts = {
  heading: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
} as const;

/** Semantic UI (cards, admin panels, warnings) — stays on-brand with primary indigo. */
export const emailSemantics = {
  textBody: "#374151",
  border: "#E5E7EB",
  cardBg: brandColors.surface,
  /** Indigo-tinted surfaces for primary CTAs (replaces legacy “green” admin block). */
  ctaSurfaceBg: "#EEF2FF",
  ctaSurfaceBorder: "#C7D2FE",
  warning: "#B45309",
  mutedStrong: "#4B5563",
} as const;

/** Container + legacy field names used by transactional templates. */
export const emailPalette = {
  pageBg: brandColors.background,
  text: brandColors.text,
  textMuted: brandColors.muted,
  textBody: emailSemantics.textBody,
  border: emailSemantics.border,
  cardBg: emailSemantics.cardBg,
  accentGreen: brandColors.primary,
  accentGreenBg: emailSemantics.ctaSurfaceBg,
  accentGreenBorder: emailSemantics.ctaSurfaceBorder,
  warning: emailSemantics.warning,
  fontFamily: fonts.body,
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: brandColors.surface,
    padding: spacing.lg,
    borderRadius: "12px",
    border: `1px solid ${emailSemantics.border}`,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
} as const;
