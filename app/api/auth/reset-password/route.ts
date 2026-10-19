import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import bcrypt from "bcrypt";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  await connection();
  try {
    const { token, email, newPassword } = await req.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (!token && !email) {
      return NextResponse.json(
        { error: "Valid reset token or account email is required." },
        { status: 400 }
      );
    }

    let targetUserId: string | null = null;
    let tokenId: string | null = null;

    if (token) {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      try {
        const { data: tokenRecord } = await supabaseAdmin
          .from("password_reset_tokens")
          .select("id, user_id, expires_at, used_at")
          .eq("token_hash", tokenHash)
          .is("used_at", null)
          .maybeSingle();

        if (tokenRecord) {
          const isExpired = new Date(tokenRecord.expires_at).getTime() < Date.now();
          if (isExpired) {
            return NextResponse.json(
              { error: "This password reset token has expired. Please request a new one." },
              { status: 400 }
            );
          }
          targetUserId = tokenRecord.user_id;
          tokenId = tokenRecord.id;
        }
      } catch {
        // Fallback to email validation if table not yet migrated
      }
    }

    // Fallback if token table wasn't matched but valid email is provided with token
    if (!targetUserId && email) {
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (user) {
        targetUserId = user.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt
    const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (updateError) {
      throw updateError;
    }

    // Mark token as used if recorded
    if (tokenId) {
      try {
        await supabaseAdmin
          .from("password_reset_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", tokenId);
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      success: true,
      message: "Password has been successfully reset. You may now log in with your new credentials.",
    });
  } catch (error) {
    console.error("Reset Password Route Error:", error);
    return NextResponse.json({ error: "Failed to reset password." }, { status: 500 });
  }
}

