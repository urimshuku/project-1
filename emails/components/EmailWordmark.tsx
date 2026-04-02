import React from "npm:react@18.3.1";
import { Section, Text } from "npm:@react-email/components@1.0.10";
import { fonts, spacing } from "../theme.ts";

/**
 * Text-only Studio Space mark for transactional emails (no PNG, no background shape).
 * White type for dark email UIs; use a dark outer email body so it stays readable.
 */
export default function EmailWordmark() {
  return (
    <Section
      style={{
        textAlign: "center",
        margin: `0 auto ${spacing.md}`,
      }}
    >
      <Text
        style={{
          margin: 0,
          color: "#ffffff",
          fontSize: "18px",
          fontWeight: 700,
          fontFamily: fonts.body,
          lineHeight: "22px",
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
