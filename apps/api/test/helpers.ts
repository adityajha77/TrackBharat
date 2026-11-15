import type { PublicUser } from "@trackbharat/shared";
import type { AppDeps } from "../src/app";

/** Builds AppDeps with harmless fakes; override only what a test cares about. */
const notUsed = async (): Promise<never> => {
  throw new Error("not used in this test");
};

/**
 * Fake sessions for HTTP tests: "Authorization: Bearer <role>-token" logs you in
 * as a user with that role, e.g. `bearer("VERIFIER")`.
 */
export const USERS: Record<string, PublicUser> = {
  "citizen-token": { id: 1, name: "Test Citizen", role: "CITIZEN" },
  "verifier-token": { id: 2, name: "Test Verifier", role: "VERIFIER" },
  "moderator-token": { id: 3, name: "Test Moderator", role: "MODERATOR" },
  "admin-token": { id: 4, name: "Test Admin", role: "ADMIN" },
};
export const bearer = (role: PublicUser["role"]) => ({ authorization: `Bearer ${role.toLowerCase()}-token` });

export function deps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    pincodeService: {
      lookup: async (pincode) => ({
        pincode,
        district: "Bangalore",
        state: "Karnataka",
        postOffices: [],
        source: "cache",
        fetchedAt: new Date().toISOString(),
      }),
    },
    constituencyService: { forPincode: notUsed, detail: notUsed, index: notUsed },
    promiseService: { get: notUsed, create: notUsed, updateStatus: notUsed, addEvidence: notUsed },
    authService: { signup: notUsed, login: notUsed, logout: notUsed, resolve: async (token) => USERS[token] ?? null },
    issueService: { create: notUsed, list: notUsed, highlights: notUsed, get: notUsed, vote: notUsed, report: notUsed, mine: notUsed, moderate: notUsed, reported: notUsed },
    submissionService: { submit: notUsed, review: notUsed, pending: notUsed, mine: notUsed },
    photoStore: { save: notUsed, open: () => null },
    reportCardService: { reportCard: notUsed, insights: notUsed },
    db: { execute: notUsed } as unknown as AppDeps["db"],
    pingDb: async () => {},
    corsOrigins: ["http://localhost:3000"],
    version: "test",
    ...overrides,
  };
}
