import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import AssetCard, { type Asset } from "@/components/AssetCard";
import PageHead from "@/components/PageHead";
import Link from "next/link";

const TYPES = [["", "הכל"], ["post", "פוסטים"], ["carousel", "קרוסלות"], ["banner", "באנרים"], ["video", "סרטונים"], ["landing_page", "דפי נחיתה"], ["campaign", "קמפיינים"], ["research", "מחקרים"], ["report", "דוחות"]];

export default async function Assets({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = (await currentUser())!;
  const { type } = await searchParams;
  const rows = type
    ? all<Asset>("SELECT * FROM assets WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 200", user.id, type)
    : all<Asset>("SELECT * FROM assets WHERE user_id = ? ORDER BY created_at DESC LIMIT 200", user.id);
  return (
    <div className="p-4 md:p-8">
      <PageHead title="ספריית נכסים" sub="כל מה שהצוות ייצר – במקום אחד." />
      <div className="mb-6 flex flex-wrap gap-2">
        {TYPES.map(([k, l]) => <Link key={k} href={k ? `?type=${k}` : "?"} className={`chip ${type === k || (!type && !k) ? "!bg-brand !text-forest-900" : ""}`}>{l}</Link>)}
      </div>
      {rows.length === 0 ? <p className="muted">עוד אין נכסים. בקשו משהו בשיחה.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map((a) => <AssetCard key={a.id} a={a} />)}</div>
      )}
    </div>
  );
}
