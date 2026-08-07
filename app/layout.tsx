import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { ProgressProvider } from "./_components/progress-provider";
import { SiteHeader } from "./_components/site-header";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Kotlin Android 学习站",
    template: "%s · Kotlin Android 学习站",
  },
  description: "为 Java Android 开发者设计的完整 Kotlin、协程与 Flow 学习路径。",
  keywords: ["Kotlin", "Android", "Java", "协程", "Flow", "学习教程"],
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ProgressProvider>
          <SiteHeader />
          <div className="site-content">{children}</div>
          <footer className="site-footer">
            <div className="footer-inner">
              <div>
                <span className="brand-mark small" aria-hidden="true">K</span>
                <p>从 Java Android 出发，系统掌握 Kotlin、协程与 Flow。</p>
              </div>
              <nav aria-label="页脚导航">
                <Link href="/course">课程地图</Link>
                <Link href="/practice">随堂练习</Link>
                <Link href="/reference">语法速查</Link>
                <a href="https://github.com/upwon/kotlin-android-learning" target="_blank" rel="noreferrer">GitHub</a>
              </nav>
            </div>
          </footer>
        </ProgressProvider>
      </body>
    </html>
  );
}

