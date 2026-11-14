import { describe, expect, it, vi } from "vitest";
import type { PostOffice } from "@trackbharat/shared";
import { createPincodeService } from "../src/modules/pincodes/pincode.service";
import type { CachedPincode, PincodeRepository } from "../src/modules/pincodes/pincode.repository";
import type { PincodeDirectory } from "../src/modules/pincodes/india-post.client";
import { AppError } from "../src/lib/errors";

// UNIT tests: the service is tested with in-memory fakes, with no database and no
// network. This is the payoff of dependency injection.

const office: PostOffice = {
  name: "Koramangala",
  branchType: "Sub Post Office",
  deliveryStatus: "Delivery",
  block: null,
  district: "Bangalore",
  state: "Karnataka",
};

function fakeRepo(initial?: CachedPincode): PincodeRepository & { saved: number } {
  let row = initial ?? null;
  return {
    saved: 0,
    async find() {
      return row;
    },
    async save(pincode, postOffices, fetchedAt = new Date()) {
      this.saved++;
      row = { pincode, district: postOffices[0]!.district, state: postOffices[0]!.state, fetchedAt, postOffices };
      return row;
    },
  };
}

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-15T00:00:00Z");

describe("pincode service (cache-aside)", () => {
  it("fetches from upstream on a cache miss and stores the result", async () => {
    const repo = fakeRepo();
    const directory: PincodeDirectory = { lookup: vi.fn().mockResolvedValue([office]) };
    const service = createPincodeService({ repo, directory, cacheTtlDays: 30, now: () => now });

    const res = await service.lookup("560034");

    expect(res.source).toBe("upstream");
    expect(res.district).toBe("Bangalore");
    expect(repo.saved).toBe(1);
  });

  it("serves a fresh cache hit without calling upstream", async () => {
    const repo = fakeRepo({ pincode: "560034", district: "Bangalore", state: "Karnataka", fetchedAt: new Date(now.getTime() - DAY), postOffices: [office] });
    const directory: PincodeDirectory = { lookup: vi.fn() };
    const service = createPincodeService({ repo, directory, cacheTtlDays: 30, now: () => now });

    const res = await service.lookup("560034");

    expect(res.source).toBe("cache");
    expect(directory.lookup).not.toHaveBeenCalled();
  });

  it("refreshes a stale cache entry", async () => {
    const repo = fakeRepo({ pincode: "560034", district: "Old", state: "Karnataka", fetchedAt: new Date(now.getTime() - 31 * DAY), postOffices: [office] });
    const directory: PincodeDirectory = { lookup: vi.fn().mockResolvedValue([office]) };
    const service = createPincodeService({ repo, directory, cacheTtlDays: 30, now: () => now });

    const res = await service.lookup("560034");

    expect(res.source).toBe("upstream");
    expect(res.district).toBe("Bangalore");
  });

  it("serves stale data when upstream is down (stale-if-error)", async () => {
    const repo = fakeRepo({ pincode: "560034", district: "Bangalore", state: "Karnataka", fetchedAt: new Date(0), postOffices: [office] });
    const directory: PincodeDirectory = { lookup: vi.fn().mockRejectedValue(AppError.upstream("down")) };
    const service = createPincodeService({ repo, directory, cacheTtlDays: 30, now: () => now });

    const res = await service.lookup("560034");

    expect(res.source).toBe("cache");
  });

  it("throws NOT_FOUND for a PIN code that does not exist", async () => {
    const service = createPincodeService({
      repo: fakeRepo(),
      directory: { lookup: vi.fn().mockResolvedValue(null) },
      cacheTtlDays: 30,
    });

    await expect(service.lookup("999999")).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});
