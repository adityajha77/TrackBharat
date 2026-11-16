import { sql } from "drizzle-orm";
import { NetaResponse } from "@trackbharat/shared";
import type { Database } from "../../db/client";

/**
 * KNOW YOUR NETA: every sitting MP (Lok Sabha) or MLA (Vidhan Sabha) in one list,
 * plus seat counts per party and per state for the filter chips. Demo seats are
 * left out: this page is about real representatives only.
 */
export function createNetaService(db: Database) {
  return {
    async list(house: "LOK_SABHA" | "VIDHAN_SABHA"): Promise<NetaResponse> {
      const { rows } = await db.execute<{
        name: string;
        party: string | null;
        party_short: string | null;
        image_url: string | null;
        slug: string;
        seat: string;
        number: number;
        state: string;
        reservation: "GEN" | "SC" | "ST";
      }>(sql`
        SELECT DISTINCT ON (c.id) r.full_name AS name, p.name AS party, p.short_name AS party_short, r.image_url,
               c.slug, c.name AS seat, c.number, s.name AS state, c.reservation
        FROM terms t
        JOIN representatives r ON r.id = t.representative_id
        JOIN constituencies c ON c.id = t.constituency_id
        JOIN states s ON s.id = c.state_id
        LEFT JOIN parties p ON p.id = t.party_id
        WHERE c.house = ${house} AND t.status = 'SITTING' AND NOT c.is_demo
        ORDER BY c.id, t.legislature DESC`);
      const { rows: st } = await db.execute<{ state: string; seats: number }>(sql`
        SELECT s.name AS state, count(*)::int AS seats FROM constituencies c JOIN states s ON s.id = c.state_id
        WHERE c.house = ${house} AND NOT c.is_demo GROUP BY s.name ORDER BY s.name`);

      const netas = rows
        .map((r) => ({
          name: r.name,
          party: r.party,
          partyShort: r.party_short,
          imageUrl: r.image_url,
          seat: { slug: r.slug, name: r.seat, number: r.number, state: r.state, reservation: r.reservation },
        }))
        .sort((a, b) => a.seat.state.localeCompare(b.seat.state) || a.seat.number - b.seat.number);

      const byParty = new Map<string, { party: string; short: string | null; seats: number }>();
      for (const n of netas) {
        const key = n.party ?? "Independent";
        const e = byParty.get(key) ?? { party: key, short: n.partyShort, seats: 0 };
        e.seats++;
        byParty.set(key, e);
      }
      const filled = new Map<string, number>();
      for (const n of netas) filled.set(n.seat.state, (filled.get(n.seat.state) ?? 0) + 1);

      return NetaResponse.parse({
        house,
        netas,
        parties: [...byParty.values()].sort((a, b) => b.seats - a.seats || a.party.localeCompare(b.party)),
        states: st.map((s) => ({ state: s.state, seats: s.seats, filled: filled.get(s.state) ?? 0 })),
      });
    },
  };
}

export type NetaService = ReturnType<typeof createNetaService>;
