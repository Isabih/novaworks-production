import { Users, Building2, Home, ShieldCheck, DollarSign, LayoutDashboard, Activity, Settings, FileCheck, BarChart3, UserPlus, Bell, Wrench, Mail, Film, Plus, Server, Image as ImageIcon, Star, Layers, CalendarCheck, Search, Heart, MessageSquare, AlertCircle, CreditCard, ScrollText, FileBarChart, BookOpenCheck, Boxes } from "lucide-react";
import type { NavItem } from "./DashboardShell";
import type { AppRole } from "@/lib/use-auth";

export const IT_NAV: NavItem[] = [
  { to: "/dashboard/it", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, group: "Overview" },
  { to: "/dashboard/messages", label: "Mail & Messages", icon: MessageSquare, group: "Overview" },
  { to: "/dashboard/properties", label: "Properties", icon: Building2, group: "Content", feature: "properties" },
  { to: "/dashboard/properties/new", label: "Add Property", icon: Plus, group: "Content", feature: "properties" },
  { to: "/dashboard/it/media-verify", label: "Media Verification", icon: ShieldCheck, group: "Content" },
  { to: "/dashboard/it/home-content", label: "Homepage Content", icon: ImageIcon, group: "Content" },
  { to: "/dashboard/admin/contact-edit", label: "Who We Are & Contact", icon: Mail, group: "Content" },
  { to: "/dashboard/admin/portfolio", label: "Portfolio Images", icon: ImageIcon, group: "Content", feature: "portfolio" },
  { to: "/dashboard/admin/portfolio-videos", label: "Portfolio Videos", icon: Film, group: "Content", feature: "portfolio" },
  { to: "/dashboard/it/property-of-the-day", label: "Property of the Day", icon: Star, group: "Content" },
  { to: "/dashboard/it/property-types", label: "Property Types", icon: Layers, group: "Content" },
  { to: "/dashboard/service-requests", label: "Service Requests", icon: Wrench, group: "Operations", feature: "service_requests" },
  { to: "/dashboard/admin/visit-tasks", label: "Visit Tasks", icon: CalendarCheck, group: "Operations", feature: "visit_requests" },
  { to: "/dashboard/receptionist", label: "Reception", icon: UserPlus, group: "Management" },
  { to: "/dashboard/bookings", label: "Bookings & Payments", icon: CalendarCheck, group: "Management", feature: "bookings" },
  { to: "/dashboard/it/users", label: "Users", icon: Users, group: "Management" },
  { to: "/dashboard/it/subscribers", label: "Users & Subscribers", icon: Mail, group: "Management" },
  { to: "/dashboard/it/staff/new", label: "Add Staff", icon: UserPlus, group: "Management" },
  { to: "/dashboard/it/luxury", label: "Luxury Access", icon: FileCheck, group: "Management" },
  { to: "/dashboard/it/password-resets", label: "Password Resets", icon: Server, group: "Management" },
  { to: "/dashboard/admin/reports", label: "Reports & Export", icon: FileBarChart, group: "Management" },
  { to: "/dashboard/service-catalog", label: "Service Catalog", icon: Boxes, group: "Management" },
  { to: "/dashboard/it/system-health", label: "System Health", icon: Activity, group: "System" },
  { to: "/dashboard/it/audit-logs", label: "Audit Logs", icon: ScrollText, group: "System" },
  { to: "/dashboard/it/settings", label: "Email Settings", icon: Settings, group: "System" },
];

/**
 * Pages only IT may open. Admin has every other IT privilege.
 * Enforced in three places: this nav, RoleGate (`exclusive`), and the
 * /_authenticated beforeLoad gate.
 */
export const IT_ONLY_PATHS = [
  "/dashboard/it/home-content",
  "/dashboard/it/password-resets",
  "/dashboard/it/settings",
  "/dashboard/it/system-health",
  "/dashboard/it/subscribers",
];

