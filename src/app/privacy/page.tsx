import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | UpStar",
  description: "UpStar Privacy Policy",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted text-sm mb-10">Last updated: March 7, 2026</p>

          <div className="space-y-8 text-[var(--text-secondary)] text-sm leading-relaxed">
            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">1. Introduction</h2>
              <p>
                UpStar (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting
                your privacy. This Privacy Policy explains how we collect, use, and safeguard
                information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                2. Information We Collect
              </h2>

              <h3 className="text-[var(--text-secondary)] font-medium mt-4 mb-2">2.1 Account Information</h3>
              <p>
                When you create an account, we collect your name, email address, and password
                (stored as a secure hash). If you purchase a subscription, payment is processed
                by Stripe — we do not store your credit card details.
              </p>

              <h3 className="text-[var(--text-secondary)] font-medium mt-4 mb-2">
                2.2 Hotel &amp; Property Information
              </h3>
              <p>
                You provide hotel details during onboarding, including property name and URLs
                on OTA platforms (Booking.com, Google, Expedia, TripAdvisor).
              </p>

              <h3 className="text-[var(--text-secondary)] font-medium mt-4 mb-2">
                2.3 Publicly Available Review Data
              </h3>
              <p className="mb-3">
                By using UpStar, you consent to the collection and processing of publicly
                available guest reviews from OTA platforms for the hotel properties you register.
                This includes:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Guest display names (as publicly shown on the OTA platform)</li>
                <li>Review text, ratings, and dates</li>
                <li>Guest location and traveler type (when publicly displayed)</li>
                <li>Existing management responses (when publicly displayed)</li>
              </ul>
              <p className="mt-3">
                <strong className="text-foreground">Important:</strong> This data is already publicly
                visible to anyone visiting the OTA platform. We collect it exclusively for the
                properties you own or manage — on a strict per-hotel basis — and only to provide
                our analytics and AI response services to you.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">3. How We Use Your Data</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Analytics &amp; insights:</strong> We analyze
                  review data to identify trends, sentiment patterns, strengths, and areas for
                  improvement for your properties.
                </li>
                <li>
                  <strong className="text-foreground">AI response generation:</strong> We use review
                  content to generate tailored response suggestions using AI, helping you respond
                  to guests more efficiently.
                </li>
                <li>
                  <strong className="text-foreground">Quality scoring:</strong> We evaluate existing
                  responses against quality criteria to help you improve your guest communication.
                </li>
                <li>
                  <strong className="text-foreground">Platform operation:</strong> We use your account
                  information to authenticate you, manage subscriptions, and provide customer
                  support.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">
                4. Data Collection Methods
              </h2>
              <p>
                We use automated data collection tools to gather publicly available reviews from
                OTA platforms. These tools access only publicly visible information — the same
                data any internet user can see when visiting the review pages. Data collection
                is performed on a per-hotel basis, strictly limited to properties you have
                registered and are authorized to manage.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">5. Data Storage &amp; Security</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>All data is stored in encrypted databases with access controls.</li>
                <li>Passwords are hashed using bcrypt before storage.</li>
                <li>
                  Platform credentials (if provided for direct posting features) are encrypted
                  using AES-256-GCM and never exposed to the browser.
                </li>
                <li>We use HTTPS for all data transmission.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">6. Data Sharing</h2>
              <p>
                We do not sell, rent, or share your data with third parties, except:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>
                  <strong className="text-foreground">Service providers:</strong> We use Stripe for
                  payment processing and OpenAI/Anthropic for AI processing. These providers
                  process data as needed to deliver their services and are bound by their own
                  privacy policies.
                </li>
                <li>
                  <strong className="text-foreground">Legal requirements:</strong> We may disclose
                  data if required by law, regulation, or legal process.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">7. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active. Upon account
                deletion, we will remove your personal data and hotel data within 30 days.
                Anonymized, aggregated data may be retained for service improvement.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">8. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Export your data in a standard format</li>
                <li>Withdraw consent to data collection (by closing your account)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">9. Cookies</h2>
              <p>
                We use essential cookies for authentication and session management. We do not
                use tracking or advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of
                material changes via email or through the Service. Continued use after changes
                constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">11. Contact</h2>
              <p>
                For privacy-related questions or to exercise your rights, contact us at{" "}
                <a href="mailto:privacy@upstar.com" className="text-gold-light hover:text-gold transition-colors">
                  privacy@upstar.com
                </a>.
              </p>
            </section>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/terms"
            className="text-gold-light hover:text-gold text-sm transition-colors"
          >
            View Terms of Service &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
