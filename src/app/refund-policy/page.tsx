export const metadata = { title: "Refund Policy - VocalisAi" };

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-950">Refund Policy</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated: September 15, 2026</p>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-700">
        <p>
          VocalisAi's paid plans (Starter, Professional, Premium) are billed monthly in advance
          through our payment processor, Paddle.com.
        </p>
        <p>
          <strong>You can cancel anytime.</strong> Cancelling stops future renewals immediately -
          you won't be charged again. Cancelling does not refund the current billing period: you
          keep access to your plan's features for the rest of the period you've already paid for,
          and your account then moves to the FREE plan.
        </p>
        <p>
          <strong>We do not offer refunds for partial months or unused portions of a billing
          period.</strong> Because our plans have monthly usage limits rather than a fixed
          number of credits, a period is considered used once it has started, regardless of how
          much of your plan's limits you actually used.
        </p>
        <p>
          <strong>Billing errors are the exception.</strong> If you were charged in error - for
          example, charged twice for the same period, or charged after you had already cancelled
          - contact us at{" "}
          <a href="mailto:pcircuit@yahoo.com" className="text-brand-600 hover:underline">
            pcircuit@yahoo.com
          </a>{" "}
          and we'll investigate and correct it, including a refund where a genuine error is
          confirmed.
        </p>
        <p>
          Because Paddle is the merchant of record for your purchase, any refund we approve is
          issued back through Paddle to your original payment method.
        </p>
      </div>
    </div>
  );
}
