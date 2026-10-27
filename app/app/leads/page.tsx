import { currentUser } from "@/lib/auth";
import { all } from "@/lib/db";
import PageHead from "@/components/PageHead";

export default async function Leads() {
  const user = (await currentUser())!;
  const rows = all<{ id: string; name: string; phone: string; email: string; message: string; page_title: string; created_at: string }>(
    "SELECT l.*, lp.title page_title FROM leads l LEFT JOIN landing_pages lp ON lp.id = l.landing_page_id WHERE l.user_id = ? ORDER BY l.created_at DESC LIMIT 500", user.id,
  );
  return (
    <div className="p-4 md:p-8">
      <PageHead title="לידים" sub="כל מי שהשאיר פרטים בדפי הנחיתה. ליד חדש מגיע גם כהודעה בשיחה ובוואטסאפ." />
      {rows.length === 0 ? <p className="muted">עוד אין לידים.</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-start">{["שם", "טלפון", "אימייל", "הודעה", "דף", "מתי"].map((h) => <th key={h} className="p-3 text-start">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="p-3 font-semibold">{l.name}</td>
                  <td className="p-3" dir="ltr">{l.phone && <a href={`https://wa.me/${l.phone.replace(/\D/g, "").replace(/^0/, "972")}`} target="_blank" className="text-brand">{l.phone}</a>}</td>
                  <td className="p-3" dir="ltr">{l.email}</td>
                  <td className="muted p-3">{l.message}</td>
                  <td className="p-3">{l.page_title}</td>
                  <td className="muted p-3">{new Date(l.created_at + "Z").toLocaleString("he-IL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
