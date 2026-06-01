import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | RatingIQ",
  description: "RatingIQ Terms of Use — Effective July 8, 2025",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen px-4 py-16" style={{ background: "var(--page-gradient)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-block mb-8">
          <img src="/logo.svg" alt="RatingIQ" style={{ height: "36px", width: "auto" }} className="logo-light" />
          <img src="/logo-white.svg" alt="RatingIQ" style={{ height: "36px", width: "auto" }} className="logo-dark" />
        </Link>

        <div className="rounded-3xl p-8 md:p-12" style={{ background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)", border: "1px solid var(--glass-border)", boxShadow: "var(--card-shadow)" }}>
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Use</h1>
          <p className="text-muted text-sm mb-1">UpStar Five Ltd</p>
          <p className="text-muted text-sm mb-10">Effective Date: July 8, 2025</p>

          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
            Welcome to RatingIQ! This document outlines our Terms of Use. UpStar Five Ltd (referred to as &quot;RatingIQ,&quot; &quot;we,&quot; or &quot;us&quot;) provides AI-powered services for hotels worldwide. By using our services, you (&quot;Customer&quot; or &quot;you&quot;) agree to the following terms and policies. Please read them carefully.
          </p>

          <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using our services, you agree to these Terms of Use and all policies referenced herein. If you disagree, you must not use our services. If you are using our services on behalf of a company (such as a hotel), you represent that you have the authority to bind that company to these terms. These Terms of Use, the Privacy Policy, and the Pricing terms form a binding agreement between UpStar Five Ltd (Company No. 517163234) and you.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">2. Our Services</h2>
              <p className="mb-3">We provide two subscription-based services for hospitality businesses:</p>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-foreground mb-1">2.1. RatingIQ Replier</h3>
                  <p>An AI chatbot service delivered via WhatsApp that helps hoteliers draft responses to public guest reviews in real time. This service uses OpenAI-powered language generation to suggest polite, context-aware replies that hotel staff can review and post to guest review platforms. The plan includes up to 300 AI-generated replies per hotel per billing month; additional replies are billed at USD 0.50 each.</p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">2.2. RatingIQ Prestige</h3>
                  <p>A subscription-based analytics and insights service that uses artificial-intelligence techniques to process guest feedback and related hotel data and to generate periodic reports and automated WhatsApp messages (the &quot;Insights&quot;). The Insights are designed to help hotels identify opportunities to enhance operational efficiency, increase revenue, and improve guest satisfaction and online ratings. RatingIQ may, at its sole discretion, make qualified personnel available for supplementary consultation; any such consultancy is optional and provided only when expressly confirmed in writing. RatingIQ does not warrant or guarantee that use of the Service will achieve any rating increase, revenue gain, or other outcome. Prestige includes the Replier functionality, allowing up to 3,000 replies per hotel per billing month. Any additional replies are charged at $0.50 each.</p>
                </div>
              </div>
              <p className="mt-3">These services (collectively, the &quot;Services&quot;) are provided by UpStar Five Ltd, headquartered in Israel, and offered to customers globally. We reserve the right to add or modify service features at any time. All use of the Services is subject to these Terms.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">3. Eligibility</h2>
              <p>Our Services are intended for business use by hotels and hospitality professionals. You must be at least 18 years old to use our services. By using the Services, you confirm that you are at least 18 years old and an employee or authorized representative of a hotel or related business. You agree to use the Services only for lawful business purposes and not for personal or household use.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">4. Account Setup and Communication</h2>
              <p>To use our services, you may need to provide certain information and set up an account or service access with us. You agree to provide accurate contact information (such as your name, hotel name, and phone number) and keep it updated. You are responsible for maintaining the confidentiality of any authentication credentials and for all activities under your account. Please notify us at <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a> if you suspect unauthorized use of your account or the Services.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">5. Subscription Plans and Fees</h2>
              <p className="mb-3">We offer our Services on a subscription basis with two main plans:</p>
              <ul className="list-disc pl-6 space-y-1 mb-3">
                <li>5.1. RatingIQ Replier Plan: Subscribe monthly or annually per hotel.</li>
                <li>5.2. RatingIQ Prestige Plan: Subscribe monthly or annually per hotel.</li>
              </ul>
              <p>You agree to pay the applicable fees for your chosen plan and term by subscribing to it. All payments are stated in U.S. Dollars (USD) unless otherwise agreed. Subscription fees are invoiced per hotel and cover use of the Services for that hotel. If you add additional hotel properties, each is subject to its subscription fee. You are responsible for any taxes or duties applicable to the fees (except taxes on our income). We will not charge VAT for international customers unless required to do so by law. However, Israeli customers may be subject to VAT as per Israeli law.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">6. Free Trial and Evaluation Use</h2>
              <p className="mb-3">We offer limited free trials so you can evaluate our Services:</p>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-foreground mb-1">6.1. Replier Free Trial</h3>
                  <p>New customers receive the first 10 message responses free of charge. This allows you to try the AI bot (via WhatsApp) to draft up to 10 guest review replies before subscribing. After the 10 complimentary messages, continued use requires a paid subscription. Hotels that later upgrade to Prestige still benefit from this per-user, per-hotel allowance.</p>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">6.2. Prestige Trial</h3>
                  <p>For hotel groups or chains considering the Prestige plan, we offer a 1-month free trial of Prestige for one hotel in the chain. This trial includes full access to the analytics for that one property during the trial period. The trial will automatically end after one month, and the Prestige service will only continue if you enter a paid subscription for that hotel (and any others you choose).</p>
                </div>
              </div>
              <p className="mt-3">Trials are available to new customers (or as otherwise agreed with us) and are intended for evaluation only. During the trial, these Terms of Use remain in effect. We reserve the right to end or withdraw a free trial if we suspect any form of abuse. After a trial, if you do not subscribe, your access to the Service will be disabled, and any data collected during the trial will be retained or deleted in accordance with our Privacy Policy and data retention rules.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">7. Payment Terms</h2>
              <p className="mb-3">We will issue subscription fee invoices, which must be paid via wire transfer to our account at Bank Hapoalim (details will be provided on the invoice). Payment is due within 30 days from the invoice date (net 30 terms). You are responsible for any bank transfer fees on your side. We currently do not accept credit cards or other payment methods unless explicitly agreed upon.</p>
              <p className="mb-3">If payment is not received by the due date, we reserve the right to suspend or terminate your access to the Services, if we have given you notice. We may also charge late-payment interest at the standard rate permitted by law for overdue invoices, accruing from the due date until payment is made in full.</p>
              <p>All fees paid are non-refundable. As is standard in the SaaS industry, we maintain a no-refunds policy for subscription fees (no pro-rated refunds for unused portions of a billing period). This means that once a payment is made for a month or year, the payment is final and will not be refunded if you decide to cancel or stop using the Service during that period, except where a refund is required by law. Please review any trial offerings before committing to a paid plan.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">8. Term, Renewal, and Cancellation</h2>
              <p className="mb-3"><strong className="text-foreground">Term and Auto-Renewal:</strong> Your subscription term will commence on the subscription start date and continue for the selected period (monthly or annual). Monthly plans continue month-to-month until cancelled. Yearly plans are valid for 12 months and will automatically renew for successive one-year terms unless cancelled with advance notice. We will provide a reminder or invoice before renewal.</p>
              <p className="mb-3"><strong className="text-foreground">Cancellation by Customer:</strong></p>
              <div className="space-y-3 mb-3">
                <p>8.1. <strong className="text-foreground">Monthly Subscription:</strong> You may cancel a monthly plan by giving us at least 30 days&apos; notice (via email to <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a>). Your subscription will remain active until the end of the next billing cycle, following a 30-day notice period.</p>
                <p>8.2. <strong className="text-foreground">Annual Subscription:</strong> Annual plans are paid in one lump-sum invoice for the full 12-month term. They are generally non-cancellable during that term. However, for Prestige annual subscribers, we offer a performance opt-out. If, after the first two months of service, your hotel&apos;s average rating on at least one of Google, Booking.com, TripAdvisor, or Expedia has not improved by 0.1 points or more compared with the baseline recorded on your start date, you may terminate the annual contract immediately by providing written notice to us together with reasonably acceptable evidence of the unchanged rating. Upon valid termination, we will refund the unused portion of the prepaid annual fee for the remaining months.</p>
                <p>8.3. All cancellation notices should be sent in writing to <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a>. Upon cancellation or expiration of your subscription, your access to the Services will end as of the termination date. We recommend exporting or saving any necessary data or reports before termination. We will retain customer data for 24 months after termination in case you reactivate or need data restored. After this period, we will delete personal data in accordance with our data retention policy.</p>
              </div>
              <p><strong className="text-foreground">Termination by Us:</strong> We reserve the right to suspend or terminate your access to the Services for cause if you materially breach these Terms (including non-payment) and do not cure the breach within 15 days of our notice. In cases of severe violation, we may suspend or terminate immediately. We may also terminate the Services at our discretion, providing you with 60 days&apos; notice, in which case we will refund any prepaid fees on a pro rata basis for the remaining term.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">9. Acceptable Use Policy</h2>
              <p className="mb-3">You agree to use the Services responsibly and in compliance with all applicable laws and regulations. You agree that you will NOT:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>9.1. Use the Services to generate or transmit any content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable, including hate speech or content that discriminates based on any characteristic.</li>
                <li>9.2. Use the Services in any manner that violates the rights of others or the law, including intellectual property rights, privacy rights, or data protection laws.</li>
                <li>9.3. Input or provide personal data of individuals (such as hotel guests) unless you have a lawful basis to do so and have obtained all necessary consents.</li>
                <li>9.4. Use the Services to send unsolicited messages or spam.</li>
                <li>9.5. Use the Services for any purpose other than hotel customer-engagement and analytics purposes for which they are intended.</li>
                <li>9.6. Interfere with or disrupt the integrity or performance of the Services, including attempting to hack, overload, or introduce viruses or malware.</li>
                <li>9.7. Reverse engineer, decompile, or otherwise attempt to discover the source code, algorithms, or trade secrets underlying the Services.</li>
                <li>9.8. Misrepresent your identity or affiliation when using the Services.</li>
                <li>9.9. Use the Services in a manner that violates WhatsApp&apos;s terms of service or OpenAI&apos;s acceptable use policies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">10. Intellectual Property Rights</h2>
              <div className="space-y-3">
                <p><strong className="text-foreground">10.1. Our IP:</strong> All rights, title, and interest in and to the Services, including our software, algorithms, AI prompt designs, models, websites, dashboards, databases, documentation, trademarks, and any other proprietary technology or content provided by us, are owned by UpStar Five Ltd or our licensors. These Terms do not transfer intellectual property rights to you except for the limited license to use the Services as described.</p>
                <p><strong className="text-foreground">10.2. Your IP and Data:</strong> You retain ownership of all content and data you provide to us, including the text of guest reviews and any information you submit. We do not claim ownership of your or your hotel&apos;s data. You grant us a license to use, process, and transmit your data solely for the purpose of providing and improving the Services.</p>
                <p><strong className="text-foreground">10.3. AI Outputs:</strong> The responses and analytical reports generated by our AI are provided for your use. To the extent any copyright or intellectual property rights vest in the AI-generated Outputs, we waive any claim to ownership of the content of those Outputs. You are free to use, edit, and publish the AI-generated replies to your guests, as well as utilize the reports and insights for your legitimate business purposes. It is your responsibility to review and ensure any AI-generated reply is appropriate before publishing it as your hotel&apos;s response.</p>
                <p><strong className="text-foreground">10.4. Anonymized Data Use:</strong> We are permitted to retain and use aggregated or anonymized data derived from your use of the Services for analytics, product improvement, and benchmarking. Any such data will be stripped of personal identifiers and not linked to your hotel&apos;s identity in any public reporting. We will not sell or disclose any personal data or customer-specific data to third parties except as described in our Privacy Policy.</p>
              </div>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">11. Privacy and Data Protection</h2>
              <p className="mb-3">11.1. Your privacy is of the utmost importance to us. Our Privacy Policy explains what data we collect and how we process and protect it. By using the Services, you also agree to the terms of the Privacy Policy. We comply with applicable data protection laws, including the EU General Data Protection Regulation (GDPR) and Israeli privacy law, to safeguard personal data.</p>
              <p className="mb-3">11.2. UpStar Five Ltd is an Israeli company, and the personal data we handle may be transferred to and processed in Israel or other countries where our service providers operate. Israel is recognized as providing adequate data protection under EU law, and for other international transfers, we implement standard safeguards (such as Standard Contractual Clauses, where required). We have appointed a Data Protection Officer and are in the process of appointing an EU representative to ensure compliance with GDPR Article 27.</p>
              <p>11.3. Please review the Privacy Policy for complete details. If you have questions about privacy or need a separate Data Processing Agreement (DPA) for your company&apos;s compliance, contact us at <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a> (Attn: Data Protection Officer).</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">12. Support and Service Level Agreement</h2>
              <div className="space-y-3">
                <p><strong className="text-foreground">12.1. Support Channels:</strong> We offer 24/7 customer support via WhatsApp and email. You can reach our support team at any time by messaging our dedicated WhatsApp support line +972-542-533-296 or emailing <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a>.</p>
                <p><strong className="text-foreground">12.2. Response Time:</strong> We aim to respond to all support inquiries within 24 hours. In practice, most queries are addressed within a few minutes.</p>
                <p><strong className="text-foreground">12.3. Prestige Consultations:</strong> If you are a Prestige customer, you have access to human consultants for advice on the insights and reports. These consultation services are provided on a best-effort basis.</p>
                <p><strong className="text-foreground">12.4. Service Availability:</strong> Our AI chatbot services rely on third-party platforms (WhatsApp, OpenAI, etc.). We cannot guarantee 100% uptime, but our goal is to maintain high availability. If there are planned downtimes or maintenance windows, we will inform you in advance.</p>
                <p><strong className="text-foreground">12.5. No Guaranteed Outcome:</strong> While our Service is designed to help improve your efficiency and guest satisfaction, we cannot guarantee specific outcomes such as a particular increase in your review scores. The Prestige plan&apos;s early termination option for lack of a 0.1-point rating increase is provided as a courtesy, but this is not a guarantee that such an increase will occur.</p>
              </div>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">13. Disclaimer of Warranties</h2>
              <p className="mb-3">Use at Your Own Risk: Our Services are provided &quot;as is&quot; and &quot;as available.&quot; To the maximum extent permitted by law, we disclaim all warranties of any kind, whether express, implied, or statutory, including any warranties of merchantability, fitness for a particular purpose, title, non-infringement, and any warranties arising from course of dealing or usage of trade.</p>
              <p className="mb-3">While we strive for accuracy and helpfulness, we do not guarantee that the AI-generated responses or analytics will be error-free, accurate, or meet all your expectations. AI is probabilistic and can sometimes produce incorrect or inappropriate suggestions. It is the user&apos;s responsibility to review AI-generated content before using it.</p>
              <p>Furthermore, we do not warrant that the Services will be uninterrupted, timely, secure, or error-free. Some jurisdictions do not allow the exclusion of certain warranties, so some of the above disclaimers may not apply to you.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">14. Limitation of Liability</h2>
              <p className="mb-3">To the fullest extent permitted by applicable law, we and our directors, officers, employees, and agents shall not be liable to you or any third party for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, goodwill, or other intangible losses, arising out of or related to your use of (or inability to use) the Services, even if we have been advised of the possibility of such damages.</p>
              <p>In no event will our total cumulative liability for all claims arising from or related to the Services exceed the total amount of fees you have paid to us in the 12 months immediately preceding the event giving rise to the liability. If you have not paid any costs (for example, if a claim arises during a free trial), our total liability shall not exceed US$100.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">15. Indemnification</h2>
              <p>You agree to indemnify, defend, and hold harmless UpStar Five Ltd and our affiliates, and our respective officers, directors, employees, and agents, from and against all claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees and costs) that arise out of or relate to: (a) your use of the Services; (b) your violation of these Terms of Use; (c) your violation of any law or regulation in connection with your use of the Services; or (d) any claim that content you provided infringes or violates the rights of a third party.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">16. Changes to Service or Terms</h2>
              <p className="mb-3"><strong className="text-foreground">16.1. Changes to Services:</strong> We reserve the right to modify or discontinue any part of the Services at any time. We will endeavour to notify you of any material changes to the Services or features you are actively using.</p>
              <p><strong className="text-foreground">16.2. Changes to Terms:</strong> We reserve the right to update these Terms of Use from time to time to reflect changes in the law or our Services. When we make material changes, we will notify customers by email or through a prominent notice on our Service before the change taking effect. If you continue to use the Services after the new Terms take effect, you will be deemed to have accepted the changes.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">17. Governing Law and Jurisdiction</h2>
              <p className="mb-3">These Terms of Use shall be governed by and construed by the laws of the State of Israel, without regard to its conflict of law principles. You and we agree that all disputes shall be subject to the exclusive jurisdiction of the courts located in Tel Aviv, Israel. Both parties consent to the personal jurisdiction of these courts and waive any objections on the grounds of venue or inconvenient forum.</p>
              <p>If you are accessing the Services from outside Israel, you are responsible for complying with local laws to the extent they apply.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">18. Miscellaneous</h2>
              <div className="space-y-3">
                <p><strong className="text-foreground">18.1. Company Details:</strong> UpStar Five Ltd is a company registered in Israel (Company No. 517163234), with its principal business address at HaBrosh St 9, Beit Nekofa, Jerusalem district, Israel.</p>
                <p><strong className="text-foreground">18.2. Communication and Notices:</strong> The primary email contact is <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a>. For any questions regarding these Terms, your subscription, or to send formal notices, please email us or send postal mail to our business address.</p>
                <p><strong className="text-foreground">18.3. Entire Agreement:</strong> These Terms of Use, together with the Privacy Policy and Pricing terms and any order form or service agreement you have executed with us, constitute the entire agreement between you and us regarding the Services and supersede any prior agreements or understandings relating to the same subject matter.</p>
                <p><strong className="text-foreground">18.4. Assignment:</strong> You may not assign or transfer any of your rights or obligations under these Terms without our prior written consent. We may assign our rights and obligations to an affiliate or in connection with a merger, acquisition, or sale of assets.</p>
                <p><strong className="text-foreground">18.5. No Waiver:</strong> If we fail to enforce any provision of these Terms, it will not be considered a waiver of our rights. Any waiver of any provision by us on one occasion shall not constitute a waiver of that provision on any other occasion.</p>
                <p><strong className="text-foreground">18.6. Severability:</strong> If any provision of these Terms is held to be invalid or unenforceable by a competent court, that provision will be enforced to the maximum extent permissible, and the remaining provisions will remain in full force and effect.</p>
                <p><strong className="text-foreground">18.7. Relationship:</strong> Nothing in these Terms creates a partnership, joint venture, agency, or employment relationship between you and us.</p>
                <p><strong className="text-foreground">18.8. Third-Party Services:</strong> Our Services rely on third-party platforms (e.g., WhatsApp provided by Meta; OpenAI&apos;s services; Landbot.io; Microsoft OneDrive). Your use of those services through us is also subject to their terms of service. We are not liable for the acts or omissions of these third-party services.</p>
                <p><strong className="text-foreground">18.9. Force Majeure:</strong> We will not be liable for any delay or failure in performance of the Services caused by circumstances beyond our reasonable control, such as acts of God, war, terrorism, civil disturbance, strikes, internet or utility failures, or actions of third-party service providers or governments.</p>
              </div>
            </section>

            <section>
              <p>If you have any questions or require clarification on these Terms of Use, please contact us at <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a>. We value our partnership with our hotel clients and aim to be transparent and fair in all our dealings.</p>
            </section>

          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/privacy" className="text-sm transition-colors" style={{ color: "var(--gold)" }}>
            View Privacy Policy &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
