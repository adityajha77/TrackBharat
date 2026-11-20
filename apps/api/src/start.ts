/**
 * Production entry point: apply any new database migrations, then start the API.
 * (One command for hosts that take a single start command, e.g. Render.)
 * Both modules do their work when loaded, so the order of the imports is the order of the steps.
 */
await import("./db/migrate");
await import("./server");
