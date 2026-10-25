import { NextResponse, connection } from "next/server";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { promisify } from "util";
import { verifyAuthHeader } from "@/lib/auth";

const execFileAsync = promisify(execFile);

export async function POST(req: Request) {
  await connection();
  try {
    const session = verifyAuthHeader(req.headers.get("authorization"));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const password = (formData.get("password") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No PDF file was provided in the upload." }, { status: 400 });
    }

    // Save uploaded file to temp directory
    const tempFileName = `cas_upload_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempFilePath, buffer);

    try {
      const scriptPath = path.resolve(process.cwd(), "scripts/parse_cas_pdf.py");
      const args = [scriptPath, tempFilePath];
      if (password.trim()) {
        args.push(password.trim());
      }

      const { stdout, stderr } = await execFileAsync("python", args, {
        maxBuffer: 15 * 1024 * 1024,
      });

      if (!stdout || !stdout.trim()) {
        throw new Error(stderr || "PDF parser produced no output.");
      }

      const parsed = JSON.parse(stdout);
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      return NextResponse.json(parsed);
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      } catch (cleanupErr) {
        console.warn("Failed to delete temp CAS PDF file:", cleanupErr);
      }
    }
  } catch (err: any) {
    console.error("CAS PDF Parse Route Error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while parsing the CAS PDF." },
      { status: 500 }
    );
  }
}
