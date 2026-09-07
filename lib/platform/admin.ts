/** Hardcoded Beautora platform admin (SyncOps).
 *  Not shown in UI — ask the agent / check this file when you need login.
 */
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
