import React from "npm:react@18.3.1";
import EmailFooter from "../components/EmailFooter.tsx";
import EmailLayout from "../components/EmailLayout.tsx";
import EmailWordmark from "../components/EmailWordmark.tsx";
import { H2, P } from "../components/Typography.tsx";
import { EmailCardPlainText } from "../components/EmailCardPlainText.tsx";
import { spacing } from "../theme.ts";

export type BookingConfirmationEmailProps = {
  recipientName: string;
  /** Preformatted booking details block (line breaks preserved). */
  detailsBlock: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
};

export default function BookingConfirmationEmail({
  recipientName,
  detailsBlock,
  unsubscribeUrl,
  preferencesUrl,
}: BookingConfirmationEmailProps) {
  const showFooter = Boolean(unsubscribeUrl);

  return (
    <EmailLayout>
      <H2>We received your booking request</H2>

      <P>Hi {recipientName.trim()},</P>

      <P>Thanks for your booking request. We received the details below:</P>

      <EmailCardPlainText text={detailsBlock} marginBottom={spacing.md} />

      <P>We will contact you shortly to confirm availability.</P>

      <P>
        Warm regards,
        <br />
        Studio Space
      </P>

      <EmailWordmark />

      {showFooter && unsubscribeUrl ? (
        <EmailFooter unsubscribeUrl={unsubscribeUrl} preferencesUrl={preferencesUrl} />
      ) : null}
    </EmailLayout>
  );
}
