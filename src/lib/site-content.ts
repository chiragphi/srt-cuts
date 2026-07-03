import { getServiceConfigs, type ServiceConfig } from "./services";

export interface GalleryItem {
  title: string;
  imageUrl: string;
  caption: string;
}

export interface Testimonial {
  quote: string;
  name: string;
}

export interface ScheduleBlock {
  date: string;
  reason: string;
}

export interface TaxExpense {
  name: string;
  amount: number;
}

export interface SiteContent {
  heroImageUrl: string;
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  barberName: string;
  barberBio: string;
  barberPhotoUrl: string;
  aboutImageUrl: string;
  specialties: string[];
  address: string;
  mapUrl: string;
  parkingNote: string;
  instagramUrl: string;
  tiktokUrl: string;
  venmoUrl: string;
  loyaltyOffer: string;
  referralOffer: string;
  depositNote: string;
  cancellationPolicy: string;
  reminderPolicy: string;
  googleCalendarNote: string;
  scheduleBlocks: ScheduleBlock[];
  serviceConfigs: ServiceConfig[];
  taxExpenses: TaxExpense[];
  weeklyAvailability: Record<string, string[]>; // key "0"–"6" = Sun–Sat, value = available time strings
  dateAvailability: Record<string, string[]>; // key "YYYY-MM-DD", overrides weekly for that specific date
}

const DEFAULT_GALLERY: GalleryItem[] = [
  {
    title: "Fresh fade",
    imageUrl: "/srt-logo.png",
    caption: "Add real before and after photos from the admin panel.",
  },
  {
    title: "Clean lineup",
    imageUrl: "/srt-logo.png",
    caption: "Show close-up detail shots that sell the edge work.",
  },
  {
    title: "Full service",
    imageUrl: "/srt-logo.png",
    caption: "Use this spot for your strongest transformation.",
  },
];

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { quote: "Clean cut, sharp fade, and easy booking.", name: "Customer" },
  { quote: "The details were on point from start to finish.", name: "Customer" },
  { quote: "Reliable, professional, and worth coming back for.", name: "Customer" },
];

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroImageUrl: "/barber.jpg",
  gallery: DEFAULT_GALLERY,
  testimonials: DEFAULT_TESTIMONIALS,
  barberName: "SRT Cuts",
  barberBio:
    "Precision barbering in Herriman with a focus on clean blends, crisp lineups, and appointments that run smooth.",
  barberPhotoUrl: "/srt-logo.png",
  aboutImageUrl: "/barber.jpg",
  specialties: ["Fades", "Lineups", "Full service cuts"],
  address: "Herriman, Utah",
  mapUrl: "https://maps.google.com/?q=Herriman%2C%20Utah",
  parkingNote: "Exact location and parking details are sent after confirmation.",
  instagramUrl: "",
  tiktokUrl: "",
  venmoUrl: "",
  loyaltyOffer: "Book 5 cuts and get a free lineup.",
  referralOffer: "Refer a friend and get $5 off your next cut.",
  depositNote: "No deposits. Pay the full price with Venmo or pay the full price in store.",
  serviceConfigs: getServiceConfigs(null),
  cancellationPolicy: "Please text ahead if you need to cancel or reschedule.",
  reminderPolicy: "SMS confirmations are active. Reminder texts are planned next.",
  googleCalendarNote: "Calendar sync is planned; confirmed bookings are managed in admin for now.",
  scheduleBlocks: [],
  taxExpenses: [],
  weeklyAvailability: { "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] },
  dateAvailability: {},
};

export function mergeSiteContent(value: Partial<SiteContent> | null | undefined): SiteContent {
  return {
    ...DEFAULT_SITE_CONTENT,
    ...(value ?? {}),
    gallery: value?.gallery?.length ? value.gallery : DEFAULT_SITE_CONTENT.gallery,
    testimonials: value?.testimonials?.length ? value.testimonials : DEFAULT_SITE_CONTENT.testimonials,
    specialties: value?.specialties?.length ? value.specialties : DEFAULT_SITE_CONTENT.specialties,
    scheduleBlocks: value?.scheduleBlocks ?? DEFAULT_SITE_CONTENT.scheduleBlocks,
    serviceConfigs: getServiceConfigs(value?.serviceConfigs),
    taxExpenses: value?.taxExpenses ?? DEFAULT_SITE_CONTENT.taxExpenses,
    weeklyAvailability: value?.weeklyAvailability ?? DEFAULT_SITE_CONTENT.weeklyAvailability,
    dateAvailability: value?.dateAvailability ?? DEFAULT_SITE_CONTENT.dateAvailability,
  };
}

export function isPlaceholderGalleryItem(item: GalleryItem) {
  return !item.imageUrl || item.imageUrl === "/srt-logo.png";
}

export function isPlaceholderTestimonial(item: Testimonial) {
  return (
    item.name.toLowerCase() === "customer" ||
    DEFAULT_TESTIMONIALS.some((defaultItem) => defaultItem.name === item.name && defaultItem.quote === item.quote)
  );
}
