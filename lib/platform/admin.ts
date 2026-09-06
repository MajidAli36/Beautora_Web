/** Hardcoded Beautora platform admin (SyncOps). */

export const PLATFORM_HARDCODED_ADMIN = {
  email: "admin@syncops.tech",
  password: "Admin123!",
  fullName: "Beautora Platform Admin",
} as const;

export function isHardcodedPlatformAdminEmail(
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PLATFORM_HARDCODED_ADMIN.email;
}
