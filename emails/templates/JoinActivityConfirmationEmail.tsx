import React from "npm:react@18.3.1";
import EmailFooter from "../components/EmailFooter.tsx";
import EmailLayout from "../components/EmailLayout.tsx";
import { H2, P } from "../components/Typography.tsx";

export type JoinActivityConfirmationEmailProps = {
  recipientName: string;
  activitiesList: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
};

export default function JoinActivityConfirmationEmail({
  recipientName,
  activitiesList,
  unsubscribeUrl,
  preferencesUrl,
}: JoinActivityConfirmationEmailProps) {
  const showFooter = Boolean(unsubscribeUrl);

  return (
    <EmailLayout>
      <H2>We received your activity join request</H2>

      <P>Hi {recipientName.trim()},</P>

      <P>Thank you for your interest in joining Studio Space activities.</P>

      <P>
        <strong>Activities selected:</strong> {activitiesList}
      </P>

      <P>We will be in touch with you soon with more information.</P>

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
