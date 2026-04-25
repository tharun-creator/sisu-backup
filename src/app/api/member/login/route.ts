import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateMember, createMemberSession } from "@/lib/member-auth";
import { MEMBER_SESSION_COOKIE } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const member = await authenticateMember({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });

    if (!member.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before signing in." },
        { status: 403 },
      );
    }

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
        error: error instanceof Error ? error.message : "Login failed.",
      },
      { status: 400 },
    );
  }
}
