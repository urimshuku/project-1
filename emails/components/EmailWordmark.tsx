import React from "npm:react@18.3.1";
import { Section, Text } from "npm:@react-email/components@1.0.10";
import { fonts, spacing } from "../theme.ts";

/**
 * Stacked “studio / space.” wordmark for transactional emails (text-only, no image).
 * Same placement as venue booking confirmations — after “Warm regards, Studio Space”.
 */
export default function EmailWordmark() {
  return (
    <Section style={{ textAlign: "center", margin: `0 auto ${spacing.md}` }}>
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
