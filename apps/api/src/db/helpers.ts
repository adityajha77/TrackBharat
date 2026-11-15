import { sql } from "drizzle-orm";
import type { Database } from "./client";
import { sources } from "./schema";

/** A transaction handle (`tx` inside db.transaction(async (tx) => …)). */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Functions that accept either can run standalone OR as part of a bigger transaction. */
export type DbOrTx = Database | Tx;

type NewSource = typeof sources.$inferInsert;

/**
 * Insert-or-update a source by its URL and return its id (idempotent).
 * Citing the same article twice reuses one row instead of creating duplicates.
 */
export async function upsertSource(db: DbOrTx, src: NewSource): Promise<number> {
  const [row] = await db
    .insert(sources)
    .values(src)
    .onConflictDoUpdate({
      target: sources.url,
      set: { title: src.title, publisher: src.publisher, kind: src.kind, license: src.license ?? null, accessedAt: sql`now()` },
    })
    .returning({ id: sources.id });
  return row!.id;
}
