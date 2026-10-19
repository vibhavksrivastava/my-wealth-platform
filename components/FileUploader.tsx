"use client";

import React, { useState, useRef, ChangeEvent, DragEvent } from "react";
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Loader2, 
  ShieldCheck, 
  Building2, 
  CreditCard,
  Trash2,
  RefreshCw
} from "lucide-react";
import { uploadFile, STORAGE_BUCKETS, StorageBucket } from "@/lib/storage";

export type UploadPurpose = "pan_card" | "firm_logo" | "general";

export interface FileUploaderProps {
  /** Upload context preset: tailored icons, limits, and security defaults */
  purpose?: UploadPurpose;
  /** Storage bucket: 'public-assets' or 'client-documents' */
  bucket?: StorageBucket | string;
  /** Subfolder in bucket, e.g. 'logos' or 'kyc/user_123' */
  folder?: string;
  /** Custom heading label */
  label?: string;
  /** Custom helper description */
  description?: string;
  /** Current active file URL for preview */
  currentUrl?: string | null;
  /** Current active storage path */
  currentPath?: string | null;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Accepted MIME types or extensions (e.g. '.png,.jpg,.pdf') */
  accept?: string;
  /** Callback fired upon successful upload */
  onUploadComplete?: (result: {
    path: string;
    url: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }) => void;
  /** Optional callback fired when file is removed */
  onRemove?: () => void;
  /** Optional error handler */
  onError?: (errorMessage: string) => void;
  /** Disable interactions */
  disabled?: boolean;
  /** Additional container classes */
  className?: string;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function FileUploader({
  purpose = "general",
  bucket: customBucket,
  folder: customFolder,
  label,
  description,
  currentUrl,
  currentPath,
  maxSizeMB,
  accept: customAccept,
  onUploadComplete,
  onRemove,
  onError,
  disabled = false,
  className = "",
}: FileUploaderProps) {
  // Determine presets based on purpose
  const isLogo = purpose === "firm_logo";
  const isPan = purpose === "pan_card";

  const bucket = customBucket || (isLogo ? STORAGE_BUCKETS.PUBLIC_ASSETS : STORAGE_BUCKETS.CLIENT_DOCUMENTS);
  const folder = customFolder || (isLogo ? "logos" : isPan ? "kyc/pan" : "uploads");
  const sizeLimitMB = maxSizeMB || (isLogo ? 5 : 15);
  const acceptTypes = customAccept || (isLogo ? "image/png,image/jpeg,image/webp,image/svg+xml" : "application/pdf,image/png,image/jpeg,image/jpg");

  const defaultLabel = isLogo
    ? "Upload Advisory Firm Logo"
    : isPan
    ? "Upload PAN Card / KYC Document"
    : "Upload Document";

  const defaultDescription = isLogo
    ? "Recommended: High-resolution PNG or SVG with transparent background (Max 5MB)."
    : isPan
    ? "Upload a clear scan of your PAN Card or Form 60 (PDF, PNG, JPG up to 15MB). Encrypted & private."
    : "Drag & drop your file here or click to browse.";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    path: string;
    name: string;
    size?: number;
    type?: string;
  } | null>(
    currentUrl ? { url: currentUrl, path: currentPath || "", name: isLogo ? "Firm Logo" : "Uploaded Document" } : null
  );

  // Sync with prop updates
  React.useEffect(() => {
    if (currentUrl) {
      setUploadedFile({
        url: currentUrl,
        path: currentPath || "",
        name: isLogo ? "Firm Logo" : "Uploaded Document",
      });
    }
  }, [currentUrl, currentPath, isLogo]);

