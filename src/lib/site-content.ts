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

export interface SiteContent {
  heroImageUrl: string;
  gallery: GalleryItem[];
  testimonials: Testimonial[];
  barberName: string;
  barberBio: string;
  barberPhotoUrl: string;
  specialties: string[];
  address: string;
  mapUrl: string;
  parkingNote: string;
  instagramUrl: string;
  tiktokUrl: string;
  loyaltyOffer: string;
  referralOffer: string;
  depositNote: string;
  cancellationPolicy: string;
  reminderPolicy: string;
  googleCalendarNote: string;
  scheduleBlocks: ScheduleBlock[];
  serviceConfigs: ServiceConfig[];
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  heroImageUrl: "/srt-logo.png",
  gallery: [
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
  ],
  testimonials: [
    { quote: "Clean cut, sharp fade, and easy booking.", name: "Customer" },
    { quote: "The details were on point from start to finish.", name: "Customer" },
    { quote: "Reliable, professional, and worth coming back for.", name: "Customer" },
  ],
  barberName: "SRT Cuts",
  barberBio:
    "Precision barbering in Herriman with a focus on clean blends, crisp lineups, and appointments that run smooth.",
  barberPhotoUrl: "/srt-logo.png",
  specialties: ["Fades", "Lineups", "Full service cuts"],
  address: "Herriman, Utah",
  mapUrl: "https://maps.google.com/?q=Herriman%2C%20Utah",
  parkingNote: "Exact location and parking details are sent after confirmation.",
  instagramUrl: "",
  tiktokUrl: "",
  loyaltyOffer: "Book 5 cuts and get a lineup credit.",
  referralOffer: "Send a friend and both of you get priority booking.",
  depositNote: "No deposits. Pay the full price online with Stripe or pay the full price in store.",
  serviceConfigs: getServiceConfigs(null),
  cancellationPolicy: "Please text ahead if you need to cancel or reschedule.",
  reminderPolicy: "SMS confirmations are active. Reminder texts are planned next.",
  googleCalendarNote: "Calendar sync is planned; confirmed bookings are managed in admin for now.",
  scheduleBlocks: [],
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
  };
}
import { getServiceConfigs, type ServiceConfig } from "./services";
