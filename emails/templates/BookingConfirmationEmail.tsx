import React from "npm:react@18.3.1";
import { Img } from "npm:@react-email/components@1.0.10";
import EmailFooter from "../components/EmailFooter.tsx";
import EmailLayout from "../components/EmailLayout.tsx";
import { H2, P, PreBlock } from "../components/Typography.tsx";

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

      <PreBlock>{detailsBlock}</PreBlock>

      <P>We will contact you shortly to confirm availability.</P>

      <P>
        Warm regards,
        <br />
        Studio Space
      </P>
      <Img
        src="https://www.studiospace.community/studio-space-icon.png"
        alt="Studio Space logo"
        width="40"
        height="40"
        style={{ display: "block", margin: "0 auto 16px", borderRadius: "9999px" }}
      />

      {showFooter && unsubscribeUrl ? (
        <EmailFooter unsubscribeUrl={unsubscribeUrl} preferencesUrl={preferencesUrl} />
      ) : null}
    </EmailLayout>
  );
}
