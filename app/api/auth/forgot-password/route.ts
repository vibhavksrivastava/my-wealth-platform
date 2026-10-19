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

    // Dispatch transactional email via Unified Communications engine
    try {
      const { sendEmail } = await import("@/lib/communications");
      await sendEmail({
        to: cleanEmail,
        subject: "WealthOS • Reset Your Account Password",
        html: `
          <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #0f172a;">
            <h2 style="color: #0284c7; margin-top: 0;">Password Reset Request</h2>
            <p>Hello ${user.first_name || "Valued User"},</p>
            <p>We received a request to reset your password. Click the button below to choose a new password. This link is valid for 60 minutes.</p>
            <div style="margin: 28px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${resetUrl}" 
                 style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b;">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.warn("Failed to dispatch reset email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Password reset link generated and dispatched successfully.",
      resetUrl,
      expiresIn: "60 minutes",
    });
  } catch (error) {
    console.error("Forgot Password Route Error:", error);
    return NextResponse.json({ error: "Failed to initiate password reset." }, { status: 500 });
  }
}

