import { headers } from "next/headers";
import { markMemberPaid } from "@/lib/member-auth";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 400 });
  }

  const stripe = getStripe();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  try {
    const payload = await req.text();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const memberId = session.metadata?.memberId;

      if (memberId && session.payment_status === "paid") {
        await markMemberPaid({
          memberId,
          checkoutSessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          amount: session.amount_total ?? 0,
          currency: session.currency ?? "inr",
          status: session.payment_status,
        });
      }
    }

    return new Response("ok");
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response("Webhook error", { status: 400 });
  }
}
