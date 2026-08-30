import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export const IconPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconClock = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="m4 12 5 5L20 6" />
  </svg>
);

export const IconX = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconFlag = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 21V4m0 0h12l-2 3 2 3H5" />
  </svg>
);

export const IconNewspaper = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    <path d="M2 8h18M6 12h6M6 15h6M6 18h3" />
  </svg>
);

export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </svg>
);

export const IconLock = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

export const IconShield = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v5c0 4.5 3 7.7 7 10 4-2.3 7-5.5 7-10V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconLayers = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const IconArrowUpRight = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconEye = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconDroplets = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10Z" />
  </svg>
);

export const IconBolt = (p: P) => (
  <svg {...base(p)}>
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  </svg>
);

export const IconReport = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 3h10a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2Z" />
  </svg>
);

export const IconMenu = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18Z" />
  </svg>
);

/** Stylized India silhouette, used as a map-loading skeleton + admin watermark. */
export function IndiaSilhouette({
  className,
  title = "India",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg viewBox="0 0 220 260" className={className ?? "h-40 w-auto"} role="img" aria-label={title}>
      <title>{title}</title>
      <path
        d="M136 14
           c8 2 14 7 15 15 c1 8 -4 13 -4 19 c0 6 5 9 3 15 c-2 5 -8 7 -8 13
           c0 7 7 9 7 16 c0 6 -6 9 -9 14 c-3 5 -4 11 -9 13
           c-5 3 -11 1 -15 4 c-4 4 -7 11 -13 12
           c-7 1 -12 -4 -19 -2 c-6 2 -8 8 -15 8
           c-9 0 -14 -9 -23 -8 c-7 1 -10 7 -18 7
           c-7 0 -12 -5 -19 -3 c-6 2 -8 9 -15 8
           c-7 -1 -11 -7 -18 -6 c-8 1 -11 8 -19 6
           c-5 -1 -8 -5 -14 -4 c-7 2 -9 9 -16 8
           c-7 -1 -10 -8 -17 -7 c-6 1 -9 6 -15 5
           c-5 -1 -8 -5 -11 -9 c-3 -5 -4 -10 -2 -15
           c2 -5 7 -7 8 -12 c1 -6 -3 -10 -3 -16
           c0 -5 4 -8 4 -14 c1 -6 -3 -11 -2 -17
           c1 -8 8 -13 16 -14 c7 -1 12 3 19 1
           c8 -2 12 -9 20 -9 c7 0 11 6 19 5
           c7 -1 11 -7 19 -6 c9 1 13 8 22 7
           c7 -1 11 -7 19 -7 c9 0 14 6 23 5
           c7 -1 10 -7 17 -8 c8 -1 14 4 22 3
           c5 -1 9 -4 14 -6 z"
        fill="currentColor"
      />
    </svg>
  );
}