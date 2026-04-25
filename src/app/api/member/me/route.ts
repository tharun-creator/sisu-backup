import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth-helpers";
import { getMemberDashboard } from "@/lib/member-auth";

export async function GET() {
  const member = await getCurrentMember();

  if (!member) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const dashboard = await getMemberDashboard(member.id);
  return NextResponse.json({
    authenticated: true,
    member: dashboard.member,
    appointments: dashboard.appointments,
  });
}
