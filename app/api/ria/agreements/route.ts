import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getClientAgreement,
  createOrUpdateAgreement,
  validateSebiFeeLimits,
  SEBI_RIA_LIMITS,
  RiaFeeMode,
  RiaBillingFrequency,
} from "@/lib/ria/riaService";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let clientId = searchParams.get("clientId");
    const tenantId = searchParams.get("tenantId") || session.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }

    // If client is logged in, find their clientId
    if (session.role === "CLIENT" && !clientId) {
      const { data: clientRec } = await supabaseAdmin
        .from("clients")
        .select("client_id")
        .eq("user_id", session.sub)
        .maybeSingle();

      if (clientRec) {
        clientId = clientRec.client_id;
      }
    }

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
    }

    const agreement = await getClientAgreement(tenantId, clientId);

    return NextResponse.json({
      success: true,
      agreement,
      sebiLimits: SEBI_RIA_LIMITS,
    });
  } catch (err: any) {
    console.error("Error fetching RIA agreement:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch RIA agreement." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const {
      clientId,
      tenantId = session.tenantId,
      feeMode,
      agreedFeeAmount,
      agreedFeeFrequency = "ANNUALLY",
      scopeOfServices,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
    }
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }
    if (!feeMode || !["FIXED", "AUA_PERCENTAGE"].includes(feeMode)) {
      return NextResponse.json(
        { error: "Invalid fee mode. Must be FIXED or AUA_PERCENTAGE." },
        { status: 400 }
      );
    }

    const numAmount = Number(agreedFeeAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Agreed fee amount must be a positive number." },
        { status: 400 }
      );
    }

    // Validate strictly against SEBI caps
    const capCheck = validateSebiFeeLimits(
      feeMode as RiaFeeMode,
      numAmount,
      agreedFeeFrequency as RiaBillingFrequency
    );

    if (!capCheck.isValid) {
      return NextResponse.json(
        {
          error: capCheck.error,
          code: "SEBI_FEE_CAP_EXCEEDED",
          limits: SEBI_RIA_LIMITS,
        },
        { status: 400 }
      );
    }

    const agreement = await createOrUpdateAgreement({
      tenantId,
      clientId,
      feeMode: feeMode as RiaFeeMode,
      agreedFeeAmount: numAmount,
      agreedFeeFrequency: agreedFeeFrequency as RiaBillingFrequency,
      scopeOfServices,
    });

    return NextResponse.json({
      success: true,
      message: "Advisory agreement created successfully with SEBI compliance.",
      agreement,
    });
  } catch (err: any) {
    console.error("Error creating RIA agreement:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create advisory agreement." },
      { status: 500 }
    );
  }
}

