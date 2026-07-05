import { NextResponse } from "next/server";
import { MissingEnvError } from "@/lib/env";
import { logAppError } from "@/lib/logger";

export class AppError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, status = 500, code = "internal_error", details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function handleRouteError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  const status = error instanceof AppError ? error.status : error instanceof MissingEnvError ? error.status : 500;
  const code = error instanceof AppError ? error.code : error instanceof MissingEnvError ? error.code : "internal_error";
  const details = error instanceof AppError ? error.details : error instanceof MissingEnvError ? error.details : undefined;

  await logAppError({
    level: status >= 500 ? "error" : "warn",
    context,
    message,
    metadata: { code, details },
  });

  return NextResponse.json({ error: message, code, details }, { status });
}
