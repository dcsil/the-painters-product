import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [dbResult, gemini, groq, blob] = await Promise.all([
    prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false),
    Promise.resolve(!!process.env.GEMINI_API_KEY),
    Promise.resolve(!!process.env.GROQ_API_KEY),
    Promise.resolve(!!process.env.BLOB_READ_WRITE_TOKEN),
  ]);

  const checks = { db: dbResult as boolean, gemini, groq, blob };
  const status = Object.values(checks).every(Boolean) ? "ok" : "degraded";

  return NextResponse.json({ status, checks });
}
