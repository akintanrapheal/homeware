import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact-form';
import { Reveal } from '@/components/reveal';
import {
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/icons';
import { STORE } from '@/lib/config';
import { buildEnquiryLink } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Talk to Homeware & Co — WhatsApp, email or the contact form. Product advice, order enquiries and wholesale.',
};

const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Same day within Lagos for orders placed before 3pm WAT. One to three working days everywhere else in Nigeria, depending on the state.',
  },
  {
    q: 'Are your products genuine?',
    a: 'Yes. Everything is sourced through suppliers we have worked with for years, and carries a two-year guarantee against failure in normal home use.',
  },
  {
    q: 'Can I pay on delivery?',
    a: 'Within Lagos, yes — mention it in your order note or on WhatsApp and we will arrange it. Outside Lagos we ask for payment before dispatch.',
  },
  {
    q: 'Do you gift wrap?',
    a: 'Yes, free on request. Add a note at checkout with what you would like written on the card.',
  },
  {
    q: 'Do you sell wholesale?',
    a: 'We do, from ten units. Message us with what you are looking at and we will send the trade list.',
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8">
      <Reveal as="header" className="mb-12 max-w-2xl">
        <p className="eyebrow mb-4">Contact</p>
        <h1 className="font-display text-5xl font-light leading-tight text-ink-900 sm:text-6xl">
          Let us help you <span className="italic text-clay-600">choose once</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-ink-600">
          Order questions, what pan to buy, wholesale — whatever it is, a real person reads this.
          WhatsApp is fastest.
        </p>
      </Reveal>

      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <Reveal>
          <div className="space-y-4">
            <a
              href={buildEnquiryLink()}
              target="_blank"
              rel="noreferrer"
              className="card card-hover flex items-center gap-4 p-6"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
                <WhatsAppIcon width={22} height={22} />
              </span>
              <span>
                <span className="block text-sm text-ink-900">WhatsApp us</span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {STORE.phone} · replies in minutes
                </span>
              </span>
            </a>

            <a
              href={`mailto:${STORE.email}`}
              className="card card-hover flex items-center gap-4 p-6"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-600">
                <MailIcon width={20} height={20} />
              </span>
              <span>
                <span className="block text-sm text-ink-900">Email</span>
                <span className="mt-0.5 block text-xs text-ink-500">{STORE.email}</span>
              </span>
            </a>

            <a
              href={`tel:${STORE.phone.replace(/\s/g, '')}`}
              className="card card-hover flex items-center gap-4 p-6"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-600">
                <PhoneIcon width={20} height={20} />
              </span>
              <span>
                <span className="block text-sm text-ink-900">Call the shop</span>
                <span className="mt-0.5 block text-xs text-ink-500">{STORE.hours}</span>
              </span>
            </a>

            <div className="card flex items-center gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-600">
                <PinIcon width={20} height={20} />
              </span>
              <span>
                <span className="block text-sm text-ink-900">Visit us</span>
                <span className="mt-0.5 block text-xs text-ink-500">{STORE.address}</span>
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <a
                href={STORE.instagram}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-paper-300 py-3.5 text-xs uppercase tracking-[0.16em] text-ink-600 transition hover:border-clay-500 hover:text-clay-600"
              >
                <InstagramIcon width={16} height={16} />
                Instagram
              </a>
              <a
                href={STORE.tiktok}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-paper-300 py-3.5 text-xs uppercase tracking-[0.16em] text-ink-600 transition hover:border-clay-500 hover:text-clay-600"
              >
                <TikTokIcon width={16} height={16} />
                TikTok
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delay={110}>
          <ContactForm />
        </Reveal>
      </div>

      <section className="mt-20 sm:mt-28">
        <Reveal className="mb-10">
          <p className="eyebrow mb-3">Before you ask</p>
          <h2 className="font-display text-4xl font-light text-ink-900 sm:text-5xl">
            Common questions
          </h2>
        </Reveal>

        <div className="grid gap-3 md:grid-cols-2 md:gap-5">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 70}>
              <details className="card group p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-xl font-light text-ink-900">
                  {faq.q}
                  <span className="shrink-0 text-clay-500 transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-ink-600">{faq.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
