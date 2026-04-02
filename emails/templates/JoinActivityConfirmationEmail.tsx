import React from "npm:react@18.3.1";
import EmailFooter from "../components/EmailFooter.tsx";
import EmailLayout from "../components/EmailLayout.tsx";
import EmailWordmark from "../components/EmailWordmark.tsx";
import { EmailCardPlainText } from "../components/EmailCardPlainText.tsx";
import { H2, P } from "../components/Typography.tsx";
import { spacing } from "../theme.ts";

export type JoinActivityConfirmationEmailProps = {
  recipientName: string;
  /** Name through future activity ideas, line breaks preserved. */
  detailsBlock: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
};

export default function JoinActivityConfirmationEmail({
  recipientName,
  detailsBlock,
  unsubscribeUrl,
  preferencesUrl,
}: JoinActivityConfirmationEmailProps) {
  const showFooter = Boolean(unsubscribeUrl);

  return (
    <EmailLayout>
      <H2>We received your activity join request</H2>

      <P>Hi {recipientName.trim()},</P>

      <P>
        Thank you for your interest in joining Studio Space activities. We received the details below:
      </P>

      <EmailCardPlainText text={detailsBlock} marginBottom={spacing.md} />

      <P>We will be in touch with you soon with more information.</P>

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
