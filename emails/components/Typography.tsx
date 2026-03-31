import React from "npm:react@18.3.1";
import { Heading, Link, Text } from "npm:@react-email/components@1.0.10";
import type { CSSProperties, ReactNode } from "npm:react@18.3.1";
import { brandColors, emailSemantics, fonts, spacing } from "../theme.ts";

const h1Style: CSSProperties = {
  fontFamily: fonts.heading,
  color: brandColors.primary,
  fontSize: "28px",
  fontWeight: 600,
  margin: `0 0 ${spacing.md}`,
  lineHeight: "36px",
};

const h2Style: CSSProperties = {
  fontFamily: fonts.heading,
  color: brandColors.text,
  fontSize: "22px",
  fontWeight: 600,
  margin: `0 0 ${spacing.sm}`,
  lineHeight: "28px",
};

const h3Style: CSSProperties = {
  fontFamily: fonts.heading,
  color: brandColors.text,
  fontSize: "18px",
  fontWeight: 600,
  margin: `0 0 ${spacing.sm}`,
  lineHeight: "24px",
};

const pStyle: CSSProperties = {
  fontFamily: fonts.body,
  color: brandColors.text,
  fontSize: "16px",
  margin: `0 0 ${spacing.md}`,
  lineHeight: "24px",
};

/** Hero / newsletter title — brand primary. */
export function H1({ children }: { children: ReactNode }) {
  return <Heading style={h1Style}>{children}</Heading>;
}

/** Section titles — default hierarchy for transactional templates. */
export function H2({ children }: { children: ReactNode }) {
  return (
    <Heading as="h2" style={h2Style}>
      {children}
    </Heading>
  );
}

/** Subsections inside a template. */
export function H3({ children }: { children: ReactNode }) {
  return (
    <Heading as="h3" style={h3Style}>
      {children}
    </Heading>
  );
}

/** Body copy. */
export function P({ children }: { children: ReactNode }) {
  return <Text style={pStyle}>{children}</Text>;
}

/** Muted supporting line (e.g. disclaimers). */
export function Muted({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        ...pStyle,
        color: brandColors.muted,
        fontSize: "14px",
        lineHeight: "22px",
      }}
    >
      {children}
    </Text>
  );
}

/** Standalone CTA link (react-email Link for client compatibility). */
export function LinkText({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Text style={{ margin: `0 0 ${spacing.md}`, lineHeight: "24px" }}>
      <Link
        href={href}
        style={{
          color: brandColors.link,
          fontWeight: 500,
          textDecoration: "underline",
          fontFamily: fonts.body,
        }}
      >
        {children}
      </Link>
    </Text>
  );
}

/** Preformatted block (schedules, IDs) — preserves line breaks. */
export function PreBlock({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.body,
        color: emailSemantics.textBody,
        fontSize: "14px",
        lineHeight: "22px",
        whiteSpace: "pre-wrap",
        margin: `0 0 ${spacing.md}`,
        padding: spacing.md,
        backgroundColor: "#F9FAFB",
        borderRadius: "8px",
        border: `1px solid ${emailSemantics.border}`,
      }}
    >
      {children}
    </Text>
  );
}

/** Monospace pre block (admin raw request dumps). */
export function PreMono({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: fonts.mono,
        color: emailSemantics.textBody,
        fontSize: "13px",
        lineHeight: 1.45,
        whiteSpace: "pre-wrap",
        margin: 0,
      }}
    >
      {children}
    </Text>
  );
}
