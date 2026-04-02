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

/** Renders plain text with explicit line breaks — email clients often ignore `white-space: pre-wrap` on `<p>`. */
export function PlainTextLines({
  children,
  style,
}: {
  children: string;
  style: CSSProperties;
}) {
  const lines = children.split("\n");
  return (
    <Text style={style}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <br /> : null}
          {line}
        </React.Fragment>
      ))}
    </Text>
  );
}

/** Body copy with line breaks — same typography as `P`, for multi-line blocks (matches join-activity style). */
export function MultilineP({ children }: { children: string }) {
  return (
    <PlainTextLines style={{ ...pStyle, margin: `0 0 ${spacing.md}` }}>{children}</PlainTextLines>
  );
}
