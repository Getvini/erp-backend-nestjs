import * as crypto from "crypto";

const DEFAULT_COMPANY_FOLDER = "GETVINI";

export function sanitizeCloudinarySegment(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || DEFAULT_COMPANY_FOLDER
  );
}

export function getCloudinaryFolder(folder?: string): string {
  const companyFolder = sanitizeCloudinarySegment(DEFAULT_COMPANY_FOLDER);
  const rawFolder = folder || "ERP/others";
  const segments = rawFolder
    .split("/")
    .map((s) => sanitizeCloudinarySegment(s))
    .filter(Boolean);

  const cleanFolder = segments.join("/");
  if (!cleanFolder) {
    return `${companyFolder}/ERP/others`;
  }
  if (
    cleanFolder === companyFolder ||
    cleanFolder.startsWith(`${companyFolder}/`)
  ) {
    return cleanFolder;
  }
  return `${companyFolder}/${cleanFolder}`;
}

export function signCloudinaryRequest(
  params: Record<string, any>,
  apiSecret: string,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto
    .createHash("sha1")
    .update(sorted + apiSecret)
    .digest("hex");
}
