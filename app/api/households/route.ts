import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuthHeader } from "@/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: households, error } = await supabaseAdmin
      .from("households")
      .select("household_id, household_name")
      .order("household_name", { ascending: true });

    if (error) {
      console.error("Error fetching households:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ households: households || [] });
  } catch (error) {
    console.error("Households API error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching households." },
      { status: 500 }
    );
  }
}

