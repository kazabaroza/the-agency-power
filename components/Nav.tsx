"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  ["/app", "💬", "שיחה עם הסוכנות"],
  ["/app/assets", "🗂️", "ספריית נכסים"],
  ["/app/pages", "🧭", "דפי נחיתה"],
  ["/app/schedule", "📅", "תזמון פרסומים"],
  ["/app/campaigns", "📈", "קמפיינים"],
  ["/app/leads", "🎯", "לידים"],
  ["/app/brand", "🎨", "פרופיל מותג"],
  ["/app/agents", "🧑‍🚀", "הצוות (The Agency)"],
  ["/app/connections", "🔌", "חיבורים"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
      {ITEMS.map(([href, icon, label]) => {
        const active = path === href;
        return (
          <Link key={href} href={href} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${active ? "bg-brand text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`}>
            <span>{icon}</span>{label}
          </Link>
        );
      })}
    </nav>
  );
}
