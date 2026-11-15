import { and, asc, eq, sql } from "drizzle-orm";
import type { PromiseDetail, PromiseStatus, SourceInput } from "@trackbharat/shared";
import type { Database } from "../../db/client";
import { upsertSource } from "../../db/helpers";
import { recordAudit } from "../../lib/audit";
import {
  constituencies,
  evidence,
  parties,
  promiseStatusHistory,
  promises,
  representatives,
  sources,
  states,
  terms,
} from "../../db/schema";

const sourceColumns = { url: sources.url, title: sources.title, publisher: sources.publisher, kind: sources.kind, license: sources.license };

export interface NewPromise {
  termId: number | null;
  partyId: number | null;
  constituencyId: number;
  title: string;
  description: string | null;
  category: PromiseDetail["category"];
  madeOn: string | null;
  deadline: string | null;
  source: SourceInput;
}

export function createPromiseRepository(db: Database) {
  return {
    async findDetail(id: number): Promise<PromiseDetail | null> {
      const [p] = await db
        .select({
          id: promises.id,
          title: promises.title,
          description: promises.description,
          category: promises.category,
          status: promises.status,
          madeOn: promises.madeOn,
          deadline: promises.deadline,
          isDemo: promises.isDemo,
          madeBy: sql<string>`coalesce(${representatives.fullName}, ${parties.name}, 'Unknown')`,
          source: sourceColumns,
          cSlug: constituencies.slug,
          cName: constituencies.name,
          cState: states.name,
        })
        .from(promises)
        .innerJoin(sources, eq(sources.id, promises.sourceId))
        .leftJoin(terms, eq(terms.id, promises.termId))
        .leftJoin(representatives, eq(representatives.id, terms.representativeId))
        .leftJoin(parties, eq(parties.id, promises.partyId))
        .leftJoin(constituencies, eq(constituencies.id, promises.constituencyId))
        .leftJoin(states, eq(states.id, constituencies.stateId))
        .where(eq(promises.id, id));
      if (!p) return null;

      const [history, ev] = await Promise.all([
        db
          .select({ status: promiseStatusHistory.status, note: promiseStatusHistory.note, changedAt: promiseStatusHistory.changedAt, source: sourceColumns })
          .from(promiseStatusHistory)
          .innerJoin(sources, eq(sources.id, promiseStatusHistory.sourceId))
          .where(eq(promiseStatusHistory.promiseId, id))
          .orderBy(asc(promiseStatusHistory.changedAt), asc(promiseStatusHistory.id)),
        db
          .select({ summary: evidence.summary, stance: evidence.stance, addedAt: evidence.addedAt, source: sourceColumns })
          .from(evidence)
          .innerJoin(sources, eq(sources.id, evidence.sourceId))
          .where(eq(evidence.promiseId, id))
          .orderBy(asc(evidence.addedAt), asc(evidence.id)),
      ]);

      const { cSlug, cName, cState, ...rest } = p;
      return {
        ...rest,
        constituency: cSlug && cName && cState ? { slug: cSlug, name: cName, state: cState } : null,
        history: history.map((h) => ({ ...h, changedAt: h.changedAt.toISOString() })),
        evidence: ev.map((e) => ({ ...e, addedAt: e.addedAt.toISOString() })),
      };
    },

    async findConstituencyId(slug: string) {
      const [c] = await db.select({ id: constituencies.id }).from(constituencies).where(eq(constituencies.slug, slug));
      return c?.id ?? null;
    },

    async findSittingTermId(constituencyId: number) {
      const [t] = await db
        .select({ id: terms.id })
        .from(terms)
        .where(and(eq(terms.constituencyId, constituencyId), eq(terms.status, "SITTING")));
      return t?.id ?? null;
    },

    async findPartyId(name: string) {
      const [p] = await db
        .select({ id: parties.id })
        .from(parties)
        .where(sql`lower(${parties.name}) = lower(${name}) OR lower(${parties.shortName}) = lower(${name})`);
      return p?.id ?? null;
    },

    async exists(id: number) {
      const [p] = await db.select({ id: promises.id }).from(promises).where(eq(promises.id, id));
      return Boolean(p);
    },

    /** Promise + its first history entry, atomically. */
    async create(input: NewPromise, actorId: number | null = null): Promise<number> {
      return db.transaction(async (tx) => {
        const sourceId = await upsertSource(tx, input.source);
        const [row] = await tx
          .insert(promises)
          .values({
            termId: input.termId,
            partyId: input.partyId,
            constituencyId: input.constituencyId,
            title: input.title,
            description: input.description,
            category: input.category,
            madeOn: input.madeOn,
            deadline: input.deadline,
            sourceId,
          })
          .returning({ id: promises.id });
        await tx.insert(promiseStatusHistory).values({ promiseId: row!.id, status: "PENDING", note: "Promise recorded", sourceId });
        await recordAudit(tx, { actorId, action: "promise.create", entityType: "promise", entityId: row!.id, details: { title: input.title, source: input.source.url } });
        return row!.id;
      });
    },

    /** Append a history row AND update the current status, atomically. */
    async addStatus(promiseId: number, status: PromiseStatus, note: string, source: SourceInput, actorId: number | null = null): Promise<number> {
      return db.transaction(async (tx) => {
        const sourceId = await upsertSource(tx, source);
        const [h] = await tx.insert(promiseStatusHistory).values({ promiseId, status, note, sourceId }).returning({ id: promiseStatusHistory.id });
        await tx.update(promises).set({ status, updatedAt: sql`now()` }).where(eq(promises.id, promiseId));
        await recordAudit(tx, { actorId, action: "promise.status", entityType: "promise", entityId: promiseId, details: { status, note, source: source.url } });
        return h!.id;
      });
    },

    async addEvidence(promiseId: number, summary: string, stance: PromiseDetail["evidence"][number]["stance"], source: SourceInput, actorId: number | null = null): Promise<number> {
      return db.transaction(async (tx) => {
        const sourceId = await upsertSource(tx, source);
        const [e] = await tx.insert(evidence).values({ promiseId, summary, stance, sourceId }).returning({ id: evidence.id });
        await tx.update(promises).set({ updatedAt: sql`now()` }).where(eq(promises.id, promiseId));
        await recordAudit(tx, { actorId, action: "promise.evidence", entityType: "promise", entityId: promiseId, details: { stance, source: source.url } });
        return e!.id;
      });
    },
  };
}

export type PromiseRepository = ReturnType<typeof createPromiseRepository>;
