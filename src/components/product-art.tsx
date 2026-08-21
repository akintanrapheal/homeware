import type { Accent, CategoryId } from '@/lib/types';

/**
 * Generated artwork. Until real product photography exists, every card renders
 * a silhouette built from the item's own category and accent — so the grid
 * reads as one deliberate collection rather than a wall of placeholder boxes.
 * The moment a product gets an `imageUrl`, that photo is used instead.
 *
 * Drawn light-on-light to suit a paper background: soft fills, a warm ground
 * shadow, and line work rather than glow.
 */

const ACCENTS: Record<Accent, { base: string; light: string; line: string }> = {
  clay: { base: '#C07A55', light: '#F2DCCF', line: '#8B4F32' },
  sage: { base: '#7D9B78', light: '#DCE7D9', line: '#4F6B4B' },
  sand: { base: '#C4A469', light: '#F0E4CB', line: '#8C7340' },
  slate: { base: '#6F7D89', light: '#DDE3E8', line: '#46525C' },
  copper: { base: '#B87754', light: '#F2DDD1', line: '#875133' },
  ink: { base: '#4A443C', light: '#DEDAD3', line: '#2A2620' },
};

type ShapeProps = { base: string; light: string; line: string; grad: string };

/** Casserole / pot: wide body, two handles, domed lid. */
function Pot({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <ellipse cx="150" cy="126" rx="72" ry="12" fill={light} />
      <path d="M96 118h108" stroke={line} strokeWidth="2" strokeOpacity="0.35" />
      <rect x="138" y="96" width="24" height="12" rx="5" fill={base} />
      <path d="M84 122h132a6 6 0 0 1 6 6v8H78v-8a6 6 0 0 1 6-6Z" fill={base} opacity="0.9" />
      <path
        d="M86 140h128l-9 96a26 26 0 0 1-26 22h-58a26 26 0 0 1-26-22l-9-96Z"
        fill={`url(#${grad})`}
        stroke={line}
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      <path d="M78 160h-14a12 12 0 0 0 0 24h16" stroke={line} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M222 160h14a12 12 0 0 1 0 24h-16" stroke={line} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

/** Frying pan seen at an angle: shallow bowl plus a long handle. */
function Pan({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <ellipse cx="140" cy="196" rx="88" ry="34" fill={`url(#${grad})`} stroke={line} strokeOpacity="0.4" strokeWidth="2" />
      <ellipse cx="140" cy="190" rx="72" ry="26" fill={light} opacity="0.9" />
      <path d="M226 190h44a10 10 0 0 1 10 10v6a10 10 0 0 1-10 10h-42" fill={base} opacity="0.9" />
      <circle cx="266" cy="203" r="4" fill={light} />
    </>
  );
}

/** Chef's knife: blade plus riveted handle. */
function Knife({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <path
        d="M62 176c46-30 96-52 132-58l6 18c-30 12-70 32-104 54l-34-14Z"
        fill={`url(#${grad})`}
        stroke={line}
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      <path d="M70 180c40-24 84-42 118-50" stroke={light} strokeWidth="3" fill="none" opacity="0.9" />
      <path d="M200 136l44-12a10 10 0 0 1 12 8l4 16a10 10 0 0 1-8 12l-44 10-8-34Z" fill={base} />
      <circle cx="222" cy="140" r="3" fill={light} />
      <circle cx="240" cy="136" r="3" fill={light} />
    </>
  );
}

/** Kettle: rounded body with a gooseneck spout. */
function Kettle({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <ellipse cx="150" cy="286" rx="70" ry="12" fill={light} />
      <path
        d="M96 150h108l10 108a20 20 0 0 1-20 22h-88a20 20 0 0 1-20-22l10-108Z"
        fill={`url(#${grad})`}
        stroke={line}
        strokeOpacity="0.4"
        strokeWidth="2"
      />
      <rect x="118" y="132" width="64" height="20" rx="8" fill={base} />
      <rect x="136" y="116" width="28" height="18" rx="7" fill={base} opacity="0.85" />
      <path
        d="M204 176c30 4 44 22 44 52"
        stroke={line}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M92 186c-22 4-30 20-30 38s10 30 28 34" stroke={line} strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.8" />
    </>
  );
}

/** Stacked plates for tableware. */
function Plates({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <ellipse cx="150" cy="248" rx="92" ry="26" fill={`url(#${grad})`} stroke={line} strokeOpacity="0.35" strokeWidth="2" />
      <ellipse cx="150" cy="236" rx="92" ry="26" fill={base} opacity="0.35" />
      <ellipse cx="150" cy="222" rx="86" ry="24" fill={`url(#${grad})`} stroke={line} strokeOpacity="0.35" strokeWidth="2" />
      <ellipse cx="150" cy="208" rx="78" ry="22" fill={base} opacity="0.28" />
      <ellipse cx="150" cy="194" rx="72" ry="21" fill={light} stroke={line} strokeOpacity="0.35" strokeWidth="2" />
      <ellipse cx="150" cy="192" rx="46" ry="13" fill="none" stroke={line} strokeOpacity="0.28" strokeWidth="2" />
    </>
  );
}

/** Stemmed glass plus a tumbler. */
function Glass({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <path
        d="M104 108h72l-8 56a28 28 0 0 1-56 0l-8-56Z"
        fill={`url(#${grad})`}
        stroke={line}
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <path d="M140 192v56" stroke={line} strokeWidth="5" opacity="0.6" strokeLinecap="round" />
      <ellipse cx="140" cy="252" rx="34" ry="8" fill={base} opacity="0.55" />
      <path
        d="M190 150h56l-7 92a16 16 0 0 1-16 15h-10a16 16 0 0 1-16-15l-7-92Z"
        fill={light}
        stroke={line}
        strokeOpacity="0.3"
        strokeWidth="2"
      />
      <path d="M196 178h44" stroke={line} strokeWidth="1.5" opacity="0.3" />
    </>
  );
}

/** Storage jar with a wooden lid. */
function Jar({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <ellipse cx="150" cy="286" rx="62" ry="11" fill={light} />
      <rect x="100" y="112" width="100" height="22" rx="7" fill={base} />
      <rect x="108" y="100" width="84" height="14" rx="6" fill={base} opacity="0.7" />
      <path
        d="M102 138h96a8 8 0 0 1 8 8v124a16 16 0 0 1-16 16h-80a16 16 0 0 1-16-16V146a8 8 0 0 1 8-8Z"
        fill={`url(#${grad})`}
        stroke={line}
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <rect x="118" y="180" width="18" height="86" rx="9" fill={light} opacity="0.75" />
    </>
  );
}

/** Folded linen for textiles. */
function Linen({ base, light, line, grad }: ShapeProps) {
  return (
    <>
      <path
        d="M74 168c26-10 126-10 152 0l10 96c-32 12-140 12-172 0l10-96Z"
        fill={`url(#${grad})`}
        stroke={line}
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <path d="M74 200c34 10 118 10 152 0" stroke={line} strokeWidth="2" opacity="0.3" fill="none" />
      <path d="M78 232c32 10 112 10 144 0" stroke={line} strokeWidth="2" opacity="0.25" fill="none" />
      <path d="M150 168v96" stroke={light} strokeWidth="3" opacity="0.8" />
      <rect x="118" y="132" width="64" height="36" rx="8" fill={base} opacity="0.75" />
    </>
  );
}

const SHAPES: Record<string, (p: ShapeProps) => React.ReactNode> = {
  cookware: Pot,
  knives: Knife,
  appliances: Kettle,
  storage: Jar,
  tableware: Plates,
  glassware: Glass,
  textiles: Linen,
};

/** Frying pan reads better than a pot for the pan-shaped SKUs. */
const PAN_SLUGS = new Set(['tri-ply-frying-pan-28cm', 'granite-nonstick-set-of-three']);

export function ProductArt({
  category,
  accent,
  slug,
  shape,
  className,
}: {
  category: CategoryId;
  accent: Accent;
  slug?: string;
  /** Overrides the silhouette — set per category in the admin. */
  shape?: string;
  className?: string;
}) {
  const colors = ACCENTS[accent] ?? ACCENTS.clay;

  // A category invented in the admin has no silhouette of its own, so fall back
  // through its configured shape, then its slug, then a generic pot — never
  // render nothing.
  const isPan = Boolean(slug && PAN_SLUGS.has(slug));
  const Shape = isPan ? Pan : (SHAPES[shape ?? ''] ?? SHAPES[category] ?? Pot);
  const shapeKey = isPan ? 'pan' : (shape && SHAPES[shape] ? shape : SHAPES[category] ? category : 'pot');
  const uid = `${shapeKey}-${accent}`;

  return (
    <svg
      viewBox="0 0 300 340"
      className={className}
      role="presentation"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id={`wash-${uid}`} cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor={colors.light} stopOpacity="0.9" />
          <stop offset="100%" stopColor={colors.light} stopOpacity="0" />
        </radialGradient>
        {/* Unique per instance — a shared id would make every product on the
            page resolve to the first one's gradient. */}
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="55%" stopColor={colors.base} stopOpacity="0.55" />
          <stop offset="100%" stopColor={colors.base} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      <rect width="300" height="340" fill={`url(#wash-${uid})`} />
      <ellipse cx="150" cy="300" rx="94" ry="13" fill={colors.line} opacity="0.12" />
      <Shape {...colors} grad={`body-${uid}`} />
    </svg>
  );
}

/**
 * Renders the real photo when the product has one, otherwise the generated art.
 * Plain <img> rather than next/image so shop owners can paste in any CDN URL
 * without touching next.config.
 */
export function ProductImage({
  imageUrl,
  name,
  category,
  accent,
  slug,
  shape,
  className = '',
  priority = false,
}: {
  imageUrl: string | null;
  name: string;
  category: CategoryId;
  accent: Accent;
  slug?: string;
  /** Chosen silhouette, when the product has no photograph yet. */
  shape?: string;
  className?: string;
  priority?: boolean;
}) {
  if (imageUrl) {
    return (
      /*
        `contain`, not `cover`. The frame is 4:5 but product photography rarely
        is, so cover silently crops the ends off a wide shot — the handles of a
        utensil set, the spout of a kettle. It also made photographed products
        read far heavier than the generated silhouettes beside them, because a
        photo filled the frame edge to edge while the artwork sits with margin.
        Padding here keeps the whole product visible and the grid even.
      */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`h-full w-full object-contain p-[8%] ${className}`}
      />
    );
  }
  return (
    <ProductArt
      category={category}
      accent={accent}
      slug={slug}
      shape={shape}
      className={`h-full w-full ${className}`}
    />
  );
}
