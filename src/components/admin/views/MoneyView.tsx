"use client";

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { calculateTaxSummary, TAX_YEAR, SAFE_TAX_BUFFER } from "@/lib/tax";
import { formatPrice, parseDollarAmount } from "@/lib/services";
import { shortDate } from "../format";
import { money } from "../format";
import { useAdmin } from "../data";
import { Card, SectionHeading, DataPoint, EmptyState } from "../primitives";
import { Field, Repeater, SaveBar, EditorPanel, Hint } from "../forms";

export function MoneyView() {
  const { bookings, content, setContent, saveContent, saving, saveMessage } = useAdmin();
  const tax = useMemo(() => calculateTaxSummary(bookings, content.taxExpenses), [bookings, content.taxExpenses]);

  const paidVenmo = bookings.filter((b) => b.payment_method === "online" && b.payment_status === "paid");

  return (
    <div className="space-y-8">
      {/* Set-aside hero */}
      <div style={{ display: "grid", gap: "var(--a-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <Card>
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <ShieldCheck size={16} style={{ color: "var(--a-accent-quiet)" }} />
            <span className="ax-eyebrow">Set aside for taxes</span>
          </div>
          <div className="ax-num" style={{ fontSize: "clamp(34px, 5vw, 48px)", fontWeight: 660, lineHeight: 1 }}>
            {money(tax.guardianSetAside)}
          </div>
          <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 10 }}>
            {Math.round(tax.effectiveRate * 100)}% effective rate · includes a {Math.round(SAFE_TAX_BUFFER * 100)}% safety buffer
          </p>
        </Card>
        <Card>
          <span className="ax-eyebrow">Paid Venmo sales</span>
          <div className="ax-num" style={{ fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 640, marginTop: 12 }}>
            {money(tax.venmoGross)}
          </div>
          <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 10 }}>
            Only Venmo bookings you mark paid count. In-store payments are ignored.
          </p>
        </Card>
        <Card>
          <span className="ax-eyebrow">Estimated profit</span>
          <div className="ax-num" style={{ fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 640, marginTop: 12 }}>
            {money(tax.profit)}
          </div>
          <p style={{ fontSize: 13, color: "var(--a-text-3)", marginTop: 10 }}>
            Paid sales minus {money(tax.expenses)} in deductions.
          </p>
        </Card>
      </div>

      {/* Breakdown */}
      <Card>
        <SectionHeading eyebrow={`${TAX_YEAR} single filer`} title="Tax breakdown" />
        <div style={{ display: "grid", gap: 22, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <DataPoint label="Self-employment tax" value={money(tax.selfEmploymentTax)} />
          <DataPoint label="Federal income tax" value={money(tax.federalIncomeTax)} />
          <DataPoint label="Utah income tax" value={money(tax.utahIncomeTax)} />
          <DataPoint label="Effective set-aside" value={`${Math.round(tax.effectiveRate * 100)}%`} />
        </div>
        <Hint>
          Expenses lower the profit estimate because business income is taxed on profit, not gross sales. Keep receipts
          for chairs, lights, capes, clippers, supplies, booking software, and payment fees. This is a planning estimate,
          not tax advice.
        </Hint>
      </Card>

      {/* Expense editor */}
      <EditorPanel title="Expense deductions" hint="Anything you can write off against business profit.">
        <Repeater
          items={content.taxExpenses}
          empty={{ name: "", amount: 0 }}
          addLabel="Add expense"
          onChange={(taxExpenses) => setContent({ ...content, taxExpenses })}
          render={(item, update) => (
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "1fr 160px" }}>
              <Field label="Item" value={item.name} onChange={(name) => update({ ...item, name })} />
              <Field
                label="Cost"
                value={formatPrice(item.amount)}
                onChange={(value) => update({ ...item, amount: parseDollarAmount(value) })}
              />
            </div>
          )}
        />
      </EditorPanel>

      {/* Paid Venmo list */}
      <Card>
        <SectionHeading eyebrow="Ledger" title="Paid Venmo bookings" />
        {paidVenmo.length === 0 ? (
          <EmptyState title="No paid Venmo bookings yet" body="Mark an online booking as paid in the Bookings queue and it will appear here." />
        ) : (
          <div className="space-y-2">
            {paidVenmo.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-4"
                style={{ padding: "12px 14px", borderRadius: "var(--a-r-sm)", background: "var(--a-surface-2)" }}
              >
                <div className="min-w-0">
                  <div style={{ fontSize: 14.5, fontWeight: 550 }}>{b.user_name}</div>
                  <div className="ax-num" style={{ fontSize: 12.5, color: "var(--a-text-3)" }}>
                    {b.service} · {shortDate(b.booking_date)}
                  </div>
                </div>
                <span className="ax-num" style={{ fontSize: 14, color: "var(--a-accent-quiet)", fontWeight: 600 }}>
                  {money(b.service_price_cents ?? 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <SaveBar saving={saving} saveMessage={saveMessage} onSave={() => saveContent()} />
    </div>
  );
}
