import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | UpStar",
  description: "UpStar Terms of Service",
};

export default function TermsPage() {
  return (
    <div
      className="min-h-screen px-4 py-16"
      style={{
        background: "var(--page-gradient)",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-block mb-8">
          <img src="/logo.svg" alt="RatingIQ" style={{ height: "36px", width: "auto" }} />
        </Link>

        <div
          className="rounded-3xl p-8 md:p-12"
          style={{
            background:
              "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Terms of Service
          </h1>
          <p className="text-muted text-sm mb-10">
            Last updated: March 7, 2026
          </p>

          <div className="space-y-8 text-[var(--text-secondary)] text-sm leading-relaxed">
            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By creating an account or using the UpStar platform
                (&quot;Service&quot;), you agree to be bound by these Terms of
                Service. If you do not agree, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                2. Description of Service
              </h2>
              <p>
                UpStar is a B2B analytics platform designed for hotel managers.
                We aggregate publicly available guest reviews from Online Travel
                Agency (OTA) platforms — including but not limited to
                Booking.com, Google, Expedia, and TripAdvisor — and apply
                AI-powered analysis to surface actionable insights, generate
                response suggestions, and provide performance analytics.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                3. Data Collection &amp; OTA Platform Data
              </h2>
              <p className="mb-3">
                By using the Service, you acknowledge and consent to the
                following:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">
                    Per-hotel data collection:
                  </strong>{" "}
                  UpStar collects publicly available review data exclusively for
                  the hotel properties you register on the platform. We do not
                  collect data for properties you do not own or manage.
                </li>
                <li>
                  <strong className="text-foreground">OTA platform data:</strong> We
                  use automated tools to gather publicly available guest
                  reviews, ratings, and associated metadata from OTA platforms
                  including Booking.com, Google, Expedia, and TripAdvisor. This
                  data is publicly visible to any internet user on these
                  platforms.
                </li>
                <li>
                  <strong className="text-foreground">
                    Purpose of data collection:
                  </strong>{" "}
                  All collected data is used solely to provide you with
                  analytics, insights, AI-generated response suggestions, and
                  other data-driven features that help you better understand and
                  manage your guest feedback.
                </li>
                <li>
                  <strong className="text-foreground">
                    No third-party sharing:
                  </strong>{" "}
                  We do not sell, license, or share your hotel&apos;s review
                  data with any third party. Data is used exclusively within the
                  Service for your benefit.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                4. Your Responsibilities
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  You represent that you are the owner, operator, or authorized
                  representative of the hotel properties you register on UpStar.
                </li>
                <li>
                  You are solely responsible for how you use AI-generated
                  response suggestions. UpStar provides response drafts as a
                  convenience tool — you review, edit, and post responses to OTA
                  platforms at your own discretion.
                </li>
                <li>
                  You agree not to misuse the Service, including using it for
                  properties you are not authorized to manage.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                5. AI-Generated Content
              </h2>
              <p>
                UpStar uses artificial intelligence to generate response
                suggestions and analytical insights. AI-generated content is
                provided as-is for your review and editing. UpStar does not
                guarantee the accuracy, appropriateness, or completeness of
                AI-generated content. You are responsible for reviewing all
                AI-generated responses before posting them to any platform.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                6. Subscriptions &amp; Billing
              </h2>
              <p>
                Certain features of the Service require paid subscriptions or
                add-ons. Billing is handled through Stripe. By purchasing a
                subscription, you agree to the applicable pricing and renewal
                terms displayed at checkout. Subscriptions auto-renew monthly
                unless canceled before the next billing cycle.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                7. Intellectual Property
              </h2>
              <p>
                The UpStar platform, including its design, features, and
                underlying technology, is the intellectual property of UpStar.
                Guest reviews collected from OTA platforms remain the property
                of their respective authors and platforms. AI-generated response
                suggestions become yours to use freely once generated.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                8. Limitation of Liability
              </h2>
              <p>
                UpStar is provided &quot;as is&quot; without warranties of any
                kind. We are not liable for any damages arising from your use of
                the Service, including but not limited to loss of revenue, data,
                or business opportunities. Our total liability shall not exceed
                the amount you paid for the Service in the 12 months preceding
                any claim.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                9. Termination
              </h2>
              <p>
                Either party may terminate this agreement at any time. Upon
                termination, your access to the Service will cease and your data
                may be deleted after a reasonable retention period. You may
                request data deletion at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                10. Changes to Terms
              </h2>
              <p>
                We may update these Terms from time to time. Continued use of
                the Service after changes constitutes acceptance of the updated
                Terms. We will notify you of material changes via email or
                through the Service.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                11. Contact
              </h2>
              <p>
                For questions about these Terms, please contact us at{" "}
                <a
                  href="mailto:support@upstar.com"
                  className="text-gold-light hover:text-gold transition-colors"
                >
                  omri@upstar5.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/privacy"
            className="text-gold-light hover:text-gold text-sm transition-colors"
          >
            View Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
