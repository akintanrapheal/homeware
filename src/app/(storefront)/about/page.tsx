import Link from 'next/link';
import type { Metadata } from 'next';
import { Reveal } from '@/components/reveal';
import { ProductArt } from '@/components/product-art';
import { ArrowRightIcon, ShieldIcon, SparkleIcon, TruckIcon } from '@/components/icons';
import { STORE } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Our story',
  description:
    'Why Homeware & Co exists: kitchen and table pieces chosen for how they behave, priced without the showroom markup, and packed to arrive intact.',
};

const PILLARS = [
  {
    icon: ShieldIcon,
    title: 'Authentic, or we take it back',
    body: 'Everything is sourced through suppliers we have used for years. If a piece fails in normal home use within two years, we replace it — no hunting for a receipt.',
  },
  {
    icon: SparkleIcon,
    title: 'Chosen for how it behaves',
    body: 'A pan that looks good in a showroom can warp on a high gas flame. We cook on everything before it joins the shelf, which is why the range stays deliberately short.',
  },
  {
    icon: TruckIcon,
    title: 'Packed to arrive intact',
    body: 'Double-boxed with corner protection and a WhatsApp message the moment it leaves us. Glass and stoneware arrive whole, or we replace them.',
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-paper-100">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-clay-100 blur-[100px]"
        />
        <Reveal className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="eyebrow mb-5">Our story</p>
          <h1 className="text-balance font-display text-5xl font-light leading-[1.06] text-ink-900 sm:text-6xl">
            Built for kitchens that <span className="italic text-clay-600">get used</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-ink-600">
            Homeware & Co started the way most good things do here — one person, a WhatsApp
            status, and a small box of bottles she genuinely believed in.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal className="space-y-6 text-base leading-relaxed text-ink-700">
          <p>
            The problem was never that Nigerians do not care about their kitchens. We care enormously. The
            problem was the gap between the two things on offer: thin market pans that warp in a month,
            or imported showroom prices with a markup that has nothing to do with the metal.
          </p>
          <p>
            So we did the boring, unglamorous work instead. We built relationships with suppliers we
            could actually verify. We cooked on everything in real conditions — high gas flames,
            hard water, a sink that gets overloaded on a Sunday. Anything that warped, stained or
            chipped got dropped, however good the name on the box.
          </p>
          <p>
            What survived is what you see. Around two dozen products, each one chosen because someone
            here owns it. When we say a pot holds an even simmer for three hours, it is because we
            simmered something in it for three hours.
          </p>
          <p className="font-display text-2xl font-light italic leading-relaxed text-clay-600">
            “Buying well should not mean buying twice.”
          </p>
          <p>
            That principle runs through everything — the pricing, the packing, the fact that you can
            message us on WhatsApp and get a real recommendation from a real person in about five
            minutes. We would rather sell you the right ₦42,000 board than the wrong ₦128,000 set.
          </p>
        </Reveal>
      </section>

      <section className="border-y border-paper-200 bg-paper-100 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mb-12 text-center">
            <p className="eyebrow mb-3">What we hold to</p>
            <h2 className="font-display text-4xl font-light text-ink-900 sm:text-5xl">
              Three promises
            </h2>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {PILLARS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 90}>
                <div className="card h-full p-7">
                  <Icon width={26} height={26} className="mb-5 text-clay-500" />
                  <h3 className="font-display text-2xl font-light leading-snug text-ink-900">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <div className="relative mx-auto max-w-sm">
              <div aria-hidden className="absolute inset-6 rounded-full border border-clay-300" />
              <ProductArt category="cookware" accent="clay" className="w-full" />
            </div>
          </Reveal>

          <Reveal delay={110}>
            <p className="eyebrow mb-3">Come say hello</p>
            <h2 className="font-display text-4xl font-light leading-tight text-ink-900 sm:text-5xl">
              We are one message away
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-ink-600 sm:text-base">
              Not sure where to start? Tell us what you cook and what keeps letting you down. We will
              send you two or three honest options — including the cheaper one, if the cheaper one
              is right.
            </p>
            <p className="mt-4 text-sm text-ink-500">
              {STORE.address} · {STORE.hours}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="btn btn-clay">
                Contact us
                <ArrowRightIcon width={16} height={16} />
              </Link>
              <Link href="/shop" className="btn btn-outline">
                Browse the range
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
