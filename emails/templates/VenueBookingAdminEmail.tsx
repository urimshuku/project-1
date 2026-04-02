import React from "npm:react@18.3.1";
import { Button, Section, Text } from "npm:@react-email/components@1.0.10";
import EmailLayout from "../components/EmailLayout.tsx";
import { EmailCardPlainText } from "../components/EmailCardPlainText.tsx";
import { H3, Muted } from "../components/Typography.tsx";
import { brandColors, emailPalette, emailSemantics, spacing } from "../theme.ts";

export type VenueBookingAdminEmailProps = {
  /** Full request details as plain text (preserved layout). */
  detailsPlainText: string;
  approveUrl?: string;
};

export default function VenueBookingAdminEmail({ detailsPlainText, approveUrl }: VenueBookingAdminEmailProps) {
  const hasApprove = Boolean(approveUrl?.trim());

  return (
    <EmailLayout>
      <H3>Request details</H3>

      <EmailCardPlainText text={detailsPlainText} marginBottom={spacing.md} />

      {hasApprove && approveUrl ? (
        <Section
          style={{
            backgroundColor: emailPalette.accentGreenBg,
            border: `1px solid ${emailPalette.accentGreenBorder}`,
            borderRadius: "12px",
            padding: "20px 20px 18px",
            marginTop: spacing.sm,
          }}
        >
          <Text style={{ margin: "0 0 12px" }}>
            <Button
              href={approveUrl}
              style={{
                display: "inline-block",
                backgroundColor: brandColors.primary,
                color: "#ffffff",
                padding: "12px 22px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "15px",
                fontFamily: emailPalette.fontFamily,
              }}
            >
              Accept & block calendar dates
            </Button>
          </Text>
          <Muted>
            Opens a secure page — click <strong>Approve booking</strong> there to finish (avoids accidental approval
            from inbox previews).
          </Muted>
        </Section>
      ) : (
        <Text style={{ color: emailPalette.warning, fontSize: "14px", margin: `0 0 ${spacing.md}` }}>
          No approval link could be generated for this booking.
        </Text>
      )}
    </EmailLayout>
  );
}
