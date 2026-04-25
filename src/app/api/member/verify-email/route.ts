import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createMemberSession, verifyMemberEmail } from "@/lib/member-auth";
import { MEMBER_SESSION_COOKIE } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const member = await verifyMemberEmail({
      email: String(body.email ?? ""),
      code: String(body.code ?? ""),
    });
    const sessionToken = await createMemberSession(member.id);
    const cookieStore = await cookies();

    cookieStore.set(MEMBER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true, member });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Email verification failed.",
      },
      { status: 400 },
    );
  }
}
