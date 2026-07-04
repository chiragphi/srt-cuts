import {
  LayoutDashboard,
  CalendarDays,
  Inbox,
  Users,
  ChartColumnIncreasing,
  Wallet,
  Images,
  Clock,
  Sparkles,
  Server,
  type LucideIcon,
} from "lucide-react";

export type ViewId =
  | "overview"
  | "calendar"
  | "bookings"
  | "clients"
  | "insights"
  | "money"
  | "content"
  | "schedule"
  | "assistant"
  | "system";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  group: "cockpit" | "manage" | "ops";
}

export const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "cockpit" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, group: "cockpit" },
  { id: "bookings", label: "Bookings", icon: Inbox, group: "cockpit" },
  { id: "clients", label: "Clients", icon: Users, group: "cockpit" },
  { id: "insights", label: "Insights", icon: ChartColumnIncreasing, group: "cockpit" },
  { id: "money", label: "Money", icon: Wallet, group: "manage" },
  { id: "content", label: "Content", icon: Images, group: "manage" },
  { id: "schedule", label: "Schedule", icon: Clock, group: "manage" },
  { id: "assistant", label: "Assistant", icon: Sparkles, group: "ops" },
  { id: "system", label: "System", icon: Server, group: "ops" },
];

export const GROUP_LABELS: Record<NavItem["group"], string> = {
  cockpit: "Cockpit",
  manage: "Manage",
  ops: "Ops",
};
