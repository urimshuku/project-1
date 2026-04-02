import React from "npm:react@18.3.1";
import EmailFooter from "../components/EmailFooter.tsx";
import EmailLayout from "../components/EmailLayout.tsx";
import { H2, MultilineP, P } from "../components/Typography.tsx";

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

      <MultilineP>{detailsBlock}</MultilineP>

      <P>We will contact you shortly to confirm availability.</P>

      <P>
        Warm regards,
        <br />
        Studio Space
      </P>

      {showFooter && unsubscribeUrl ? (
        <EmailFooter unsubscribeUrl={unsubscribeUrl} preferencesUrl={preferencesUrl} />
      ) : null}
    </EmailLayout>
  );
}
