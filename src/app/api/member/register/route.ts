import { NextResponse } from "next/server";
import { registerMember } from "@/lib/member-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await registerMember({
      name: String(body.name ?? ""),
      company: String(body.company ?? ""),
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });

    return NextResponse.json({
      success: true,
      email: result.email,
      message: "Verification code sent to your email.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Registration failed.",
      },
      { status: 400 },
    );
  }
}
