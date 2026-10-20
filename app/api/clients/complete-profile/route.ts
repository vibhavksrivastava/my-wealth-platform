import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import type { CompleteFactFindPayload } from "@/types/factfind";


export async function POST(req: Request) {
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    const payload: CompleteFactFindPayload = await req.json();
    const { personal, income, expenses, assets, liabilities, investments } = payload;

    if (!personal || !personal.full_name || !personal.date_of_birth) {
      return NextResponse.json(
        { error: "Client full name and date of birth are required." },
        { status: 400 }
      );
    }

    // 1. Resolve Household Assignment
    let householdId = personal.household_id;
    if (personal.household_mode === "new" && personal.new_household_name?.trim()) {
      const { data: newHh, error: hhErr } = await supabaseAdmin
        .from("households")
        .insert({
          household_name: personal.new_household_name.trim(),
        })
        .select("household_id")
        .single();

      if (hhErr || !newHh) {
        console.error("Household creation error:", hhErr);
        return NextResponse.json({ error: "Failed to create household." }, { status: 500 });
      }
      householdId = newHh.household_id;
    } else if (!householdId) {
      // Fallback: create auto household
      const { data: autoHh } = await supabaseAdmin
        .from("households")
        .insert({
          household_name: `${personal.full_name} Household`,
        })
        .select("household_id")
        .single();

      if (autoHh) {
        householdId = autoHh.household_id;
      }
    }

    // 2. Generate Unique UWP Client Code
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const uwpCode = `UWP-2026-${randomSuffix}`;

    // 3. Insert Client Profile Record
    const clientRecordData = {
      tenant_id: session.tenantId,
      user_id: session.role === "CLIENT" ? session.sub : null,
      household_id: householdId,
      uwp_client_code: uwpCode,
      full_name: personal.full_name.trim(),
      date_of_birth: personal.date_of_birth,
      marital_status: personal.marital_status || "Married",
      dependents_count: Number(personal.dependents_count || 0),
      occupation: personal.occupation || null,
      employer_business_name: personal.employer_business_name || null,
      annual_gross_income: Number(personal.annual_gross_income || 0),
      tax_regime: personal.tax_regime || "New",
      risk_profile: personal.risk_profile || "Moderate",
      planning_horizon_years: Number(personal.planning_horizon_years || 6.0),
      advisor_name: personal.advisor_name || `${session.firstName} ${session.lastName}`,
      review_frequency: personal.review_frequency || "Annual",
      spouse_name: personal.spouse_name || null,
      spouse_dob: personal.spouse_dob || null,
      planning_disclosures_notes: personal.planning_disclosures_notes || null,
    };

    const { data: insertedClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert(clientRecordData)
      .select("client_id")
      .single();

    if (clientError || !insertedClient) {
      console.error("Client insertion error:", clientError);
      return NextResponse.json(
        { error: clientError?.message || "Failed to create client fact-find profile." },
        { status: 500 }
      );
    }

    const clientId = insertedClient.client_id;

    // 4. Insert Income Sources
    if (income && income.length > 0) {
      const incomeRows = income
        .filter((inc) => inc.category && Number(inc.monthly_amount) > 0)
        .map((inc) => ({
          client_id: clientId,
          category: inc.category,
          monthly_amount: Number(inc.monthly_amount),
          notes: inc.notes || null,
        }));

      if (incomeRows.length > 0) {
        const { error: incError } = await supabaseAdmin.from("income_sources").insert(incomeRows);
        if (incError) console.error("Income sources error:", incError);
      }
    }

    // 5. Insert Expense Items
    if (expenses && expenses.length > 0) {
      const expenseRows = expenses
        .filter((exp) => exp.category && Number(exp.monthly_amount) > 0)
        .map((exp) => ({
          client_id: clientId,
          category: exp.category,
          monthly_amount: Number(exp.monthly_amount),
          is_essential: Boolean(exp.is_essential),
          notes: exp.notes || null,
        }));

      if (expenseRows.length > 0) {
        const { error: expError } = await supabaseAdmin.from("expense_items").insert(expenseRows);
        if (expError) console.error("Expense items error:", expError);
      }
    }

    // 6. Insert Balance Sheet Assets
    if (assets && assets.length > 0) {
      const assetRows = assets
        .filter((ast) => ast.asset_category && Number(ast.current_market_value) > 0)
        .map((ast) => ({
          client_id: clientId,
          asset_category: ast.asset_category,
          description: ast.description || ast.asset_category,
          owner_name: ast.owner_name || personal.full_name,
          current_market_value: Number(ast.current_market_value),
          is_liquid: Boolean(ast.is_liquid),
          notes: ast.notes || null,
        }));

      if (assetRows.length > 0) {
        const { error: astError } = await supabaseAdmin.from("assets").insert(assetRows);
        if (astError) console.error("Assets insertion error:", astError);
      }
    }

    // 7. Insert Balance Sheet Liabilities
    if (liabilities && liabilities.length > 0) {
      const liabilityRows = liabilities
        .filter((lia) => lia.liability_type && Number(lia.outstanding_principal) > 0)
        .map((lia) => ({
          client_id: clientId,
          liability_type: lia.liability_type,
          lender_name: lia.lender_name || null,
          outstanding_principal: Number(lia.outstanding_principal),
          annual_interest_rate: Number(lia.annual_interest_rate || 0),
          monthly_emi: Number(lia.monthly_emi || 0),
          tenure_remaining_months: Number(lia.tenure_remaining_months || 0),
          notes: lia.notes || null,
        }));

      if (liabilityRows.length > 0) {
        const { error: liaError } = await supabaseAdmin.from("liabilities").insert(liabilityRows);
        if (liaError) console.error("Liabilities insertion error:", liaError);
      }
    }

    // 8. Insert Investment Portfolio
    if (investments && investments.length > 0) {
      const investmentRows = investments
        .filter((inv) => inv.scheme_instrument_name && (Number(inv.current_value) > 0 || Number(inv.invested_amount) > 0))
        .map((inv) => ({
          client_id: clientId,
          asset_class: inv.asset_class,
          scheme_instrument_name: inv.scheme_instrument_name,
          owner_name: inv.owner_name || personal.full_name,
          invested_amount: Number(inv.invested_amount || 0),
          current_value: Number(inv.current_value || 0),
          monthly_sip_amount: Number(inv.monthly_sip_amount || 0),
          expected_return_cagr:
            Number(inv.expected_return_cagr || 0.12) > 1
              ? Number(inv.expected_return_cagr) / 100
              : Number(inv.expected_return_cagr || 0.12),
          goal_purpose: inv.goal_purpose || null,
          notes: inv.notes || null,
        }));

      if (investmentRows.length > 0) {
        const { error: invError } = await supabaseAdmin.from("investment_portfolio").insert(investmentRows);
        if (invError) console.error("Investments insertion error:", invError);
      }
    }

    // 9. Financial Snapshot Computations
    const totalPhysicalAssets = (assets || []).reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);
    const totalInvestments = (investments || []).reduce((sum, i) => sum + Number(i.current_value || 0), 0);
    const totalAssets = totalPhysicalAssets + totalInvestments;
    const totalLiabilities = (liabilities || []).reduce((sum, l) => sum + Number(l.outstanding_principal || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    const liquidAssets = (assets || [])
      .filter((a) => a.is_liquid)
      .reduce((sum, a) => sum + Number(a.current_market_value || 0), 0);

    const monthlyInflow = (income || []).reduce((sum, inc) => sum + Number(inc.monthly_amount || 0), 0);
    const monthlyExpenses = (expenses || []).reduce((sum, exp) => sum + Number(exp.monthly_amount || 0), 0);
    const monthlyEMIs = (liabilities || []).reduce((sum, lia) => sum + Number(lia.monthly_emi || 0), 0);
    const monthlyOutflow = monthlyExpenses + monthlyEMIs;
    const monthlySurplus = monthlyInflow - monthlyOutflow;
    const savingsRatio = monthlyInflow > 0 ? (monthlySurplus / monthlyInflow) * 100 : 0;

    // 10. Record Client Snapshot
    await supabaseAdmin.from("client_dashboard_snapshots").insert({
      client_id: clientId,
      snapshot_date: new Date().toISOString().slice(0, 10),
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: netWorth,
      liquid_assets: liquidAssets,
      savings_ratio: savingsRatio,
    });

    // 11. Synchronize Client Profiles if linked to user
    if (session.role === "CLIENT" || personal.pan_number) {
      await supabaseAdmin.from("client_profiles").upsert(
        {
          tenant_id: session.tenantId,
          user_id: session.sub,
          household_id: householdId,
          pan_number: personal.pan_number || null,
          date_of_birth: personal.date_of_birth,
          risk_profile_category: personal.risk_profile,
          total_assets: totalAssets,
          total_liabilities: totalLiabilities,
          net_worth: netWorth,
          net_worth_updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    return NextResponse.json({
      success: true,
      clientId,
      uwpCode,
      message: "Client financial fact-find profile recorded successfully.",
      summary: {
        totalAssets,
        totalLiabilities,
        netWorth,
        monthlyInflow,
        monthlyOutflow,
        monthlySurplus,
        savingsRatio,
      },
    });
  } catch (error) {
    console.error("Complete profile API error:", error);
    return NextResponse.json(
      { error: "Internal server error saving client profile." },
      { status: 500 }
    );
  }
}

