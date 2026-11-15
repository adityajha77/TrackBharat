import type { AddEvidenceInput, CreatePromiseInput, PromiseDetail, UpdatePromiseStatusInput } from "@trackbharat/shared";
import { AppError } from "../../lib/errors";
import type { PromiseRepository } from "./promise.repository";

/**
 * SERVICE: the rules for recording promises. Validation of *shape* (lengths,
 * https links, valid dates) already happened against the shared Zod schemas;
 * here we enforce rules that need the database.
 */
export function createPromiseService(repo: PromiseRepository) {
  async function mustExist(id: number) {
    if (!(await repo.exists(id))) throw AppError.notFound(`Promise ${id} not found`);
  }

  return {
    async get(id: number): Promise<PromiseDetail> {
      const p = await repo.findDetail(id);
      if (!p) throw AppError.notFound(`Promise ${id} not found`);
      return p;
    },

    async create(input: CreatePromiseInput, actorId: number | null = null): Promise<number> {
      const constituencyId = await repo.findConstituencyId(input.constituencySlug);
      if (!constituencyId) throw AppError.notFound(`No constituency called "${input.constituencySlug}"`);

      let termId: number | null = null;
      let partyId: number | null = null;
      if (input.madeBy.type === "REPRESENTATIVE") {
        termId = await repo.findSittingTermId(constituencyId);
        if (!termId) throw AppError.conflict("This seat has no sitting representative to attribute the promise to");
      } else {
        // We never create parties from free text: a typo would invent a new party.
        partyId = await repo.findPartyId(input.madeBy.partyName);
        if (!partyId) throw AppError.notFound(`Unknown party "${input.madeBy.partyName}"`);
      }

      return repo.create({
        termId,
        partyId,
        constituencyId,
        title: input.title,
        description: input.description ?? null,
        category: input.category,
        madeOn: input.madeOn ?? null,
        deadline: input.deadline ?? null,
        source: input.source,
      }, actorId);
    },

    async updateStatus(id: number, input: UpdatePromiseStatusInput, actorId: number | null = null): Promise<number> {
      await mustExist(id);
      return repo.addStatus(id, input.status, input.note, input.source, actorId);
    },

    async addEvidence(id: number, input: AddEvidenceInput, actorId: number | null = null): Promise<number> {
      await mustExist(id);
      return repo.addEvidence(id, input.summary, input.stance, input.source, actorId);
    },
  };
}

export type PromiseService = ReturnType<typeof createPromiseService>;
