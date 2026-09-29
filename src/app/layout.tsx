import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { themeBootScript } from "@/lib/theme";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = { title: "Evolink — evolução conectada", description: "Treino, nutrição e evolução conectados.", manifest: "/manifest.webmanifest", appleWebApp: { capable:true, title:"Evolink", statusBarStyle:"default" }, icons:{ icon:[{ url:"/brand/evolink-mark-192.png", type:"image/png" }], apple:[{ url:"/brand/evolink-mark-180.png", type:"image/png" }] } };
export const viewport = { themeColor:"#087a50", width:"device-width", initialScale:1, viewportFit:"cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The boot script sets the theme class before paint, so <html> differs from the server markup.
  return (
    <html lang="pt-BR" className={geist.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
