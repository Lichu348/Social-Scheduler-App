import { NextResponse } from "next/server";
import { AppError } from "./errors";
import { Prisma } from "@prisma/client";

export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }

  // Prisma unique constraint violation
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this value already exists", code: "DUPLICATE" },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Record not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

/**
 * Safely parse JSON with a fallback value
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}
