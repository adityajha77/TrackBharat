export const site = {
  name: "TrackBharat",
  tagline: "Vote with facts, not faces.",
  description:
    "Track election promises, see how your constituency is performing, and raise the issues that matter in your area, in one place.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  repo: "https://github.com/adityajha77/TrackBharat",
  author: {
    name: "Aditya Jha",
    linkedin: "https://www.linkedin.com/in/aditya-kumar-jha-72493a319/",
  },
  /** Main navigation. Labels are dictionary keys in `nav.*` (src/i18n/dictionaries). */
  nav: [
    { href: "/", key: "home" },
    { href: "/leaderboard", key: "asks" },
    { href: "/neta", key: "neta" },
    { href: "/causes", key: "causes" },
    { href: "/news", key: "news" },
    { href: "/parties", key: "manifestos" },
    { href: "/timeline", key: "timeline" },
  ],
  more: [
    { href: "/ideology", key: "ideology" },
    { href: "/rights", key: "rights" },
    { href: "/insights", key: "insights" },
    { href: "/methodology", key: "methodology" },
    { href: "/data", key: "data" },
    { href: "/roadmap", key: "roadmap" },
    { href: "/contact", key: "contact" },
  ],
} as const;
