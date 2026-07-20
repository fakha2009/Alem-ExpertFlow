import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentI18n } from "@/server/i18n";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function toErrorResponse(error: unknown) {
  const { dictionary: t } = await getCurrentI18n();

  if (error instanceof ZodError) {
    return jsonError(t.errors.invalidData, 422, error.flatten());
  }

  if (error instanceof Error && error.name === "ForbiddenError") {
    return jsonError(t.errors.forbidden, 403);
  }

  if (error instanceof Error && error.name === "CsrfError") {
    return jsonError(t.errors.forbidden, 403);
  }

  if (error instanceof Error && error.name === "BadRequestError") {
    return jsonError(t.errors.invalidData, 400);
  }

  if (error instanceof Error && error.name === "UnsupportedMediaTypeError") {
    return jsonError(t.errors.invalidData, 415);
  }

  if (error instanceof Error && error.name === "PayloadTooLargeError") {
    return jsonError(t.errors.invalidData, 413);
  }

  if (error instanceof Error && error.name === "ConflictError") {
    return jsonError(t.errors.operationFailed, 409);
  }

  if (error instanceof Error && error.name === "UnauthorizedError") {
    return jsonError(t.errors.unauthorized, 401);
  }

  if (error instanceof Error && error.message.includes("DATABASE_URL")) {
    return jsonError(t.errors.databaseNotConfigured, 503);
  }


  const databaseCode = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : null;
  if (databaseCode === "23505") {
    return jsonError(t.errors.operationFailed, 409);
  }
  if (databaseCode === "23503" || databaseCode === "23514" || databaseCode === "22P02") {
    return jsonError(t.errors.invalidData, 422);
  }

  console.error("[api] Unexpected error", {
    name: error instanceof Error ? error.name : typeof error,
    ...(process.env.NODE_ENV === "development" && {
      message: error instanceof Error ? error.message : "Unknown error"
    })
  });

  return jsonError(t.errors.operationFailed, 500);
}
