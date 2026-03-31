import React from "npm:react@18.3.1";
import { Section, Text } from "npm:@react-email/components@1.0.10";
import EmailLayout from "../components/EmailLayout.tsx";
import { H3 } from "../components/Typography.tsx";
import { emailPalette, emailSemantics, spacing } from "../theme.ts";

export type JoinActivityAdminEmailProps = {
  bodyPlainText: string;
};

export default function JoinActivityAdminEmail({ bodyPlainText }: JoinActivityAdminEmailProps) {
  return (
    <EmailLayout>
      <H3>New activity join request</H3>
      <Section
        style={{
          backgroundColor: emailPalette.cardBg,
          padding: spacing.md,
          borderRadius: "8px",
          border: `1px solid ${emailSemantics.border}`,
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: "14px",
            lineHeight: 1.5,
            color: emailSemantics.textBody,
            whiteSpace: "pre-wrap",
            fontFamily: emailPalette.fontFamily,
          }}
        >
          {bodyPlainText}
        </Text>
      </Section>
    </EmailLayout>
  );
}
