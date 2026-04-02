import React from "npm:react@18.3.1";
import { Section, Text } from "npm:@react-email/components@1.0.10";
import { fonts, spacing } from "../theme.ts";

/**
 * Text-only Studio Space mark for transactional emails (no PNG / no circular icon).
 * White type on a narrow dark strip so it stays readable on light containers.
 */
export default function EmailWordmark() {
  return (
    <Section
      style={{
        textAlign: "center",
        margin: `0 auto ${spacing.md}`,
        maxWidth: "168px",
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: "#111827",
        borderRadius: "8px",
      }}
    >
      <Text
        style={{
          margin: 0,
          color: "#ffffff",
          fontSize: "24px",
          fontWeight: 700,
          fontFamily: fonts.body,
          lineHeight: "28px",
          letterSpacing: "-0.02em",
        }}
      >
        studio
        <br />
        space.
      </Text>
    </Section>
  );
}
