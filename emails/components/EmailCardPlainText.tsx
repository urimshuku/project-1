import React from "npm:react@18.3.1";
import { Section } from "npm:@react-email/components@1.0.10";
import { emailPalette, emailSemantics, spacing } from "../theme.ts";
import { PlainTextLines } from "./Typography.tsx";

export type EmailCardPlainTextProps = {
  text: string;
  /** Extra space below the card (e.g. before a CTA section). */
  marginBottom?: string;
};

/**
 * Bordered detail card — same outline and typography as join-activity admin emails.
 */
export function EmailCardPlainText({ text, marginBottom = "0" }: EmailCardPlainTextProps) {
  return (
    <Section
      style={{
        backgroundColor: emailPalette.cardBg,
        padding: spacing.md,
        borderRadius: "8px",
        border: `1px solid ${emailSemantics.border}`,
        marginBottom,
      }}
    >
      <PlainTextLines
        style={{
          margin: 0,
          fontSize: "14px",
          lineHeight: 1.5,
          color: emailSemantics.textBody,
          fontFamily: emailPalette.fontFamily,
        }}
      >
        {text}
      </PlainTextLines>
    </Section>
  );
}