export const ADMIN_NAV: NavItem[] = [
  { to: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, group: "Overview" },
  { to: "/dashboard/messages", label: "Mail & Messages", icon: MessageSquare, group: "Overview" },
  { to: "/dashboard/properties", label: "Properties", icon: Building2, group: "Content", feature: "properties" },
  { to: "/dashboard/properties/new", label: "Add Property", icon: Plus, group: "Content", feature: "properties" },
  { to: "/dashboard/it/media-verify", label: "Media Verification", icon: ShieldCheck, group: "Content" },
  { to: "/dashboard/it/property-of-the-day", label: "Property of the Day", icon: Star, group: "Content" },
  { to: "/dashboard/it/property-types", label: "Property Types", icon: Layers, group: "Content" },
  { to: "/dashboard/admin/contact-edit", label: "Who We Are & Contact", icon: Mail, group: "Content" },
  { to: "/dashboard/admin/portfolio", label: "Portfolio Images", icon: ImageIcon, group: "Content", feature: "portfolio" },
  { to: "/dashboard/admin/portfolio-videos", label: "Portfolio Videos", icon: Film, group: "Content", feature: "portfolio" },
  { to: "/dashboard/service-requests", label: "Service Requests", icon: Wrench, group: "Content", feature: "service_requests" },
  { to: "/dashboard/admin/visit-tasks", label: "Visit Tasks", icon: CalendarCheck, group: "Management", feature: "visit_requests" },
  { to: "/dashboard/receptionist", label: "Reception", icon: UserPlus, group: "Management" },
  { to: "/dashboard/bookings", label: "Bookings & Payments", icon: CalendarCheck, group: "Management", feature: "bookings" },
  { to: "/dashboard/it/users", label: "Users", icon: Users, group: "Management" },
  { to: "/dashboard/it/staff/new", label: "Add Staff", icon: UserPlus, group: "Management" },
  { to: "/dashboard/it/luxury", label: "Luxury Access", icon: FileCheck, group: "Management" },
  { to: "/dashboard/inquiries", label: "Inquiries", icon: BarChart3, group: "Management" },
  { to: "/dashboard/admin/reports", label: "Reports & Export", icon: FileBarChart, group: "Management" },
  { to: "/dashboard/service-catalog", label: "Service Catalog", icon: Boxes, group: "Management" },
];

/** Pick the right NAV + shell role based on the user's roles. IT takes precedence. */
export function shellForStaff(roles: AppRole[]): { role: AppRole; nav: NavItem[] } {
  if (roles.includes("it")) return { role: "it", nav: IT_NAV };
  return { role: "admin", nav: ADMIN_NAV };
}

export const RECEPTIONIST_NAV: NavItem[] = [
  { to: "/dashboard/receptionist", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/receptionist/register", label: "Register Customer", icon: UserPlus, group: "Reception" },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell, group: "Overview" },
  { to: "/dashboard/messages", label: "Mail & Messages", icon: MessageSquare, group: "Overview" },
  { to: "/dashboard/bookings", label: "Bookings & Payments", icon: CalendarCheck, group: "Reception" },
  { to: "/dashboard/service-requests", label: "Service Requests", icon: Wrench, group: "Reception" },
];

export const BUYER_NAV: NavItem[] = [
  { to: "/dashboard/buyer", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/buyer/bookings", label: "Bookings & Extensions", icon: CreditCard, group: "Stay" },
  { to: "/dashboard/buyer/service-requests", label: "Service Requests", icon: AlertCircle, group: "Stay" },
  { to: "/properties", label: "Browse Properties", icon: Search, group: "Discover" },
];


export const AGENT_NAV: NavItem[] = [
  { to: "/dashboard/agent", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/messages", label: "Mail & Messages", icon: MessageSquare, group: "Overview" },
  { to: "/dashboard/inquiries", label: "Inquiries", icon: Users, group: "Management" },
];
export const OWNER_NAV: NavItem[] = [
  { to: "/dashboard/owner", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { to: "/dashboard/owner/bookings", label: "My Bookings", icon: BookOpenCheck, group: "Property Activity" },
  { to: "/dashboard/owner/service-requests", label: "Service Requests", icon: Wrench, group: "Property Activity" },
  { to: "/dashboard/owner/report", label: "Property Report", icon: FileBarChart, group: "Reports" },
];
/** Resolve the shell role + nav for any role set (staff, reception or customer). */
export function navForRoles(roles: AppRole[]): { role: AppRole; nav: NavItem[] } {
  if (roles.includes("it")) return { role: "it", nav: IT_NAV };
  if (roles.includes("admin")) return { role: "admin", nav: ADMIN_NAV };
  if (roles.includes("receptionist")) return { role: "receptionist", nav: RECEPTIONIST_NAV };
  if (roles.includes("agent")) return { role: "agent", nav: AGENT_NAV };
  if (roles.includes("owner")) return { role: "owner", nav: OWNER_NAV };
  return { role: "customer", nav: BUYER_NAV };
}