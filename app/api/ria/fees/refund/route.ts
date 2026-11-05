import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import { calculateEarlyTerminationRefund } from "@/lib/ria/riaService";

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const {
      advanceAmountPaid,
      periodStartDate,
      periodEndDate,
      terminationDate,
      allowBreakageFee = true,
    } = body;

    if (!advanceAmountPaid || Number(advanceAmountPaid) <= 0) {
      return NextResponse.json(
        { error: "Advance fee paid must be greater than zero." },
        { status: 400 }
      );
    }
    if (!periodStartDate || !periodEndDate) {
      return NextResponse.json(
        { error: "Period start date and end date are required." },
        { status: 400 }
      );
    }

    const refundCalc = calculateEarlyTerminationRefund({
      advanceAmountPaid: Number(advanceAmountPaid),
      periodStartDate,
      periodEndDate,
      terminationDate,
      allowBreakageFee: Boolean(allowBreakageFee),
    });

    return NextResponse.json({
      success: true,
      calculation: refundCalc,
      regulatoryNotice:
        "Calculated per SEBI (Investment Advisers) Regulations, 2013: Clients terminating before cycle completion are entitled to pro-rata unearned fee refunds, subject to allowable breakage fee not exceeding one quarter's fee.",
    });
  } catch (err: any) {
    console.error("Error calculating RIA early termination refund:", err);
    return NextResponse.json(
      { error: err.message || "Failed to calculate early termination refund." },
      { status: 500 }
    );
  }
}

