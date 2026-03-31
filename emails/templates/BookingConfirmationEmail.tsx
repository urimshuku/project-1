import React from "npm:react@18.3.1";
import EmailFooter from "../components/EmailFooter.tsx";
import EmailLayout from "../components/EmailLayout.tsx";
import { H2, P, PreBlock } from "../components/Typography.tsx";

export type BookingConfirmationEmailProps = {
  recipientName: string;
  /** Preformatted schedule block (line breaks preserved). */
  scheduleBlock: string;
  activityType: string;
  groupSize: string | number;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
};

export default function BookingConfirmationEmail({
  recipientName,
  scheduleBlock,
  activityType,
  groupSize,
  unsubscribeUrl,
  preferencesUrl,
}: BookingConfirmationEmailProps) {
  const showFooter = Boolean(unsubscribeUrl);

  return (
    <EmailLayout>
      <H2>We received your booking request</H2>

      <P>Hi {recipientName.trim()},</P>

      <P>Thanks for your booking request. We received the details below:</P>

      <PreBlock>{scheduleBlock}</PreBlock>

      <P>
        <strong>Activity:</strong> {activityType}
        <br />
        <strong>Group size:</strong> {groupSize}
      </P>

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
