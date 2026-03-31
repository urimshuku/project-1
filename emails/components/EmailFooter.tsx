import React from "npm:react@18.3.1";
import { Link, Section, Text } from "npm:@react-email/components@1.0.10";
import { brandColors, spacing } from "../theme.ts";

export type EmailFooterProps = {
  unsubscribeUrl: string;
  preferencesUrl?: string;
};

/** Legal + preference links — centered, muted; props only (no user lookup). */
export default function EmailFooter({ unsubscribeUrl, preferencesUrl }: EmailFooterProps) {
  return (
    <Section style={{ marginTop: spacing.xl, textAlign: "center" as const }}>
      <Text style={{ fontSize: "12px", color: brandColors.muted, lineHeight: "18px", margin: 0 }}>
        You are receiving this email because you interacted with our studio.
      </Text>
      <Text style={{ fontSize: "12px", color: brandColors.muted, marginTop: spacing.xs, lineHeight: "18px" }}>
        If you no longer want these emails,{" "}
        <Link href={unsubscribeUrl} style={{ color: brandColors.link, fontWeight: 500 }}>
          unsubscribe
        </Link>
        {preferencesUrl ? (
          <>
            {" "}
            ·{" "}
            <Link href={preferencesUrl} style={{ color: brandColors.link, fontWeight: 500 }}>
              email preferences
            </Link>
          </>
        ) : null}
      </Text>
    </Section>
  );
}
