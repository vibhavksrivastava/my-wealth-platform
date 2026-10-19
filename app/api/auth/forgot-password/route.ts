import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  await connection();
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email, first_name, is_active")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (!user || !user.is_active) {
      // Return generic success to prevent email enumeration
      return NextResponse.json({
        success: true,
        message: "If an account with that email exists, password reset instructions have been generated.",
      });
    }

    // Generate secure 32-byte hex token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

    // Store in password_reset_tokens table (or fallback)
    try {
      await supabaseAdmin.from("password_reset_tokens").insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      });
    } catch (err) {
      console.warn("Could not insert to password_reset_tokens table:", err);
    }

    const resetUrl = `/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    return NextResponse.json({
      success: true,
      message: "Password reset link generated successfully.",
      resetUrl,
      expiresIn: "60 minutes",
    });
  } catch (error) {
    console.error("Forgot Password Route Error:", error);
    return NextResponse.json({ error: "Failed to initiate password reset." }, { status: 500 });
  }
}

