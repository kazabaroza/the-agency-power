import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { isConnected } from "@/lib/connections";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const demo = !isConnected("anthropic", user.id);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-e" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between p-4">
          <Link href="/app" className="flex items-center gap-2 font-extrabold"><span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">⚡</span> The Agency Power</Link>
        </div>
        <Nav />
        <div className="hidden p-4 text-xs md:block">
          <p className="muted truncate" dir="ltr">{user.email || user.phone}</p>
          <form action="/api/auth/logout" method="post"><button className="muted mt-1 underline">יציאה</button></form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {demo && (
          <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
            מצב הדגמה: הסוכן עובד בלי Claude. <Link href="/app/connections" className="font-bold underline">לחברו מפתח</Link> כדי להפעיל את הצוות המלא.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
