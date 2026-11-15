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
  nav: [
    { href: "/constituencies", label: "Constituencies" },
    { href: "/leaderboard", label: "What India asks" },
    { href: "/#how-it-works", label: "How it works" },
    { href: "/rights", label: "Know your rights" },
    { href: "/roadmap", label: "Roadmap" },
    { href: "/contact", label: "Contact" },
  ],
} as const;
