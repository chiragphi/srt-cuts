export const SERVICES = [
  {
    name: "Fade",
    amount: 3000,
    duration: "45 min",
    desc: "Skin or taper fade tailored to your head shape.",
    detail: "Best for clean blends, tight sides, and a fresh reset.",
  },
  {
    name: "Haircut",
    amount: 2500,
    duration: "35 min",
    desc: "Classic precision cut, shaped to your style.",
    detail: "A focused cut for regular maintenance and sharp shape.",
  },
  {
    name: "Lineup",
    amount: 1500,
    duration: "20 min",
    desc: "Clean edges, neckline, and face-framing detail.",
    detail: "Quick polish between full cuts.",
  },
  {
    name: "Full Service",
    amount: 4000,
    duration: "60 min",
    desc: "Cut plus lineup for the complete finish.",
    detail: "The full appointment when you want everything cleaned up.",
  },
  {
    name: "Kids Cut",
    amount: 2000,
    duration: "30 min",
    desc: "A clean cut for kids 12 and under.",
    detail: "Simple, patient, and parent-approved.",
  },
];

export type ServiceName = (typeof SERVICES)[number]["name"];

export interface ServiceConfig {
  name: ServiceName;
  amount: number;
  duration: string;
  desc: string;
  detail: string;
  /** Site-wide discount on this service, 0–90 (%). 0 / undefined = no sale. */
  discountPercent?: number;
}

export function clampDiscount(value: number | undefined | null): number {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.min(90, Math.max(0, Math.round(value)));
}

/** The price a customer actually pays after any site-wide discount. */
export function effectivePrice(service: { amount: number; discountPercent?: number }): number {
  const pct = clampDiscount(service.discountPercent);
  if (!pct) return service.amount;
  return Math.max(0, Math.round((service.amount * (100 - pct)) / 100));
}

export function hasDiscount(service: { discountPercent?: number }): boolean {
  return clampDiscount(service.discountPercent) > 0;
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100);
}

export function parseDollarAmount(value: string) {
  const amount = Math.round(Number(value.replace(/[^0-9.]/g, "")) * 100);
  return Number.isFinite(amount) ? amount : 0;
}

export function getServiceConfigs(overrides: Partial<ServiceConfig>[] | null | undefined): ServiceConfig[] {
  return SERVICES.map((service) => {
    const override = overrides?.find((item) => item.name === service.name);
    return {
      ...service,
      ...(override ?? {}),
      name: service.name,
      amount: Math.max(0, Math.round(override?.amount ?? service.amount)),
      discountPercent: clampDiscount(override?.discountPercent),
    };
  });
}
