import React from "npm:react@18.3.1";
import EmailLayout from "../components/EmailLayout.tsx";
import { EmailCardPlainText } from "../components/EmailCardPlainText.tsx";
import { H3 } from "../components/Typography.tsx";

export type JoinActivityAdminEmailProps = {
  bodyPlainText: string;
};

export default function JoinActivityAdminEmail({ bodyPlainText }: JoinActivityAdminEmailProps) {
  return (
    <EmailLayout>
      <H3>New activity join request</H3>
      <EmailCardPlainText text={bodyPlainText} />
    </EmailLayout>
  );
}
