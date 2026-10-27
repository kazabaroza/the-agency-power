import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Agency Power – סוכנות שיווק של סוכני AI",
  description: "צוות שלם של סוכני AI שמייצר פוסטים, דפי נחיתה, סרטונים וקמפיינים ממומנים לעסק שלך – מתוך שיחה אחת.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5b3df5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
