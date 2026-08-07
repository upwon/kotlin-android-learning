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
  const saved = window.localStorage.getItem(THEME_KEY);
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
  }, [theme]);

  function toggleTheme() {
    const next = !dark;
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
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
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={dark ? "切换浅色模式" : "切换深色模式"}>
            <span aria-hidden="true">{dark ? "☀" : "◐"}</span>
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
