import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth-helpers";
import { markMemberPaid } from "@/lib/member-auth";
import { getStripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const member = await getCurrentMember();

  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const sessionId = String(body.sessionId ?? "");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Stripe session ID is required." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.memberId !== member.id) {
      return NextResponse.json({ error: "Invalid checkout session." }, { status: 403 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not completed yet." },
        { status: 409 },
      );
    }

    await markMemberPaid({
      memberId: member.id,
      checkoutSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      amount: session.amount_total ?? 0,
      currency: session.currency ?? "inr",
      status: session.payment_status,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Payment verification failed.",
      },
      { status: 500 },
    );
  }
}
