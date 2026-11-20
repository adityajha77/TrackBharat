import { sql } from "drizzle-orm";
import { PartiesResponse, PartyDetail, Timeline, type PartySummary, type TimelineEvent } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { AppError } from "../../lib/errors";
import { CURRENT_LOK_SABHA } from "../../lib/legislatures";

/**
 * PARTIES: profile, manifestos (promised vs done), leaders and a dated timeline.
 *
 * Neutrality is structural: every party gets the same fields, the same order of
 * sections and the same status scale. Parties are listed by founding date, not
 * by size or by how well they score.
 */
type SummaryRow = {
  party_id: number;
  slug: string;
  name: string;
  short_name: string | null;
  founded: string;
  symbol: string;
  color: string;
  founders: string;
  ideology_quote: string;
  ideology_source_url: string;
  manifesto_note: string | null;
  manifesto_note_source_url: string | null;
  seats: number;
  promises: number;
  by_status: Record<string, number> | null;
};

const summarySql = sql`
  SELECT p.id AS party_id, pp.slug, p.name, p.short_name, pp.founded::text AS founded, pp.symbol, pp.color,
         pp.founders, pp.ideology_quote, pp.ideology_source_url, pp.manifesto_note, pp.manifesto_note_source_url,
         (SELECT count(*) FROM terms t JOIN constituencies c ON c.id = t.constituency_id
           WHERE t.party_id = p.id AND t.legislature = ${CURRENT_LOK_SABHA} AND t.status = 'SITTING' AND c.house = 'LOK_SABHA')::int AS seats,
         (SELECT count(*) FROM manifesto_promises mp JOIN manifestos m ON m.id = mp.manifesto_id WHERE m.party_id = p.id)::int AS promises,
         (SELECT json_object_agg(status, n) FROM (
            SELECT mp.status, count(*)::int AS n FROM manifesto_promises mp JOIN manifestos m ON m.id = mp.manifesto_id
            WHERE m.party_id = p.id GROUP BY mp.status) x) AS by_status
  FROM party_profiles pp JOIN parties p ON p.id = pp.party_id`;

const toSummary = (r: SummaryRow): PartySummary => ({
  slug: r.slug,
  name: r.name,
  shortName: r.short_name,
  founded: r.founded,
  symbol: r.symbol,
  color: r.color,
  seatsLokSabha: r.seats,
  promises: r.promises,
  byStatus: r.by_status ?? {},
  manifestoNote: r.manifesto_note ? { text: r.manifesto_note, sourceUrl: r.manifesto_note_source_url ?? "" } : null,
});

type EventRow = { date: string; precision: TimelineEvent["precision"]; title: string; body: string; source_url: string; party: string | null };
const toEvent = (e: EventRow): TimelineEvent => ({ date: e.date, precision: e.precision, title: e.title, body: e.body, sourceUrl: e.source_url, party: e.party });

export function createPartiesService(db: Database) {
  async function leaders(partyId: number) {
    const { rows } = await db.execute<{
      name: string;
      role: string;
      years: string;
      quote: string | null;
      quote_source_url: string | null;
      photo_key: string | null;
      photo_license: string | null;
      photo_author: string | null;
      photo_source_url: string | null;
    }>(sql`SELECT * FROM party_leaders WHERE party_id = ${partyId} ORDER BY sort_order, id`);
    return rows.map((l) => ({
      name: l.name,
      role: l.role,
      years: l.years,
      quote: l.quote,
      quoteSourceUrl: l.quote_source_url,
      photoPath: l.photo_key ? `/media/leaders/${l.photo_key}` : null,
      photoCredit: l.photo_key ? [l.photo_author, l.photo_license].filter(Boolean).join(", ") : null,
      photoSourceUrl: l.photo_source_url,
    }));
  }

  async function events(partyId: number | null) {
    const { rows } = await db.execute<EventRow>(sql`
      SELECT e.date::text AS date, e.precision, e.title, e.body, e.source_url, pp.slug AS party
      FROM timeline_events e LEFT JOIN party_profiles pp ON pp.party_id = e.party_id
      WHERE ${partyId === null ? sql`e.party_id IS NULL` : sql`e.party_id = ${partyId}`}
      ORDER BY e.date, e.id`);
    return rows.map(toEvent);
  }

  return {
    async list() {
      const { rows } = await db.execute<SummaryRow>(sql`${summarySql} ORDER BY pp.sort_order, pp.founded`);
      return PartiesResponse.parse({ parties: rows.map(toSummary) });
    },

    async detail(slug: string): Promise<PartyDetail> {
      const { rows } = await db.execute<SummaryRow>(sql`${summarySql} WHERE pp.slug = ${slug}`);
      const r = rows[0];
      if (!r) throw AppError.notFound(`No party profile called "${slug}"`);
      const { rows: ms } = await db.execute<{
        id: number;
        election_year: number;
        state: string | null;
        title: string;
        source_url: string;
        formed_government: boolean;
        promises: { id: number; category: string; text: string; page: number | null; status: string; status_note: string | null; evidence_url: string | null }[] | null;
      }>(sql`
        SELECT m.id, m.election_year, m.state, m.title, m.source_url, m.formed_government,
               (SELECT json_agg(json_build_object('id', mp.id, 'category', mp.category, 'text', mp.text, 'page', mp.page,
                                                  'status', mp.status, 'status_note', mp.status_note, 'evidence_url', mp.evidence_url) ORDER BY mp.id)
                  FROM manifesto_promises mp WHERE mp.manifesto_id = m.id) AS promises
        FROM manifestos m WHERE m.party_id = ${r.party_id} ORDER BY m.election_year DESC, m.state NULLS FIRST`);
      return PartyDetail.parse({
        ...toSummary(r),
        founders: r.founders,
        ideologyQuote: r.ideology_quote,
        ideologySourceUrl: r.ideology_source_url,
        leaders: await leaders(r.party_id),
        events: await events(r.party_id),
        manifestos: ms.map((m) => ({
          id: m.id,
          electionYear: m.election_year,
          state: m.state,
          title: m.title,
          sourceUrl: m.source_url,
          formedGovernment: m.formed_government,
          promises: (m.promises ?? []).map((p) => ({
            id: p.id,
            category: p.category,
            text: p.text,
            page: p.page,
            status: p.status,
            statusNote: p.status_note,
            evidenceUrl: p.evidence_url,
          })),
        })),
      });
    },

    async timeline(): Promise<Timeline> {
      const { rows } = await db.execute<SummaryRow>(sql`${summarySql} ORDER BY pp.founded`);
      const parties = await Promise.all(
        rows.map(async (r) => ({
          ...toSummary(r),
          founders: r.founders,
          ideologyQuote: r.ideology_quote,
          ideologySourceUrl: r.ideology_source_url,
          leaders: await leaders(r.party_id),
          events: await events(r.party_id),
        })),
      );
      return Timeline.parse({ parties, national: await events(null) });
    },
  };
}

export type PartiesService = ReturnType<typeof createPartiesService>;
