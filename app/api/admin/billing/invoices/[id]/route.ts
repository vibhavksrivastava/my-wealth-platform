import { NextResponse, connection } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await connection();
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const authHeader = req.headers.get("authorization") || (url.searchParams.get("token") ? `Bearer ${url.searchParams.get("token")}` : null);
    
    const session = verifyAuthHeader(authHeader);
    if (!session || !["TENANT_ADMIN", "SUPER_ADMIN", "ADVISOR"].includes(session.role)) {
      return new Response("Unauthorized. Please log in to view this statement.", { status: 401 });
    }

    // Fetch tenant
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, subdomain, firm_brand_name, firm_legal_name, arn_number, primary_color")
      .eq("id", session.tenantId)
      .maybeSingle();

    const firmName = tenant?.firm_brand_name || "Advisory Firm";
    const arn = tenant?.arn_number || "ARN-REGISTERED";
    const invoiceNumber = id.toUpperCase();
    const isCommissionStatement = id.toLowerCase().startsWith("cs-");
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isCommissionStatement ? "Commission Statement" : "Tax Invoice"} - ${invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      background-color: #f8fafc;
      color: #0f172a;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: #ecfdf5;
      color: #059669;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      border: 1px solid #a7f3d0;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .party-sub {
      font-size: 13px;
      color: #475569;
      line-height: 1.5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    th {
      background-color: #f1f5f9;
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .text-right {
      text-align: right;
    }
    .total-box {
      margin-left: auto;
      width: 280px;
      border-top: 2px solid #0f172a;
      padding-top: 12px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      padding: 4px 0;
    }
    .grand-total {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      line-height: 1.5;
      text-align: center;
    }
    .print-btn-bar {
      max-width: 800px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      background: #0284c7;
      color: #fff;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .print-btn-bar {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-btn-bar">
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">WealthOS Technologies</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
          B2B Financial SaaS &amp; Distributor Infrastructure<br>
          GSTIN: 27AAACW8892P1Z4 • CIN: U72900MH2024PTC192842
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge">PAID • SETTLED</span>
        <div style="font-size: 18px; font-weight: 800; margin-top: 8px; color: #0f172a;">${invoiceNumber}</div>
        <div style="font-size: 12px; color: #64748b;">Date: ${today}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <div class="section-title">Billed / Credited To</div>
        <div class="party-name">${firmName}</div>
        <div class="party-sub">
          AMFI Registration: ${arn}<br>
          Subdomain: ${tenant?.subdomain || "tenant"}.wealthos.com<br>
          Account Status: Active Enterprise Partner
        </div>
      </div>
      <div>
        <div class="section-title">Payment Settlement Details</div>
        <div class="party-sub">
          Payment Mode: ${isCommissionStatement ? "Direct Bank Transfer (NEFT/RTGS)" : "Auto-Debit / UPI NACH"}<br>
          Settlement Reference: CMS${Math.floor(1000000000 + Math.random() * 9000000000)}<br>
          Status: Success / Authorized
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Type</th>
          <th>Period</th>
          <th class="text-right">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${
          isCommissionStatement
            ? `<tr>
                <td>Mutual Fund Trail Commission Share (80% Distributor Payout)</td>
                <td>Commission Split</td>
                <td>Current Month</td>
                <td class="text-right">₹48,620.00</td>
              </tr>
              <tr>
                <td>BSE StAR MF Execution Engine Processing</td>
                <td>Universal Included</td>
                <td>100% Free</td>
                <td class="text-right">₹0.00</td>
              </tr>`
            : `<tr>
                <td>SaaS Subscription Platform License &amp; White-Label Portal</td>
                <td>Monthly Plan</td>
                <td>Current Month</td>
                <td class="text-right">₹2,117.80</td>
              </tr>
              <tr>
                <td>Integrated BSE StAR MF Order Routing Infrastructure</td>
                <td>Core Engine</td>
                <td>Universal Access</td>
                <td class="text-right">₹0.00</td>
              </tr>
              <tr>
                <td>Integrated GST (18% on SaaS Platform Fee)</td>
                <td>Tax</td>
                <td>IGST @ 18%</td>
                <td class="text-right">₹381.20</td>
              </tr>`
        }
      </tbody>
    </table>

    <div class="total-box">
      <div class="total-row">
        <span>Subtotal</span>
        <span>${isCommissionStatement ? "₹48,620.00" : "₹2,117.80"}</span>
      </div>
      ${
        !isCommissionStatement
          ? `<div class="total-row">
              <span>GST (18%)</span>
              <span>₹381.20</span>
            </div>`
          : ""
      }
      <div class="total-row grand-total">
        <span>Total ${isCommissionStatement ? "Payout" : "Paid"}</span>
        <span style="color: #0284c7;">${isCommissionStatement ? "₹48,620.00" : "₹2,499.00"}</span>
      </div>
    </div>

    <div class="footer">
      This is an electronically generated statement verified via cryptographic token authorization. No physical signature is required.<br>
      For billing queries or AMFI ARN reconciliation, contact distributor-support@wealthos.com.
    </div>
  </div>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Invoice Download Route Error:", error);
    return new Response("Failed to generate statement view.", { status: 500 });
  }
}

