import { and, asc, desc, eq, sql } from "drizzle-orm";
import type {
  ConstituencyIndexResponse,
  ConstituencySummary,
  PincodeConstituency,
  PromiseSummary,
  Representative,
  Source,
} from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { constituencies, parties, pincodeConstituencies, promises, representatives, sources, states, terms } from "../../db/schema";

/**
 * REPOSITORY: all SQL for constituencies, including the PostGIS parts.
 * Returns plain objects shaped like the shared contract.
 */

const summaryColumns = {
  id: constituencies.id,
  slug: constituencies.slug,
  name: constituencies.name,
  nameHi: constituencies.nameHi,
  house: constituencies.house,
  state: states.name,
  number: constituencies.number,
  reservation: constituencies.reservation,
  boundaryOutdated: constituencies.boundaryOutdated,
  isDemo: constituencies.isDemo,
};

const sourceColumns = {
  url: sources.url,
  title: sources.title,
  publisher: sources.publisher,
  kind: sources.kind,
  license: sources.license,
};

export type ConstituencyRow = ConstituencySummary & { id: number };

export function createConstituencyRepository(db: Database) {
  return {
    async findBySlug(slug: string): Promise<ConstituencyRow | null> {
      const [row] = await db
        .select(summaryColumns)
        .from(constituencies)
        .innerJoin(states, eq(states.id, constituencies.stateId))
        .where(eq(constituencies.slug, slug))
        .limit(1);
      return row ?? null;
    },

    /** Parent Lok Sabha seat (for an assembly seat) and assembly segments (for a Lok Sabha seat). */
    async family(id: number) {
      const link = { slug: constituencies.slug, name: constituencies.name, number: constituencies.number };
      const [parentRows, segments] = await Promise.all([
        db.execute<{ slug: string; name: string; number: number }>(sql`
          SELECT p.slug, p.name, p.number FROM constituencies c JOIN constituencies p ON p.id = c.parent_id WHERE c.id = ${id}`),
        db.select(link).from(constituencies).where(eq(constituencies.parentId, id)).orderBy(asc(constituencies.number)),
      ]);
      return { parent: parentRows.rows[0] ?? null, segments };
    },

    async boundarySource(id: number): Promise<Source | null> {
      const [row] = await db
        .select(sourceColumns)
        .from(constituencies)
        .innerJoin(sources, eq(sources.id, constituencies.boundarySourceId))
        .where(eq(constituencies.id, id));
      return row ?? null;
    },

    /**
     * The constituency's shape as an SVG path, drawn by PostGIS (ST_AsSVG).
     * Two tricks:
     *  1. Simplify the polygon: a small outline doesn't need 10,000 points.
     *  2. Squash longitude by cos(latitude): a degree of longitude is shorter than a
     *     degree of latitude away from the equator, so without this every shape
     *     would look stretched sideways.
     * ST_AsSVG flips Y (SVG's y axis points down), hence viewBox starts at -ymax.
     */
    async outline(id: number): Promise<{ path: string; viewBox: string } | null> {
      const { rows } = await db.execute<{ path: string | null; xmin: number; ymax: number; w: number; h: number }>(sql`
        WITH g AS (
          SELECT ST_Scale(ST_SimplifyPreserveTopology(boundary, 0.002),
                          cos(radians(ST_Y(ST_Centroid(boundary)))), 1) AS geom
          FROM constituencies WHERE id = ${id} AND boundary IS NOT NULL
        )
        SELECT ST_AsSVG(geom, 0, 4) AS path,
               ST_XMin(geom) AS xmin, ST_YMax(geom) AS ymax,
               ST_XMax(geom) - ST_XMin(geom) AS w, ST_YMax(geom) - ST_YMin(geom) AS h
        FROM g
      `);
      const r = rows[0];
      if (!r?.path) return null;
      const pad = Math.max(r.w, r.h) * 0.04;
      const f = (n: number) => Number(n.toFixed(4));
      return { path: r.path, viewBox: `${f(r.xmin - pad)} ${f(-r.ymax - pad)} ${f(r.w + 2 * pad)} ${f(r.h + 2 * pad)}` };
    },

    /** All representatives of this seat in its most recent legislature. */
    async representatives(id: number): Promise<Representative[]> {
      const rows = await db
        .select({
          name: representatives.fullName,
          gender: representatives.gender,
          education: representatives.education,
          profession: representatives.profession,
          imageUrl: representatives.imageUrl,
          isDemo: representatives.isDemo,
          partyName: parties.name,
          partyShort: parties.shortName,
          legislature: terms.legislature,
          status: terms.status,
          termsServed: terms.termsServed,
          source: sourceColumns,
        })
        .from(terms)
        .innerJoin(representatives, eq(representatives.id, terms.representativeId))
        .innerJoin(sources, eq(sources.id, terms.sourceId))
        .leftJoin(parties, eq(parties.id, terms.partyId))
        .where(
          and(
            eq(terms.constituencyId, id),
            eq(terms.legislature, sql`(SELECT max(legislature) FROM terms WHERE constituency_id = ${id})`),
          ),
        );
      return rows.map(({ partyName, partyShort, ...r }) => ({
        ...r,
        party: partyName ? { name: partyName, shortName: partyShort } : null,
      }));
    },

    async promises(id: number): Promise<PromiseSummary[]> {
      const rows = await db
        .select({
          id: promises.id,
          title: promises.title,
          category: promises.category,
          status: promises.status,
          madeOn: promises.madeOn,
          deadline: promises.deadline,
          isDemo: promises.isDemo,
          // Made by a representative (via their term) or by a party (manifesto)
          madeBy: sql<string>`coalesce(${representatives.fullName}, ${parties.name}, 'Unknown')`,
        })
        .from(promises)
        .leftJoin(terms, eq(terms.id, promises.termId))
        .leftJoin(representatives, eq(representatives.id, terms.representativeId))
        .leftJoin(parties, eq(parties.id, promises.partyId))
        .where(eq(promises.constituencyId, id))
        .orderBy(desc(promises.madeOn), desc(promises.id));
      return rows;
    },

    /**
     * Which constituencies does this PIN fall in? Precomputed by the import's spatial
     * join, so this is a cheap indexed lookup. Includes the sitting MP for each.
     */
    async forPincode(pincode: string): Promise<PincodeConstituency[]> {
      const rows = await db
        .select({
          ...summaryColumns,
          share: pincodeConstituencies.share,
          repName: representatives.fullName,
          repImage: representatives.imageUrl,
          partyShort: parties.shortName,
          partyName: parties.name,
        })
        .from(pincodeConstituencies)
        .innerJoin(constituencies, eq(constituencies.id, pincodeConstituencies.constituencyId))
        .innerJoin(states, eq(states.id, constituencies.stateId))
        .leftJoin(terms, and(eq(terms.constituencyId, constituencies.id), eq(terms.status, "SITTING")))
        .leftJoin(representatives, eq(representatives.id, terms.representativeId))
        .leftJoin(parties, eq(parties.id, terms.partyId))
        .where(eq(pincodeConstituencies.pincode, pincode))
        .orderBy(desc(pincodeConstituencies.share));
      return rows.map(({ id: _id, repName, repImage, partyShort, partyName, ...r }) => ({
        ...r,
        representative: repName ? { name: repName, party: partyShort ?? partyName, imageUrl: repImage } : null,
      }));
    },

    async index(): Promise<ConstituencyIndexResponse> {
      const rows = await db
        .select({ state: states.name, slug: constituencies.slug, name: constituencies.name, number: constituencies.number, reservation: constituencies.reservation })
        .from(constituencies)
        .innerJoin(states, eq(states.id, constituencies.stateId))
        .where(and(eq(constituencies.house, "LOK_SABHA"), eq(constituencies.isDemo, false)))
        .orderBy(asc(states.name), asc(constituencies.number));
      const byState = new Map<string, ConstituencyIndexResponse["states"][number]["constituencies"]>();
      for (const { state, ...c } of rows) {
        if (!byState.has(state)) byState.set(state, []);
        byState.get(state)!.push(c);
      }
      return { states: [...byState].map(([state, constituencies]) => ({ state, constituencies })), total: rows.length };
    },
  };
}

export type ConstituencyRepository = ReturnType<typeof createConstituencyRepository>;
