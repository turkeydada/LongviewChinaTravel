import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { site } from "@/config/site";
import { Navbar } from "@/sections/Navbar";
import { Footer } from "@/sections/Footer";

/* ---------------------------------------------------------------------------
 * 法律与信息页面共享渲染器：黑色主题 + 顶部导航 + 页脚。
 * 内容为英文（站点默认语言）；新增页面只需在 content 里加一条并在 App.tsx 加路由。
 * ------------------------------------------------------------------------- */

export type LegalSection = { heading: string; body: string[] };

export function LegalPage({ title, updated, intro, sections }: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 sm:pt-40">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
          <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50 transition hover:text-white">
            <ArrowLeft size={14} /> Back to home
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-neutral-500">Last updated: {updated}</p>
          <p className="mt-6 leading-relaxed text-neutral-400">{intro}</p>
        </motion.div>

        <div className="mt-14 space-y-12">
          {sections.map((s, i) => (
            <motion.section
              key={s.heading}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                <span className="mr-3 text-neutral-600">{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </h2>
              <div className="mt-4 space-y-3 border-l border-white/10 pl-6">
                {s.body.map((p, j) => (
                  <p key={j} className="text-sm leading-relaxed text-neutral-400">{p}</p>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        <div className="mt-20 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm leading-relaxed text-neutral-400">
            Questions about this page? Contact us at{" "}
            <a href={`mailto:${site.email}`} className="text-white underline underline-offset-4 hover:text-white/70">
              {site.email}
            </a>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* ------------------------------ 页面内容 ------------------------------ */

const CONTACT_SHORT =
  "Longview China Travel (" + "\"we\", \"us\", \"our\") can be reached at longviewchinatravel@gmail.com or on WhatsApp at +44 7511987919.";

export function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 2026"
      intro={"This Privacy Policy explains what personal information " + CONTACT_SHORT + " We collect it when you use our website, fill in a trip-planning form, or contact us, and we explain below how we use, share, and protect it."}
      sections={[
        {
          heading: "Information we collect",
          body: [
            "Trip-planning forms: your name, email address, WhatsApp number, travel dates, destinations, group size, hotel and service preferences, special requirements, and any companion details you choose to provide.",
            "Contact details: when you email or message us, we keep the correspondence so we can respond and plan your trip.",
            "Technical data: standard server logs (IP address, browser type, pages visited) used for security and to keep the site working smoothly. We do not use these logs to identify individual visitors.",
            "Anonymous usage analytics: to understand how the site is used and improve it, we collect aggregated, non-identifying statistics — pages viewed, approximate time spent on a page, which buttons or links are clicked, how far down a page visitors scroll, the type of device used (phone, tablet, or computer), the general region the visit comes from (country level only), and whether a trip-planning form was started or submitted. These statistics are stored on our own server (Cloudflare) and are never sold or shared with advertisers.",
          ],
        },
        {
          heading: "How we use your information",
          body: [
            "To design and arrange your itinerary, obtain quotes, book flights, hotels, cars, guides, interpreters, and other services you request.",
            "To respond to your enquiries and send confirmations, updates, or travel documents.",
            "To improve our website and services based on how visitors use them.",
            "We do not sell, rent, or trade your personal information to third parties for their marketing purposes.",
          ],
        },
        {
          heading: "How we share your information",
          body: [
            "Service providers: airlines, hotels, car companies, guides, interpreters, and activity operators receive only the details needed to deliver your booking (for example, your name and travel dates).",
            "Email delivery: form submissions are delivered to our inbox through FormSubmit, which processes the message on its servers to forward it to us.",
            "Legal requirements: we may disclose information if required by law or to protect our rights and the safety of our customers.",
          ],
        },
        {
          heading: "Data retention",
          body: [
            "We keep enquiry and booking records for as long as needed to plan and complete your trip, and for up to 24 months afterwards to handle follow-up questions, refunds, or disputes. You can ask us to delete your data at any time.",
          ],
        },
        {
          heading: "Cookies",
          body: [
            "Our site stores only essential technical data in your browser, such as your language preference, form progress, and an anonymous random identifier used for our own usage statistics, so the site remembers your choices between visits. We do not use third-party advertising or tracking cookies. See our Cookie Policy for details.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "Depending on where you live (including under the GDPR, UK GDPR, and similar laws), you may have the right to access, correct, delete, or export your personal data, and to object to certain processing. Email us and we will respond within 30 days.",
            "If you believe we have mishandled your data, you may complain to your local data-protection authority.",
          ],
        },
        {
          heading: "Security",
          body: [
            "We limit access to personal data to people actively working on your trip, use encrypted connections (HTTPS) on our website, and choose service providers that take data protection seriously. No method of transmission over the internet is 100% secure, but we work hard to protect your information.",
          ],
        },
        {
          heading: "Changes to this policy",
          body: [
            "We may update this policy from time to time. The latest version is always posted on this page with its update date. Material changes will be highlighted when you next contact us.",
          ],
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 2026"
      intro={"These Terms govern your use of the Longview China Travel website and the travel-planning services we provide. By using the site or submitting a trip request, you agree to these Terms."}
      sections={[
        {
          heading: "Who we are",
          body: [
            "Longview China Travel is an inbound travel agency arranging tailor-made leisure and business travel in China for visitors from abroad, including flights, hotels, private cars, drivers, guides, interpreters, tickets, and related services.",
          ],
        },
        {
          heading: "Trip requests and quotes",
          body: [
            "Submitting the trip-planning form is a request, not a booking. Each itinerary is tailored, so prices are quoted individually based on your dates, group size, and service choices.",
            "A booking is confirmed only after you accept a written quote and pay any deposit we require. We will always tell you the total price and what is included before you commit.",
          ],
        },
        {
          heading: "Prices and payment",
          body: [
            "Quoted prices are normally in USD unless stated otherwise, and include the services listed in your quote. Items not listed (visas, personal expenses, optional activities) are excluded.",
            "Payment methods and schedules are set out in each quote. Services are reserved once the agreed payment is received; until then availability cannot be guaranteed.",
          ],
        },
        {
          heading: "Changes by you",
          body: [
            "You can request changes to your itinerary before departure. We will confirm whether the change is possible and whether it affects the price. Change fees or supplier charges may apply where airlines, hotels, or operators impose them.",
          ],
        },
        {
          heading: "Cancellations and refunds",
          body: [
            "Cancellation terms for each booking are set out in your quote and follow the refund rules of the relevant suppliers (airlines, hotels, car companies). Our own service fees are refundable as described in our Refund Policy.",
            "If we cancel a service for reasons within our control, you will receive a full refund for that service or a suitable alternative.",
          ],
        },
        {
          heading: "Our responsibility",
          body: [
            "We arrange services provided by airlines, hotels, transport companies, guides, and other suppliers. While we carefully select our partners, we are not liable for acts or omissions of these suppliers, for events beyond our control (weather, strikes, government action, epidemics), or for losses caused by inaccurate information you provide.",
            "Our liability for any claim is limited to the amount you paid us for the service giving rise to the claim, to the extent permitted by law.",
            "We strongly recommend that every traveller hold valid travel insurance covering medical care, cancellation, and personal belongings for the whole trip.",
          ],
        },
        {
          heading: "Your responsibilities",
          body: [
            "You are responsible for holding a valid passport and any visas or permits required to enter China, and for complying with local laws and customs. Chinese law requires foreign visitors to register their accommodation; our partner hotels normally handle this.",
            "You must provide accurate information (names, dates, passport details) when booking. Errors caused by incorrect information may incur supplier change fees.",
          ],
        },
        {
          heading: "Intellectual property",
          body: [
            "All content on this website — text, images, video, itineraries, and the Longview China logo — belongs to us or our licensors. You may view and share links to the site, but you may not copy or reuse our content commercially without written permission.",
          ],
        },
        {
          heading: "Governing law",
          body: [
            "These Terms are governed by the laws of England and Wales. Any dispute will be resolved in the courts of England and Wales, unless mandatory consumer law gives you the right to bring a claim elsewhere.",
          ],
        },
      ]}
    />
  );
}

export function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      updated="October 2026"
      intro={"This Cookie Policy explains what cookies and similar storage technologies our website uses, why, and how you can control them."}
      sections={[
        {
          heading: "What are cookies?",
          body: [
            "Cookies are small text files a website stores in your browser to remember information between visits or during a single visit. Similar technologies include browser storage (localStorage), which our site also uses.",
          ],
        },
        {
          heading: "What we store",
          body: [
            "Language preference: we remember whether you chose English, Chinese, Italian, or Spanish so the site opens in your language next time.",
            "Trip form progress: while you fill in our trip planner, your choices are kept in your browser so you can go back, edit, and continue without losing anything. This data stays on your device and is only sent to us when you press submit.",
            "Admin preferences: if you use our content console, a flag is stored to load your saved settings.",
            "Anonymous usage statistics: a random identifier stored in your browser helps us count visits and understand how the site is used (see our Privacy Policy). It contains no personal information.",
          ],
        },
        {
          heading: "What we do NOT use",
          body: [
            "We do not use advertising cookies, social-media tracking pixels, or third-party analytics cookies. Your activity on this site is not profiled for advertising, and no behavioural data is shared with ad networks.",
          ],
        },
        {
          heading: "Third-party content",
          body: [
            "Some pages load fonts from Google Fonts. Google may receive standard technical information (such as your IP address) when the fonts are requested. Video and map embeds, where present, follow the privacy settings of their providers.",
          ],
        },
        {
          heading: "Managing cookies",
          body: [
            "Because we only store functional preferences, the site works fully without changing any settings. You can delete or block site data at any time in your browser settings; doing so will simply reset your language choice and clear any unsent trip form progress.",
          ],
        },
      ]}
    />
  );
}

export function RefundPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updated="October 2026"
      intro={"This policy explains when and how you can get money back after paying for a trip or service with Longview China Travel. The exact terms for your booking are always stated in your personal quote, which takes priority."}
      sections={[
        {
          heading: "Before a booking is confirmed",
          body: [
            "Trip-planning enquiries are free. If you have paid a deposit but we have not yet confirmed the service with suppliers, we will refund the full amount.",
          ],
        },
        {
          heading: "Cancellations by you",
          body: [
            "Most of what you pay goes to airlines, hotels, car companies, and guides. Each supplier has its own cancellation deadline and fee, so refunds depend on how much the suppliers return to us.",
            "General guide: cancellations made 30 or more days before departure usually qualify for a high refund; 15–29 days, a partial refund; less than 15 days, suppliers often charge the full amount, especially for flights and hotels during peak seasons.",
            "Once a supplier's deadline has passed, that portion of the payment is non-refundable. We always show the exact, per-item refund amounts before you decide to cancel.",
          ],
        },
        {
          heading: "Cancellations by us",
          body: [
            "If we have to cancel a service for reasons within our control, you can choose a full refund for that service or a comparable alternative at no extra cost. We will process the refund within 14 days of your choice.",
          ],
        },
        {
          heading: "Services not used",
          body: [
            "No refund is due for flights, hotels, cars, guides, or activities you choose not to use after the service has begun, or for no-shows, except where the supplier agrees to a partial refund.",
          ],
        },
        {
          heading: "Force majeure",
          body: [
            "Events beyond anyone's control — natural disasters, epidemics, government restrictions, strikes, or war — are handled under the supplier's policy. Where suppliers issue credits or vouchers instead of cash refunds, we will pass them on to you in full.",
          ],
        },
        {
          heading: "How refunds are paid",
          body: [
            "Refunds are returned to the original payment method where possible. Bank or payment-provider fees charged for the original transaction may be deducted. Refunds are normally completed within 14 days after the supplier confirms the refund amount to us.",
          ],
        },
        {
          heading: "How to request a refund",
          body: [
            "Email longviewchinatravel@gmail.com with your name, booking reference, and the service you wish to cancel, or message us on WhatsApp at +44 7511987919. We will reply within 2 business days with the exact refund calculation.",
          ],
        },
      ]}
    />
  );
}

export function AboutPage() {
  return (
    <LegalPage
      title="About Us"
      updated="October 2026"
      intro="Our story is coming soon. Longview China Travel is an inbound travel agency crafting tailor-made leisure and business journeys across China — flights, hotels, private cars, bilingual guides, interpreters, and every legal arrangement, designed around you."
      sections={[]}
    />
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need a visa to travel to China?",
    a: "Most visitors need a visa, which you apply for at a Chinese embassy or visa centre in your home country. Requirements vary by nationality. We will provide the invitation letter and supporting documents your visa application typically requires once your trip is confirmed, free of charge.",
  },
  {
    q: "How do I book a trip with you?",
    a: "Fill in the trip planner on this website (Leisure travel or Business travel), telling us your dates, destinations, group size, and the services you need. We reply by email or WhatsApp with a tailor-made itinerary and quote. Your booking is confirmed once you accept the quote.",
  },
  {
    q: "How much does a tailor-made trip cost?",
    a: "Every itinerary is quoted individually, because the price depends on your dates, cities, group size, and service level. As a guide, we focus on premium experiences at approachable prices — submit the form and you will receive a detailed, no-obligation quote within 1–2 business days.",
  },
  {
    q: "What languages do your guides speak?",
    a: "English is standard. Guides and interpreters in other languages (including Italian, Spanish, French, German, and more) can be arranged on request — mention your language in the trip form and we will match you.",
  },
  {
    q: "Can I customise the itinerary after I receive the quote?",
    a: "Absolutely — the itinerary is yours. Ask for as many adjustments as you like before confirming, and even small changes during the trip can usually be arranged through your guide or our assistance line.",
  },
  {
    q: "Can you help if something goes wrong during my trip?",
    a: "Yes. Every booking includes our emergency assistance line on WhatsApp. Whether it is a missed train, a medical issue, or a last-minute schedule change, our local team responds around the clock.",
  },
];

export function FaqPage() {
  return (
    <LegalPage
      title="Frequently Asked Questions"
      updated="October 2026"
      intro="Answers to the questions inbound travellers ask us most. If yours is not here, message us on WhatsApp or email — we reply within one business day."
      sections={FAQS.map((f) => ({ heading: f.q, body: [f.a] }))}
    />
  );
}
