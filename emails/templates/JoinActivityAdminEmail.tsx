import React from "npm:react@18.3.1";
import EmailLayout from "../components/EmailLayout.tsx";
import { EmailCardPlainText } from "../components/EmailCardPlainText.tsx";
import { H3, P } from "../components/Typography.tsx";

export type JoinActivityAdminEmailProps = {
  /** Join ID through future activity ideas — rendered inside the bordered card. */
  detailsPlainText: string;
};

export default function JoinActivityAdminEmail({ detailsPlainText }: JoinActivityAdminEmailProps) {
  return (
    <EmailLayout>
      <H3>New activity join request</H3>

      <P>A new activity join request was submitted.</P>

      <EmailCardPlainText text={detailsPlainText} />
    </EmailLayout>
  );
}
