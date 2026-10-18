import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "b06dbe17-9065-4ac9-9cc0-7edd69c5e393";

export interface SessionPayload {
  sub: string;
  tenantId: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  permissions: string[];
}

export function verifyAuthHeader(authHeader: string | null): SessionPayload | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return payload;
  } catch {
    return null;
  }
}

