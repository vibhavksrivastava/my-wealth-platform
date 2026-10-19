import { NextResponse, connection } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { verifyAuthHeader } from "@/lib/auth";
import { STORAGE_BUCKETS, sanitizeFileName } from "@/lib/storage";

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || STORAGE_BUCKETS.CLIENT_DOCUMENTS;
    const folder = (formData.get("folder") as string) || "";
    const purpose = (formData.get("purpose") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided in request." }, { status: 400 });
    }

    // Role-based bucket validation
    if (bucket === STORAGE_BUCKETS.PUBLIC_ASSETS) {
      if (!["ADVISOR", "STAFF", "TENANT_ADMIN", "SUPER_ADMIN", "CLIENT"].includes(session.role)) {
        return NextResponse.json({ error: "Forbidden. Insufficient permissions to upload public assets." }, { status: 403 });
      }
    } else if (bucket === STORAGE_BUCKETS.CLIENT_DOCUMENTS) {
      // If client is uploading, ensure destination folder is scoped to their client/user ID
      if (session.role === "CLIENT") {
        if (folder && !folder.startsWith(session.sub) && !folder.startsWith("client-")) {
          // Force folder to their user id to prevent overwriting other clients' folders
        }
      }
    }

    const adminClient = getServiceSupabase();
    const sanitizedName = sanitizeFileName(file.name);
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
    const storagePath = cleanFolder ? `${cleanFolder}/${sanitizedName}` : sanitizedName;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const finalPath = uploadData?.path || storagePath;

    let url: string;
    let signedUrl: string | undefined;
    let publicUrl: string | undefined;

    if (bucket === STORAGE_BUCKETS.PUBLIC_ASSETS) {
      const { data: pubData } = adminClient.storage.from(bucket).getPublicUrl(finalPath);
      url = pubData.publicUrl;
      publicUrl = pubData.publicUrl;
    } else {
      const { data: signData, error: signError } = await adminClient.storage
        .from(bucket)
        .createSignedUrl(finalPath, 3600); // 1 hour signed URL

      if (signError || !signData?.signedUrl) {
        return NextResponse.json({ error: "Uploaded successfully, but failed to generate signed URL." }, { status: 500 });
      }
      url = signData.signedUrl;
      signedUrl = signData.signedUrl;
    }

    return NextResponse.json({
      success: true,
      path: finalPath,
      url,
      publicUrl,
      signedUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      purpose,
    });
  } catch (err: any) {
    console.error("Storage upload route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

