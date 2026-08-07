"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { courseUnits } from "@/lib/course-data";
import { useProgress } from "./progress-provider";

export function CourseCatalog() {
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("all");
  const { isCompleted } = useProgress();

  const visibleUnits = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return courseUnits
      .filter((item) => unit === "all" || item.id === unit)
      .map((item) => ({
        ...item,
        chapters: item.chapters.filter((chapter) =>
          !normalized || `${chapter.title} ${chapter.summary} ${chapter.lessons.join(" ")}`.toLowerCase().includes(normalized),
        ),
      }))
      .filter((item) => item.chapters.length > 0);
  }, [query, unit]);

  return (
    <>
      <div className="catalog-controls">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索章节、语法或知识点" aria-label="搜索课程" />
        </label>
        <div className="filter-chips" aria-label="课程部分筛选">
          <button className={unit === "all" ? "active" : ""} type="button" onClick={() => setUnit("all")}>全部</button>
          {courseUnits.map((item) => <button className={unit === item.id ? "active" : ""} type="button" key={item.id} onClick={() => setUnit(item.id)}>{item.label.replace("部分", "")}</button>)}
        </div>
      </div>

      <div className="catalog-units">
        {visibleUnits.map((item) => (
          <section className={`catalog-unit accent-${item.accent}`} key={item.id}>
            <div className="unit-heading">
              <span className="unit-index">{item.label}</span>
              <div><h2>{item.title}</h2><p>{item.description}</p></div>
              <span className="unit-count">{item.chapters.length} 章</span>
            </div>
            <div className="chapter-list">
              {item.chapters.map((chapter) => {
                const done = isCompleted(chapter.slug);
                return (
                  <Link className={done ? "chapter-row done" : "chapter-row"} href={`/course/${chapter.slug}`} key={chapter.slug}>
                    <span className="chapter-number">{done ? "✓" : String(chapter.number).padStart(2, "0")}</span>
                    <span className="chapter-main"><strong>{chapter.title}</strong><small>{chapter.summary}</small></span>
                    <span className="chapter-meta"><small>{chapter.duration} 分钟</small><em>{chapter.status === "ready" ? "可学习" : "课程大纲"}</em></span>
                    <span className="chapter-arrow" aria-hidden="true">→</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {visibleUnits.length === 0 && <div className="no-results"><strong>没有找到相关课程</strong><p>换一个关键词试试，比如“空安全”或“Flow”。</p></div>}
    </>
  );
}

