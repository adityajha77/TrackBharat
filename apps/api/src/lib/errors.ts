import type { ErrorCode } from "@trackbharat/shared";

/**
 * A typed, expected error. Services throw these; the global error handler in
 * app.ts turns them into the shared `ApiErrorBody` JSON shape. Anything that is
 * NOT an AppError is a bug, so it is logged with a stack trace and the client only
 * sees a generic 500 (we never leak internals).
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
  }

  static validation(message: string) {
    return new AppError("VALIDATION_ERROR", message, 400);
  }
  static notFound(message: string) {
    return new AppError("NOT_FOUND", message, 404);
  }
  static upstream(message: string) {
    return new AppError("UPSTREAM_UNAVAILABLE", message, 502);
  }
}
