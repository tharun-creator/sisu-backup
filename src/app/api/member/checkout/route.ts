import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth-helpers";
import { getStripe, getSiteUrl } from "@/lib/stripe";
import { updateMemberStripeCustomerId } from "@/lib/member-auth";

export async function POST(req: Request) {
  const member = await getCurrentMember();

  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!member.emailVerified) {
    return NextResponse.json(
      { error: "Verify your email before starting payment." },
      { status: 403 },
    );
  }

  if (member.paymentStatus === "paid") {
    return NextResponse.json(
      { error: "Membership payment has already been completed." },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    let customerId = member.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: member.name,
        metadata: {
          memberId: member.id,
          company: member.company,
        },
      });
      customerId = customer.id;
      await updateMemberStripeCustomerId(member.id, customer.id);
    }

    const siteUrl = getSiteUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      success_url: `${siteUrl}/members?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/members?payment=cancelled`,
      line_items: [
        {
          price_data: {
            currency: "inr",
            unit_amount: 1500000,
            product_data: {
              name: "SISU Membership Payment",
              description:
                "One-time Rs.15,000 payment to unlock direct session booking with RATS.",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        memberId: member.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create checkout session.",
      },
      { status: 500 },
    );
  }
}
