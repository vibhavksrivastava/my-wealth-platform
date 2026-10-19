import { supabase, getServiceSupabase } from "@/lib/supabase";

export const STORAGE_BUCKETS = {
  PUBLIC_ASSETS: "public-assets",
  CLIENT_DOCUMENTS: "client-documents",
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

export interface UploadOptions {
  bucket: StorageBucket | string;
  folder?: string;
  customFileName?: string;
  upsert?: boolean;
  expiresInSeconds?: number; // default: 3600 (1 hour) for signed URLs
}

export interface UploadResult {
  path: string;
  url: string; // Public URL for public-assets, or secure Signed URL for client-documents
  publicUrl?: string;
  signedUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

/**
 * Clean and format file names for safe storage
 */
export function sanitizeFileName(name: string): string {
  const parts = name.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()}` : "";
  const baseName = parts.join(".")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 50);
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return `${baseName}_${uniqueSuffix}${ext}`;
}

/**
 * Uploads a file to Supabase Storage with automatic URL generation.
 * - public-assets: returns permanent public CDN URL
 * - client-documents: returns time-limited cryptographically signed URL
 */
export async function uploadFile(
  file: File | Blob,
  options: UploadOptions
): Promise<UploadResult> {
  const {
    bucket,
    folder = "",
    customFileName,
    upsert = true,
    expiresInSeconds = 3600,
  } = options;

  const rawName = file instanceof File ? file.name : (customFileName || "document.bin");
  const fileName = customFileName || sanitizeFileName(rawName);
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  const fullPath = cleanFolder ? `${cleanFolder}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file, {
      upsert,
      contentType: file.type || "application/octet-stream",
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const storedPath = data?.path || fullPath;
  const fileSize = file.size;
  const fileType = file.type;

  if (bucket === STORAGE_BUCKETS.PUBLIC_ASSETS) {
    const publicUrl = getPublicUrl(bucket, storedPath);
    return {
      path: storedPath,
      url: publicUrl,
      publicUrl,
      fileName: rawName,
      fileSize,
      fileType,
    };
  } else {
    // Generate secure temporary signed URL for private client documents
    const signedUrl = await createSignedUrl(bucket, storedPath, expiresInSeconds);
    return {
      path: storedPath,
      url: signedUrl,
      signedUrl,
      fileName: rawName,
      fileSize,
      fileType,
    };
  }
}

/**
 * Returns the permanent public CDN URL for an asset in a public bucket
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Generates a secure, time-limited signed URL to view/download private files
 */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message || "Unknown error"}`);
  }

  return data.signedUrl;
}

/**
 * Deletes a file from Supabase storage
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`Failed to delete file ${path}:`, error);
    return false;
  }
  return true;
}

/**
 * Downloads a private file as a Blob (useful for direct client processing or print)
 */
export async function downloadFile(bucket: string, path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) {
    throw new Error(`Failed to download file: ${error?.message || "File not found"}`);
  }
  return data;
}

/**
 * Programmatic bucket initialization helper (Server-Side using service role)
 * Ensures both `public-assets` and `client-documents` exist with correct security settings.
 */
export async function ensureStorageBuckets(): Promise<{
  publicAssets: boolean;
  clientDocuments: boolean;
}> {
  const adminClient = getServiceSupabase();
  const { data: existingBuckets, error: listError } = await adminClient.storage.listBuckets();
  
  if (listError) {
    console.error("Failed to list storage buckets:", listError);
    return { publicAssets: false, clientDocuments: false };
  }

  const bucketIds = new Set((existingBuckets || []).map((b) => b.id));

  // 1. Ensure public-assets
  if (!bucketIds.has(STORAGE_BUCKETS.PUBLIC_ASSETS)) {
    await adminClient.storage.createBucket(STORAGE_BUCKETS.PUBLIC_ASSETS, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"],
    });
  }

  // 2. Ensure client-documents
  if (!bucketIds.has(STORAGE_BUCKETS.CLIENT_DOCUMENTS)) {
    await adminClient.storage.createBucket(STORAGE_BUCKETS.CLIENT_DOCUMENTS, {
      public: false, // Private
      fileSizeLimit: 20971520, // 20MB
      allowedMimeTypes: [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
    });
  }

  return { publicAssets: true, clientDocuments: true };
}
