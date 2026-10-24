import { NextResponse, connection } from "next/server";
import { syncAmfiNavToDatabase } from "@/lib/amfi/navSync";
import { verifyAuthHeader } from "@/lib/auth";

export const maxDuration = 300; // Allow extended timeout for full AMFI batching

/**
 * Handles daily automated cron invocation (Vercel Cron, GitHub Actions, or Admin trigger)
 */
export async function GET(req: Request) {
  await connection();
  return handleSync(req);
}

export async function POST(req: Request) {
  await connection();
  return handleSync(req);
}

async function handleSync(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const queryKey = searchParams.get("key");

    // Verify authorized invocation
    let isAuthorized = false;

    if (cronSecret) {
      if (
        authHeader === `Bearer ${cronSecret}` ||
        req.headers.get("x-cron-secret") === cronSecret ||
        queryKey === cronSecret
      ) {
        isAuthorized = true;
      }
    } else {
      // In development or when CRON_SECRET is omitted, allow execution
      isAuthorized = true;
    }

    // Also allow authenticated platform staff/admins
    if (!isAuthorized && authHeader) {
      const session = verifyAuthHeader(authHeader);
      if (session && ["SUPER_ADMIN", "TENANT_ADMIN", "ADVISOR"].includes(session.role)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid cron authorization token." },
        { status: 401 }
      );
    }

    const batchSizeParam = searchParams.get("batchSize");
    const batchSize = batchSizeParam ? parseInt(batchSizeParam, 10) : 500;

    const result = await syncAmfiNavToDatabase({ batchSize });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error while syncing AMFI NAVs.",
      },
      { status: 500 }
    );
  }
}
