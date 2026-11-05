import { NextResponse, connection } from "next/server";
import { verifyAuthHeader } from "@/lib/auth";
import {
  listRiaInvoices,
  createRiaTaxInvoice,
  markInvoicePaid,
  RiaPaymentChannel,
} from "@/lib/ria/riaService";

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || session.tenantId;
    const clientId = searchParams.get("clientId") || undefined;

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }

    const invoices = await listRiaInvoices(tenantId, clientId);

    return NextResponse.json({
      success: true,
      invoices,
    });
  } catch (err: any) {
    console.error("Error listing RIA invoices:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list invoices." },
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
      baseFeeAmount,
      periodStartDate,
      periodEndDate,
      feeConfigId,
      tenantId = session.tenantId,
    } = body;

    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
    }
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }
    if (!baseFeeAmount || Number(baseFeeAmount) <= 0) {
      return NextResponse.json({ error: "Base fee amount must be positive." }, { status: 400 });
    }

    const now = new Date();
    const defaultStart = periodStartDate || now.toISOString().split("T")[0];
    const end = new Date(now);
    end.setMonth(end.getMonth() + 12);
    const defaultEnd = periodEndDate || end.toISOString().split("T")[0];

    const invoice = await createRiaTaxInvoice({
      tenantId,
      clientId,
      baseFeeAmount: Number(baseFeeAmount),
      periodStartDate: defaultStart,
      periodEndDate: defaultEnd,
      feeConfigId,
    });

    return NextResponse.json({
      success: true,
      message: "Tax invoice generated with 18% statutory GST breakdown.",
      invoice,
    });
  } catch (err: any) {
    console.error("Error creating RIA invoice:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create invoice." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { invoiceId, paymentChannel, paymentReference, tenantId = session.tenantId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required." }, { status: 400 });
    }
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
    }
    if (!paymentReference || !paymentReference.trim()) {
      return NextResponse.json(
        { error: "Official bank transaction reference / UTR is required under SEBI regulations." },
        { status: 400 }
      );
    }
    if (!paymentChannel || !["UPI", "NEFT", "RTGS", "NETBANKING", "CHEQUE"].includes(paymentChannel)) {
      return NextResponse.json(
        { error: "Invalid payment channel. Must be official banking rails (UPI, NEFT, RTGS, NETBANKING)." },
        { status: 400 }
      );
    }

    const updatedInvoice = await markInvoicePaid({
      tenantId,
      invoiceId,
      paymentChannel: paymentChannel as RiaPaymentChannel,
      paymentReference: paymentReference.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully reconciled and logged into RIA compliance ledger.",
      invoice: updatedInvoice,
    });
  } catch (err: any) {
    console.error("Error reconciling RIA invoice payment:", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark invoice as paid." },
      { status: 500 }
    );
  }
}

