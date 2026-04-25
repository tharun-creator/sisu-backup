import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteMemberSession } from "@/lib/member-auth";
import { MEMBER_SESSION_COOKIE } from "@/lib/security";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;

  if (token) {
    await deleteMemberSession(token);
  }

  cookieStore.set(MEMBER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ success: true });
}
