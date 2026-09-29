import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Evolink — evolução conectada", description: "Treino, nutrição e evolução conectados.", manifest: "/manifest.webmanifest", appleWebApp: { capable:true, title:"Evolink", statusBarStyle:"default" }, icons:{ icon:[{ url:"/brand/evolink-mark-192.png", type:"image/png" }], apple:[{ url:"/brand/evolink-mark-180.png", type:"image/png" }] } };
export const viewport = { themeColor:"#087a50", width:"device-width", initialScale:1, viewportFit:"cover" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body>{children}</body></html>; }
