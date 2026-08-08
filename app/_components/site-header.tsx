"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { allChapters } from "@/lib/course-data";
import { useProgress } from "./progress-provider";

const links = [
  { href: "/course", label: "课程" },
  { href: "/practice", label: "练习" },
  { href: "/reference", label: "速查" },
  { href: "/review", label: "复习" },
];

const THEME_KEY = "kotlin-learning-theme";
const THEME_EVENT = "kotlin-learning-theme-change";

function subscribeTheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
    media.removeEventListener("change", callback);
  };
}

function getThemeSnapshot() {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(THEME_KEY);
  } catch {
    // 隐私模式禁用本地存储时，仍然跟随系统主题。
  }
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function SiteHeader() {
  const pathname = usePathname();
  const { completed } = useProgress();
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light");
  const dark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
      meta.content = dark ? "#111113" : "#f7f7f3";
    });
  }, [dark, theme]);

  function toggleTheme() {
    const nextTheme = dark ? "light" : "dark";
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme);
    } catch {
      // 无法持久化时，本次页面仍可正常切换。
    }
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" href="/" aria-label="Kotlin Android 学习站首页">
          <span className="brand-mark" aria-hidden="true">K</span>
          <span className="brand-copy">
            <strong>Kotlin Path</strong>
            <small>Android 学习站</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="主导航">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link className={active ? "nav-link active" : "nav-link"} href={link.href} key={link.href}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <Link className="header-progress" href="/review" aria-label="查看学习进度">
            <span>{completed.length}</span> / {allChapters.length}
          </Link>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? "当前为深色模式，点击切换为浅色模式" : "当前为浅色模式，点击切换为深色模式"}
            aria-pressed={dark}
            title={dark ? "切换为浅色模式" : "切换为深色模式"}
          >
            <span className="theme-toggle-icon" aria-hidden="true">{dark ? "☾" : "☀"}</span>
            <span className="theme-toggle-label">{dark ? "深色" : "浅色"}</span>
            <span className="theme-toggle-track" aria-hidden="true">
              <span className="theme-toggle-thumb" />
            </span>
          </button>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="移动端导航">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link className={active ? "mobile-nav-link active" : "mobile-nav-link"} href={link.href} key={link.href}>
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
