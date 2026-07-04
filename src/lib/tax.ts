// Tax set-aside math — extracted verbatim (behavior-preserving) from the old
// admin panel so the numbers never change. Uses 2026 single-filer federal
// brackets, the standard deduction, Utah's flat income tax, self-employment
// tax, and a safety buffer. Only Venmo bookings marked "paid" are counted;
// in-store payments are ignored. This is a planning estimate, not tax advice.

export interface TaxBooking {
  payment_method: "in_store" | "online";
  payment_status: "pay_in_store" | "unpaid" | "paid" | "refunded";
  service_price_cents: number;
}

export interface TaxExpense {
  name: string;
  amount: number;
}

export interface TaxSummary {
  venmoGross: number;
  expenses: number;
  profit: number;
  selfEmploymentTax: number;
  federalIncomeTax: number;
  utahIncomeTax: number;
  guardianSetAside: number;
  effectiveRate: number;
}

export const TAX_YEAR = 2026;
export const STANDARD_DEDUCTION_SINGLE = 16100;
export const UTAH_INCOME_TAX_RATE = 0.045;
export const SE_TAXABLE_MULTIPLIER = 0.9235;
export const SOCIAL_SECURITY_WAGE_BASE = 184500;
export const SAFE_TAX_BUFFER = 0.15;
export const FEDERAL_SINGLE_BRACKETS = [
  { over: 0, base: 0, rate: 0.1 },
  { over: 12400, base: 1240, rate: 0.12 },
  { over: 50400, base: 5800, rate: 0.22 },
  { over: 105700, base: 17966, rate: 0.24 },
  { over: 201775, base: 41024, rate: 0.32 },
  { over: 256225, base: 58448, rate: 0.35 },
  { over: 640600, base: 192979.25, rate: 0.37 },
];

export function calculateTaxSummary(
  bookings: TaxBooking[],
  taxExpenses: TaxExpense[]
): TaxSummary {
  const venmoGross = bookings
    .filter((b) => b.payment_method === "online" && b.payment_status === "paid")
    .reduce((sum, b) => sum + (b.service_price_cents ?? 0), 0);
  const expenses = taxExpenses.reduce((sum, item) => sum + Math.max(0, item.amount || 0), 0);
  const profit = Math.max(0, venmoGross - expenses);
  const profitDollars = profit / 100;
  const selfEmploymentTaxDollars = calculateSelfEmploymentTax(profitDollars);
  const federalIncomeTaxDollars = calculateFederalIncomeTax(profitDollars, selfEmploymentTaxDollars);
  const utahIncomeTaxDollars = profitDollars * UTAH_INCOME_TAX_RATE;
  const estimatedTax = selfEmploymentTaxDollars + federalIncomeTaxDollars + utahIncomeTaxDollars;
  const guardianSetAside = Math.ceil((estimatedTax * (1 + SAFE_TAX_BUFFER)) * 100);

  return {
    venmoGross,
    expenses,
    profit,
    selfEmploymentTax: Math.round(selfEmploymentTaxDollars * 100),
    federalIncomeTax: Math.round(federalIncomeTaxDollars * 100),
    utahIncomeTax: Math.round(utahIncomeTaxDollars * 100),
    guardianSetAside,
    effectiveRate: profit > 0 ? guardianSetAside / profit : 0,
  };
}

function calculateSelfEmploymentTax(profitDollars: number) {
  if (profitDollars < 400) return 0;

  const netEarnings = profitDollars * SE_TAXABLE_MULTIPLIER;
  const socialSecurityTax = Math.min(netEarnings, SOCIAL_SECURITY_WAGE_BASE) * 0.124;
  const medicareTax = netEarnings * 0.029;
  return socialSecurityTax + medicareTax;
}

function calculateFederalIncomeTax(profitDollars: number, selfEmploymentTaxDollars: number) {
  const taxableIncome = Math.max(0, profitDollars - (selfEmploymentTaxDollars / 2) - STANDARD_DEDUCTION_SINGLE);
  const bracket = FEDERAL_SINGLE_BRACKETS.reduce(
    (current, next) => (taxableIncome >= next.over ? next : current),
    FEDERAL_SINGLE_BRACKETS[0]
  );
  return bracket.base + (taxableIncome - bracket.over) * bracket.rate;
}
