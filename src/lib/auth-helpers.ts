import { cookies } from "next/headers";
import { getMemberFromSessionToken } from "@/lib/member-auth";
import {
  ADMIN_SESSION_COOKIE,
  MEMBER_SESSION_COOKIE,
  verifyAdminSessionValue,
} from "@/lib/security";

export async function getCurrentMember() {
  const cookieStore = await cookies();
  return getMemberFromSessionToken(
    cookieStore.get(MEMBER_SESSION_COOKIE)?.value ?? null,
  );
}

export async function requireCurrentMember() {
  const member = await getCurrentMember();
  if (!member) {
    throw new Error("Unauthorized");
  }
  return member;
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionValue(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
}

export async function requireAdmin() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    throw new Error("Unauthorized");
  }
}
