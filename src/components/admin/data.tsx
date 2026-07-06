"use client";

import { createContext, useContext } from "react";
import type { SiteContent } from "@/lib/site-content";
import type { Booking, ClientSummary } from "@/lib/analytics";
import type { ViewId } from "./nav";

export interface AdminData {
  bookings: Booking[];
  content: SiteContent;
  clients: ClientSummary[];
  setContent: (c: SiteContent) => void;
  saveContent: (next?: SiteContent) => Promise<void>;
  saving: boolean;
  saveMessage: string;
  reload: () => Promise<void>;
  acting: string | null;
  act: (id: string, status: "accepted" | "denied") => Promise<void>;
  del: (id: string) => Promise<void>;
  setPaymentStatus: (id: string, paymentStatus: "unpaid" | "paid" | "refunded") => Promise<void>;
  reschedule: (id: string, bookingDate: string, bookingTime: string, notify: boolean) => Promise<void>;
  goTo: (view: ViewId) => void;
  openViewAs: () => void;
  impersonate: (phone: string) => Promise<void>;
  impersonatingPhone: string | null;
}

export const AdminDataContext = createContext<AdminData | null>(null);

export function useAdmin(): AdminData {
  const ctx = useContext(AdminDataContext);
  if (!ctx) throw new Error("useAdmin must be used inside the admin shell");
  return ctx;
}

export type { Booking, ClientSummary, SiteContent };
