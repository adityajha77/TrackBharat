import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/i18n/locales";

/**
 * Language routing (runs before every page request).
 *
 *   /leaderboard        → served from /en/leaderboard (rewrite: the URL stays clean)
 *   /mr/leaderboard     → Marathi; remembers "mr" in a cookie
 *   /en/leaderboard     → redirect to the clean /leaderboard (one canonical URL per page)
 *
 * If someone chose Marathi before, a clean URL (e.g. a redirect after a form
 * submit) sends them back to /mr/…, so their choice sticks across the site.
 */
const YEAR = 60 * 60 * 24 * 365;

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const first = pathname.split("/")[1];

  if (isLocale(first)) {
    if (first === DEFAULT_LOCALE) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.slice(3) || "/";
      const res = NextResponse.redirect(url);
      res.cookies.set(LOCALE_COOKIE, "en", { maxAge: YEAR, sameSite: "lax", path: "/" });
      return res;
    }
    const res = NextResponse.next();
    if (req.cookies.get(LOCALE_COOKIE)?.value !== first) res.cookies.set(LOCALE_COOKIE, first, { maxAge: YEAR, sameSite: "lax", path: "/" });
    return res;
  }

  const saved = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved) && saved !== DEFAULT_LOCALE) {
    const url = req.nextUrl.clone();
    url.pathname = `/${saved}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, files with an extension (favicon.ico, robots.txt…), and the
  // /media + /downloads rewrites that proxy to the API.
  matcher: ["/((?!_next/|media/|downloads/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
