"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCalendar, IconChart, IconChat, IconFolder, IconLayout, IconPalette, IconPlug, IconTarget, IconUsers } from "./Icons";

const ITEMS = [
  ["/app", IconChat, "שיחה עם הסוכנות"],
  ["/app/assets", IconFolder, "ספריית נכסים"],
  ["/app/pages", IconLayout, "דפי נחיתה"],
  ["/app/schedule", IconCalendar, "תזמון פרסומים"],
  ["/app/campaigns", IconChart, "קמפיינים"],
  ["/app/leads", IconTarget, "לידים"],
  ["/app/brand", IconPalette, "פרופיל מותג"],
  ["/app/agents", IconUsers, "הצוות (The Agency)"],
  ["/app/connections", IconPlug, "חיבורים"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
      {ITEMS.map(([href, Icon, label]) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-brand text-forest-900" : "text-cream/75 hover:bg-white/[0.06] hover:text-cream"}`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
