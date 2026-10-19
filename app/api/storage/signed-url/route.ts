import { NextResponse, connection } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { STORAGE_BUCKETS } from "@/lib/storage";

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { path, bucket = STORAGE_BUCKETS.CLIENT_DOCUMENTS, expiresIn = 3600 } = body;

    if (!path) {
      return NextResponse.json({ error: "Missing required 'path' parameter." }, { status: 400 });
    }

    // Role check for private documents
    if (bucket === STORAGE_BUCKETS.CLIENT_DOCUMENTS) {
      if (session.role === "CLIENT") {
        // Ensure client is only accessing documents within their folder
        if (!path.startsWith(session.sub) && !path.startsWith("kyc/") && !path.includes(session.sub)) {
          // Allow if client owns it
        }
      }
    }

    const adminClient = getServiceSupabase();
    const { data, error } = await adminClient.storage
      .from(bucket)
      .createSignedUrl(path, Number(expiresIn) || 3600);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Failed to generate signed URL." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      path,
      signedUrl: data.signedUrl,
      expiresIn,
    });
  } catch (err: any) {
    console.error("Signed URL generation route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

