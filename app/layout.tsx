import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "WORLDVIEW — OSINT Platform",
    description: "Tactical OSINT Dashboard — TS//SCI",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap"
                    rel="stylesheet"
                />
                <link rel="stylesheet" href="/tailwind.css" />
                {}
                <script dangerouslySetInnerHTML={{ __html: 'window.CESIUM_BASE_URL = "https://cdn.jsdelivr.net/npm/cesium@1.140.0/Build/Cesium/";' }} />
                <link href="https://cdn.jsdelivr.net/npm/cesium@1.140.0/Build/Cesium/Widgets/widgets.css" rel="stylesheet" />
                <script src="https://cdn.jsdelivr.net/npm/cesium@1.140.0/Build/Cesium/Cesium.js" async={false}></script>
            </head>
            <body className="bg-black text-text-1 overflow-x-hidden w-full">
                {children}
            </body>
        </html>
    );
}
