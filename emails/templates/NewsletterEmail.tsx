import EmailFooter from "../components/EmailFooter.tsx";
import EmailLayout from "../components/EmailLayout.tsx";
import { H1, H2, LinkText, P } from "../components/Typography.tsx";

export type NewsletterEmailProps = {
  name?: string;
  unsubscribeUrl: string;
  preferencesUrl?: string;
  /** Public events listing */
  eventsUrl: string;
  /** Featured class / activity deep link (defaults to eventsUrl if omitted). */
  featuredActivityUrl?: string;
};

export default function NewsletterEmail({
  name,
  unsubscribeUrl,
  preferencesUrl,
  eventsUrl,
  featuredActivityUrl,
}: NewsletterEmailProps) {
  const featured = featuredActivityUrl?.trim() || eventsUrl;
  return (
    <EmailLayout>
      <H1>Studio updates</H1>

      <P>Hi {name?.trim() || "there"},</P>

      <H2>This week&apos;s events</H2>
      <P>Discover upcoming classes, workshops, and special sessions.</P>
      <LinkText href={eventsUrl}>View events</LinkText>

      <H2>Featured activity</H2>
      <P>
        Our yoga class this week is open for everyone — join us to unwind and energize.
      </P>
      <LinkText href={featured}>Reserve a spot</LinkText>

      <EmailFooter unsubscribeUrl={unsubscribeUrl} preferencesUrl={preferencesUrl} />
    </EmailLayout>
  );
}
