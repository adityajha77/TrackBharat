import { z } from "zod";

/**
 * Every error response from the API has this exact shape, so clients can
 * handle errors in one place (switch on `code`, show `message`).
 */
export const ErrorCode = z.enum([
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "UNAUTHORIZED",
  "CONFLICT",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorBody = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
    /** Echoes the request id so a user's bug report can be matched to server logs. */
    requestId: z.string().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;
