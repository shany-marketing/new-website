import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | RatingIQ",
  description: "RatingIQ Privacy Policy — Effective July 8, 2025",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-16" style={{ background: "var(--page-gradient)" }}>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-block mb-8">
          <img src="/logo.svg" alt="RatingIQ" style={{ height: "36px", width: "auto" }} className="logo-light" />
          <img src="/logo-white.svg" alt="RatingIQ" style={{ height: "36px", width: "auto" }} className="logo-dark" />
        </Link>

        <div className="rounded-3xl p-8 md:p-12" style={{ background: "linear-gradient(135deg, var(--glass-bg) 0%, var(--glass-bg-end) 100%)", border: "1px solid var(--glass-border)", boxShadow: "var(--card-shadow)" }}>
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted text-sm mb-1">UpStar Five Ltd</p>
          <p className="text-muted text-sm mb-10">Effective Date: July 8, 2025</p>

          <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--text-secondary)" }}>
            UpStar Five Ltd (&quot;RatingIQ&quot; or &quot;we&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, share, and safeguard personal data in connection with our Services and outlines your rights concerning your data. We adhere to applicable data protection laws, including the EU General Data Protection Regulation (GDPR) and Israeli privacy law (the Israeli Protection of Privacy Law of 1981), as well as other international standards, to ensure your data is handled lawfully and transparently.
          </p>

          <div className="space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">19. Who We Are and Contact Information</h2>
              <p className="mb-3"><strong className="text-foreground">Data Controller:</strong> UpStar Five Ltd, Company No. 517163234, is the primary entity responsible for personal data collected via our Services. We are an Israeli company with our registered address at HaBrosh St 9, Beit Nekofa, Jerusalem district, Israel. For the purposes of the GDPR and other data protection laws, we are the &quot;data controller&quot; for the personal data you provide to us directly as a customer. When we process personal data on behalf of a hotel about its guests, we act as a &quot;data processor&quot; for our customer (the hotel).</p>
              <p className="mb-3"><strong className="text-foreground">Data Protection Officer:</strong> We have appointed a Data Protection Officer (DPO) to oversee our privacy practices. Our DPO is Omri Azulay. You may contact our DPO with any questions or requests regarding your data at <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a> (please include &quot;Attn: DPO&quot; in the subject line) or by mail at the address above.</p>
              <p><strong className="text-foreground">EU Representative (GDPR Art. 27):</strong> As we are based outside the European Union and offer services to EU-based customers, we are in the process of appointing an EU GDPR representative, as required by Article 27 of the GDPR. Once this representative is appointed, we will update this Privacy Policy with their contact details. In the meantime, EU residents may still contact our DPO or email us directly with any GDPR-related queries.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">20. Scope of this Privacy Policy</h2>
              <p className="mb-3">This Privacy Policy applies to personal data that we collect or process when you use our Services, visit our website, or otherwise interact with us. It covers:</p>
              <ul className="list-disc pl-6 space-y-2 mb-3">
                <li>20.1. Hotel customer data: e.g., contact details of hotel staff who use our services, account information, and communications.</li>
                <li>20.2. Data related to guest feedback that our hotel customers handle via our services (such as guest reviews content, ratings, or reservation identifiers).</li>
                <li>20.3. Any other personal information we process in providing our AI chatbot and analytics services.</li>
              </ul>
              <p>This policy does not cover data processing by third-party platforms that we do not control, such as WhatsApp/Meta or other sites where guest reviews are initially posted. By using our Services or submitting personal data to us, you acknowledge that you have read and understood this Privacy Policy.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">21. Data We Collect</h2>
              <p className="mb-3">We only collect data that is necessary for the purposes described in this policy. The types of personal data we collect and process include:</p>
              <div className="space-y-3">
                <p><strong className="text-foreground">21.1. Hotel and User Contact Information:</strong> When you or your employer signs up for our services, we collect the contact details of the authorized users, including name, work email address, job title, phone number (including WhatsApp number), and the hotel&apos;s name and business contact information.</p>
                <p><strong className="text-foreground">21.2. Account Credentials:</strong> If an account login is used, we collect usernames and passwords (which are stored securely and encrypted). For WhatsApp-based access, we use your phone number as an identifier.</p>
                <p><strong className="text-foreground">21.3. Guest Review Content:</strong> The core function of our Replier service is to process guest reviews and craft responses. We therefore handle the content of public guest reviews about your hotel. These reviews may include the guest&apos;s name or username, their rating, visit date, and the accompanying comment text. We treat all review content as personal data to be safe, even if it&apos;s public.</p>
                <p><strong className="text-foreground">21.4. Guest Identifiers (Reservation Numbers):</strong> We allow you to optionally provide a reservation number or code related to a guest when asking for a response or analysis. We will treat any reservation identifiers as confidential and use them to tailor the AI&apos;s response more effectively.</p>
                <p><strong className="text-foreground">21.5. Hotel Performance Data (for Prestige):</strong> For our Prestige service, we may gather or generate data, such as aggregated review scores over time, response rates, common categories of feedback, and other performance analytics about your hotel.</p>
                <p><strong className="text-foreground">21.6. Communication Records:</strong> We keep records of our communications with you. This includes WhatsApp chats between you and our bot or support team, emails you send to us, and any support tickets or calls you initiate.</p>
                <p><strong className="text-foreground">21.7. Usage Data and Device Information:</strong> When you use our web platform or website, we may collect technical information, such as your IP address, browser type, device type, operating system, and browsing actions via cookies or log files.</p>
                <p><strong className="text-foreground">21.8. Payment and Billing Info:</strong> Our primary payment method is bank transfer, so we typically only collect your billing contact details and record of payments. We do not directly collect or process credit card numbers or bank account numbers of customers through our site.</p>
                <p><strong className="text-foreground">21.9. Consents and Preferences:</strong> We may record whether you have given consent for specific data uses and any opt-out preferences.</p>
              </div>
              <p className="mt-3">We do not actively collect any sensitive personal data (such as racial or ethnic origin, political opinions, or health information) from customers or their guests. We ask that you refrain from sending us any sensitive personal data about yourself or your guests through the Services.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">22. How We Use Your Data</h2>
              <p className="mb-3">We use the collected data to provide, maintain, and improve our Services, and to communicate with you. Specifically, we use personal data for the following purposes:</p>
              <div className="space-y-3">
                <p><strong className="text-foreground">22.1. Providing the AI Reply Service:</strong> We utilize the guest review content and any context you provide to generate suggested replies via our AI. The data is fed into the AI algorithm, which returns a reply that we deliver back to you.</p>
                <p><strong className="text-foreground">22.2. Providing Analytics and Insights:</strong> For our Prestige service, we process the collected guest feedback data to produce analytical reports, dashboards, and other relevant insights.</p>
                <p><strong className="text-foreground">22.3. Improving AI Models and Services:</strong> We may use the data you provide (including reviews, responses, and usage patterns) to train or fine-tune our AI models or to develop new features. Whenever feasible, we anonymize or aggregate data for this purpose.</p>
                <p><strong className="text-foreground">22.4. Customer Support:</strong> We use your contact information and relevant data to assist you when you contact us with a question or if our system detects an issue.</p>
                <p><strong className="text-foreground">22.5. Communicating with You:</strong> We use your contact details to send operational communications. This includes messages about billing, service updates, security or privacy notices, and changes to terms or features.</p>
                <p><strong className="text-foreground">22.5.1. Marketing and News (Optional):</strong> We do not spam our customers with marketing materials, but if you are interested and give your consent, we may occasionally send you a newsletter or offer. We will obtain your consent before using your email address for marketing purposes, and you can opt out at any time.</p>
                <p><strong className="text-foreground">22.6. Billing and Account Management:</strong> We use billing information to issue invoices, process payments, and handle accounting.</p>
                <p><strong className="text-foreground">22.7. Security and Fraud Prevention:</strong> We may process personal data to ensure the security of our systems and detect fraud or abuse.</p>
                <p><strong className="text-foreground">22.8. Legal Compliance:</strong> We will use and disclose personal data as required to comply with our legal obligations.</p>
              </div>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">23. Legal Bases for Processing (GDPR Notice)</h2>
              <p className="mb-3">If you are in the European Economic Area (EEA), the UK, or another jurisdiction that requires a legal justification for data processing, the legal bases on which we rely are:</p>
              <div className="space-y-3">
                <p><strong className="text-foreground">23.1. Performance of a Contract:</strong> Article 6(1)(b) GDPR. We process most personal data as necessary to fulfill our contractual obligations to you. For example, using guest review data to generate replies or using your contact info to provide support.</p>
                <p><strong className="text-foreground">23.2. Legitimate Interests:</strong> Article 6(1)(f) GDPR. We process some data for our legitimate interests, which include improving our services, securing our platform, understanding how customers use our services, and communicating necessary information.</p>
                <p><strong className="text-foreground">23.3. Consent:</strong> Article 6(1)(a) GDPR. In certain cases, we ask for your consent before processing your data. For example, if we ever need to use a customer&apos;s testimonial or identify them in marketing materials. You can withdraw your consent at any time by contacting us.</p>
                <p><strong className="text-foreground">23.4. Legal Obligation:</strong> Article 6(1)(c) GDPR. When we are required to comply with a legal obligation, such as retaining transaction records for tax audits or providing information to law enforcement in response to a lawful request.</p>
              </div>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">24. Cookies and Tracking</h2>
              <p className="mb-3">For users of our website and dashboard, we may use cookies or similar technologies to collect usage data and enhance the user experience. We use:</p>
              <ul className="list-disc pl-6 space-y-2 mb-3">
                <li><strong className="text-foreground">24.1. Essential Cookies:</strong> to enable core functionality (e.g., maintaining your login session on the dashboard).</li>
                <li><strong className="text-foreground">24.2. Analytics Cookies:</strong> to collect anonymous statistics about usage (e.g., Google Analytics or similar) to help us improve our interface.</li>
                <li><strong className="text-foreground">24.3. No Targeted Ads:</strong> We do not use advertising or third-party targeting cookies on our service.</li>
              </ul>
              <p>When required by law, we will ask for your consent before using non-essential cookies. You can adjust your browser settings to refuse cookies, but some features of the service may not function correctly without them.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">25. How We Share Data</h2>
              <p className="mb-3">We treat your data as confidential and do not sell it. We only share data as necessary to provide our Services or as required by law:</p>
              <div className="space-y-3">
                <div>
                  <p className="mb-2"><strong className="text-foreground">25.1. Sub-Processors and Service Providers:</strong> We use trusted third-party companies to support our operations. Our key sub-processors are:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong className="text-foreground">Meta (WhatsApp):</strong> Our Replier service operates via WhatsApp. When you send messages and data to our WhatsApp bot, that data is transmitted through WhatsApp&apos;s systems.</li>
                    <li><strong className="text-foreground">OpenAI:</strong> Our AI-generated replies and some analytics are powered by OpenAI. The text of guest reviews and related inputs you provide are sent to and processed by OpenAI&apos;s servers. OpenAI&apos;s API terms state that they do not use API data to train their models by default.</li>
                    <li><strong className="text-foreground">Landbot S.L.:</strong> We utilize services from Landbot.io as part of our chatbot interface. Landbot is GDPR-compliant and hosted in the EU.</li>
                    <li><strong className="text-foreground">Microsoft (OneDrive/Azure):</strong> We use Microsoft&apos;s cloud services for data storage and backup. Data held in OneDrive may be stored on servers within the EU, Israel, or the United States.</li>
                    <li><strong className="text-foreground">Anthropic PBC (Claude):</strong> We employ large-language-model services from Anthropic to perform advanced text analytics and summarization of guest-review data. Anthropic&apos;s API terms state that customer data sent via the Claude API is not retained for model training.</li>
                    <li><strong className="text-foreground">Google LLC (Gemini models on Vertex AI):</strong> For specific insight workflows, we utilize Google&apos;s Gemini family of models delivered through Vertex AI. Google processes this data solely to return the requested model output.</li>
                  </ul>
                </div>
                <p><strong className="text-foreground">25.2. Within Our Organization:</strong> Our team members will have access to personal data on a need-to-know basis. All staff are bound by confidentiality and data protection obligations.</p>
                <p><strong className="text-foreground">25.3. Legal Requirements and Safety:</strong> We may disclose personal data if required to do so by law or in response to valid requests by public authorities. We will try to notify you if a request for your data has been made, unless we are legally prohibited from doing so.</p>
                <p><strong className="text-foreground">25.4. Business Transfers:</strong> If we are involved in a merger, acquisition, investment, restructuring, or sale of assets, personal data may be transferred to the involved third party as part of that transaction. We would ensure that any such party is bound to respect the personal data in a way consistent with this Privacy Policy.</p>
                <p><strong className="text-foreground">25.5. With Your Consent:</strong> We will share your data with others if you specifically request or consent to such sharing.</p>
              </div>
              <p className="mt-3">We do not sell, rent, or trade your personal information to unrelated third parties for their promotional purposes. We do not share your hotel&apos;s data with other hotels or clients. Each customer&apos;s data is segregated.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">26. International Data Transfers</h2>
              <p className="mb-3">We are based in Israel, and our sub-processors operate in various countries (Israel, the United States, and the European Union). We handle international transfers in compliance with applicable laws:</p>
              <div className="space-y-2">
                <p><strong className="text-foreground">26.1. Israel:</strong> The European Commission has determined that Israel offers an adequate level of data protection for personal data transferred from the EU, so data can flow from the EU/EEA to Israel lawfully under GDPR.</p>
                <p><strong className="text-foreground">26.2. United States:</strong> For transfers from the EEA or the UK to U.S.-based providers, we rely on Standard Contractual Clauses (SCCs) as our transfer mechanism.</p>
                <p><strong className="text-foreground">26.3. European Union:</strong> Landbot is based in the EU, and Microsoft may also host in the EU.</p>
                <p><strong className="text-foreground">26.4. Other Countries:</strong> If we or our sub-processors transfer data to other countries without an adequacy decision, we will ensure a valid transfer mechanism is in place.</p>
              </div>
              <p className="mt-3">You can request a copy of the relevant transfer safeguards, such as Standard Contractual Clauses, by contacting us.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">27. Data Retention and Deletion</h2>
              <p className="mb-3">We retain personal data only for as long as necessary to fulfill the purposes outlined in this policy or as required by law:</p>
              <div className="space-y-3">
                <p><strong className="text-foreground">27.1. During Subscription:</strong> For active customers, we retain all relevant data for the duration of the subscription to ensure uninterrupted service provision.</p>
                <p><strong className="text-foreground">27.2. After Termination:</strong> Upon termination or cancellation of your subscription, we will retain your data for up to 24 months (2 years), unless you request earlier deletion or unless a longer retention is required by law. During this post-termination retention, your account will be inactive. You may request a data export or deletion during this time.</p>
                <p><strong className="text-foreground">27.3. End of Retention Period:</strong> After 24 months following contract termination, we will delete or anonymize the personal data associated with your account. Anonymized aggregate statistics may be retained indefinitely as they pose no privacy risk.</p>
                <p><strong className="text-foreground">27.4. Legal Requirements:</strong> We might retain certain information for longer if required to do so by law. For example, financial transaction records may be kept for 7 years or the period required under Israeli accounting or tax law.</p>
                <p><strong className="text-foreground">27.5. Trial Users:</strong> If you use a free trial and do not continue with a paid subscription, we will delete the data collected during the trial within a reasonable time (generally within a few months after the trial ends), unless you consent to remain on a mailing list.</p>
              </div>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">28. Data Security</h2>
              <p className="mb-3">We take appropriate security measures to protect personal data from unauthorized access, alteration, disclosure, or destruction. These include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-foreground">28.1. Encryption:</strong> All communications between you and us are encrypted in transit using TLS/HTTPS, where applicable. Data stored in our databases is encrypted at rest using strong encryption algorithms.</li>
                <li><strong className="text-foreground">28.2. Access Controls:</strong> We limit access to personal data to those employees, contractors, and service providers who have a legitimate need to know. We use role-based access control and two-factor authentication for administrative access.</li>
                <li><strong className="text-foreground">28.3. Monitoring and Testing:</strong> We monitor our systems for possible vulnerabilities and attacks, keep our software and infrastructure up to date with security patches, and perform regular backups.</li>
                <li><strong className="text-foreground">28.4. Employee Training and Policies:</strong> All personnel are trained on data protection and are bound by confidentiality agreements.</li>
                <li><strong className="text-foreground">28.5. Physical Security:</strong> Our cloud providers maintain physical security at their data centres.</li>
                <li><strong className="text-foreground">28.6. Security by Design:</strong> We integrate security considerations into our feature development, avoiding storing more data than needed and sanitizing inputs to prevent injection attacks.</li>
              </ul>
              <p className="mt-3">Despite all measures, no system is 100% secure. In the unlikely event of a data breach involving personal data, we will promptly notify affected customers and the relevant authorities as required by law. You are responsible for maintaining the security of your account credentials. If you suspect any unauthorized access to your account, notify us immediately.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">29. Your Rights and Choices</h2>
              <p className="mb-3">Depending on your jurisdiction, you have certain legal rights regarding your data. For individuals in the EU/EEA, UK, Israel, and many other regions, the following rights apply:</p>
              <div className="space-y-3">
                <p><strong className="text-foreground">29.1. Right of Access:</strong> You have the right to request a copy of the personal data we hold about you, and to obtain information about how we process it.</p>
                <p><strong className="text-foreground">29.2. Right to Rectification:</strong> If any of the data we hold about you is inaccurate or incomplete, you have the right to request its correction or update.</p>
                <p><strong className="text-foreground">29.3. Right to Erasure:</strong> You have the right to request that we delete your data (the &quot;right to be forgotten&quot;). We will honour such requests to the extent required by law.</p>
                <p><strong className="text-foreground">29.4. Right to Restrict Processing:</strong> You have the right to ask us to restrict or suspend the processing of your personal data in certain circumstances.</p>
                <p><strong className="text-foreground">29.5. Right to Data Portability:</strong> For data you provided to us directly and that we process using automated means, you have the right to request that we offer it to you in a structured, commonly used, machine-readable format.</p>
                <p><strong className="text-foreground">29.6. Right to Object:</strong> You may have the right to object to our processing of your data when we process it on the legal basis of legitimate interests. You also have an unconditional right to object to the use of your data for direct marketing.</p>
                <p><strong className="text-foreground">29.7. Right to Withdraw Consent:</strong> If we rely on your consent for any processing, you have the right to withdraw that consent at any time. Withdrawing consent will not affect the lawfulness of processing done before the withdrawal.</p>
                <p><strong className="text-foreground">29.8. Right not to be subject to Automated Decision-Making:</strong> Our AI provides suggestions, but these do not amount to legal or similarly significant decisions made solely by automated means. There is always a human (the hotel user) in the loop deciding whether to use the AI&apos;s suggestion.</p>
              </div>
              <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a> (Attn: Privacy/DPO). We may need to verify your identity to process specific requests. We will respond to requests within the timeframe required by law (under GDPR, typically within one month). There is no fee for legitimate requests.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">30. Children&apos;s Privacy</h2>
              <p>Our Services are not directed to children under the age of 18. We do not knowingly collect personal data from individuals under the age of 18. If we become aware that we have inadvertently received personal data from a child under 18, we will delete it. If you believe we may have any information about or from a minor, please contact us immediately.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">31. Updates to this Privacy Policy</h2>
              <p className="mb-3">We reserve the right to update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or other operational reasons. If we make material changes, we will notify you by appropriate means, such as email to account holders or by placing a prominent notice on our website or dashboard. The &quot;Effective Date&quot; at the top indicates when the latest changes take effect.</p>
              <p>If you continue to use the Services after a revised Privacy Policy has become effective, you are deemed to have accepted the updated policy. If you disagree with the changes, you should stop using the Services and may request that we delete your data.</p>
            </section>

            <section>
              <h2 className="text-foreground font-semibold text-lg mb-3">32. Contact Us</h2>
              <p className="mb-3">If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-foreground">By Email:</strong> <a href="mailto:hotels@rating-iq.com" className="transition-colors" style={{ color: "var(--gold)" }}>hotels@rating-iq.com</a> (please include &quot;Privacy&quot; or &quot;DPO&quot; in the subject to route your query properly).</li>
                <li><strong className="text-foreground">By Phone to Omri Azulay:</strong> +972-542-533-296 (available during regular business hours, Israel Time).</li>
                <li><strong className="text-foreground">By Mail to Omri Azulay:</strong> Data Protection Officer, UpStar Five Ltd, HaBrosh St 9, Beit Nekofa, Jerusalem, 0090830, Israel.</li>
              </ul>
              <p className="mt-3">We will address your inquiry as soon as possible. If you are in the EU/EEA or the UK and feel that we have not adequately addressed your privacy concern, you have the right to complain to your country&apos;s data protection supervisory authority. We would appreciate the chance to deal with your concerns first, so please consider reaching out to us or our DPO before involving regulators.</p>
              <p className="mt-3">We are committed to protecting your privacy and will do our best to resolve any issue. Thank you for trusting us with your hotel&apos;s data. We take that responsibility seriously.</p>
            </section>

          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/terms" className="text-sm transition-colors" style={{ color: "var(--gold)" }}>
            View Terms of Use &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