  const validateFile = (file: File): string | null => {
    const maxSizeBytes = sizeLimitMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File exceeds maximum allowed size of ${sizeLimitMB} MB (${formatBytes(file.size)}).`;
    }

    if (acceptTypes) {
      const allowed = acceptTypes.split(",").map((t) => t.trim().toLowerCase());
      const fileType = file.type.toLowerCase();
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      
      const isAllowed = allowed.some((t) => {
        if (t.startsWith(".")) return t === fileExt;
        if (t.endsWith("/*")) return fileType.startsWith(t.slice(0, -2));
        return t === fileType;
      });

      if (!isAllowed) {
        return `Unsupported file format. Please upload: ${acceptTypes}`;
      }
    }

    return null;
  };

  const processUpload = async (file: File) => {
    setErrorMessage(null);
    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      onError?.(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    try {
      let finalResult: {
        path: string;
        url: string;
        fileName: string;
        fileSize: number;
        fileType: string;
      } | null = null;

      // Attempt authenticated Next.js API upload first
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      let usedApi = false;

      if (token) {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("bucket", bucket);
          form.append("folder", folder);
          form.append("purpose", purpose);

          setUploadProgress(50);
          const res = await fetch("/api/storage/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });

          if (res.ok) {
            const apiData = await res.json();
            finalResult = {
              path: apiData.path,
              url: apiData.url || apiData.signedUrl || apiData.publicUrl,
              fileName: apiData.fileName || file.name,
              fileSize: apiData.fileSize || file.size,
              fileType: apiData.fileType || file.type,
            };
            usedApi = true;
          }
        } catch {
          // Fall back to direct Supabase client upload
        }
      }

      if (!usedApi || !finalResult) {
        // Fallback: direct Supabase browser client upload
        setUploadProgress(60);
        const result = await uploadFile(file, {
          bucket,
          folder,
          upsert: true,
          expiresInSeconds: 3600,
        });

        finalResult = {
          path: result.path,
          url: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          fileType: result.fileType,
        };
      }

      if (!finalResult) {
        throw new Error("Unable to complete upload. Please check storage bucket permissions.");
      }

      setUploadProgress(100);
      setUploadedFile({
        url: finalResult.url,
        path: finalResult.path,
        name: finalResult.fileName,
        size: finalResult.fileSize,
        type: finalResult.fileType,
      });

      onUploadComplete?.(finalResult);
    } catch (err: any) {
      const msg = err.message || "Failed to upload file. Please try again.";
      setErrorMessage(msg);
      onError?.(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUpload(file);
    }
    // Reset input so same file can be re-selected if replaced
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUpload(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setErrorMessage(null);
    onRemove?.();
  };

  const isImage = (mimeOrName?: string) => {
    if (!mimeOrName) return false;
    const lower = mimeOrName.toLowerCase();
    return (
      lower.includes("image") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".svg")
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          {isLogo && <Building2 className="h-4 w-4 text-emerald-400" />}
          {isPan && <CreditCard className="h-4 w-4 text-sky-400" />}
          {!isLogo && !isPan && <FileText className="h-4 w-4 text-purple-400" />}
          <span>{label || defaultLabel}</span>
        </label>
        {bucket === STORAGE_BUCKETS.CLIENT_DOCUMENTS && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full">
            <ShieldCheck className="h-3 w-3" />
            256-bit Encrypted
          </span>
        )}
      </div>

      {/* Upload Zone / Preview Card */}
      {!uploadedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 transition flex flex-col items-center justify-center text-center cursor-pointer group select-none ${
            disabled
              ? "border-slate-800 bg-slate-900/30 opacity-60 cursor-not-allowed"
              : isDragging
              ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
              : "border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-900/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center py-3">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mb-2" />
              <p className="text-xs font-semibold text-white">Encrypting and uploading file...</p>
              {uploadProgress !== null && (
                <div className="w-48 bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 group-hover:scale-110 transition duration-200 mb-3 text-slate-400 group-hover:text-emerald-400">
                {isLogo ? (
                  <ImageIcon className="h-6 w-6" />
                ) : isPan ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <UploadCloud className="h-6 w-6" />
                )}
              </div>
              <p className="text-xs font-semibold text-slate-200">
                Click to browse or drag & drop file
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                {description || defaultDescription}
              </p>
            </>
          )}
        </div>
      ) : (
        /* Uploaded File Preview Card */
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isImage(uploadedFile.type || uploadedFile.name || uploadedFile.url) ? (
              <div className="h-12 w-12 rounded-lg bg-slate-900 border border-slate-700 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src={uploadedFile.url}
                  alt={uploadedFile.name}
                  className="h-full w-full object-contain rounded"
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-lg bg-sky-950/40 border border-sky-800/40 shrink-0 flex items-center justify-center text-sky-400">
                <FileText className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                  {uploadedFile.name}
                </p>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                {uploadedFile.size && <span>{formatBytes(uploadedFile.size)} &bull;</span>}
                <span className="capitalize text-emerald-400 font-medium">Ready</span>
                {bucket === STORAGE_BUCKETS.CLIENT_DOCUMENTS && (
                  <span className="text-sky-400 font-medium">&bull; Private</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={uploadedFile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
              title="Open / Preview in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
              title="Replace file"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 border border-rose-900/40 transition"
              title="Remove file"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="hidden"
          />
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/40 text-rose-300 text-xs flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
