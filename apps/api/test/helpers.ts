import type { AppDeps } from "../src/app";

/** Builds AppDeps with harmless fakes; override only what a test cares about. */
const notUsed = async (): Promise<never> => {
  throw new Error("not used in this test");
};

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
    pingDb: async () => {},
    corsOrigins: ["http://localhost:3000"],
    version: "test",
    ...overrides,
  };
}
