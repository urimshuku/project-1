import React from "npm:react@18.3.1";
import { Body, Container, Head, Html } from "npm:@react-email/components@1.0.10";
import type { ReactNode } from "npm:react@18.3.1";
import { brandColors, emailPalette, fonts, spacing } from "../theme.ts";

export default function EmailLayout({ children }: { children: ReactNode }) {
  return (
    <Html lang="en">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Body
        style={{
          backgroundColor: brandColors.background,
          fontFamily: fonts.body,
          margin: 0,
          padding: `${spacing.lg} 12px`,
        }}
      >
        <Container style={{ ...emailPalette.container }}>{children}</Container>
      </Body>
    </Html>
  );
}
