/**
 * @trackbharat/shared: the API contract.
 *
 * Every shape that crosses the network is defined ONCE here as a Zod schema.
 * - The API uses the schemas to validate input and to type its responses.
 * - The web app (and later the mobile app) uses the same schemas to parse
 *   responses, so a breaking API change shows up as a type error at build
 *   time instead of a blank screen in production.
 */
export * from "./errors";
export * from "./health";
export * from "./pincode";
export * from "./civic";
export * from "./citizen";
export * from "./report-card";
export * from "./voices";
export * from "./admin";
