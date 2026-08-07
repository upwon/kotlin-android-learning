"use client";

import Link from "next/link";
import { allChapters } from "@/lib/course-data";
import { useProgress } from "./progress-provider";

export function ProgressRing() {
  const { completed } = useProgress();
  const percent = Math.round((completed.length / allChapters.length) * 100);
  const nextChapter = allChapters.find((item) => !completed.includes(item.slug)) ?? allChapters[0];

  return (
    <div className="progress-card">
      <div className="progress-ring" style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}>
        <div>
          <strong>{percent}%</strong>
          <span>总进度</span>
        </div>
      </div>
      <div className="progress-copy">
        <span className="eyebrow">继续学习</span>
        <h2>第 {nextChapter.number} 章 · {nextChapter.title}</h2>
        <p>{completed.length} / {allChapters.length} 章已完成，进度仅保存在当前设备。</p>
        <Link className="text-link" href={`/course/${nextChapter.slug}`}>回到课程 <span>→</span></Link>
      </div>
    </div>
  );
}

export function ChapterCompleteButton({ slug }: { slug: string }) {
  const { isCompleted, toggleCompleted } = useProgress();
  const done = isCompleted(slug);

  return (
    <button className={done ? "complete-button completed" : "complete-button"} type="button" onClick={() => toggleCompleted(slug)}>
      <span aria-hidden="true">{done ? "✓" : "○"}</span>
      {done ? "已完成本章" : "标记本章完成"}
    </button>
  );
}

export function ReviewDashboard() {
  const { completed, clearProgress } = useProgress();
  const finished = allChapters.filter((item) => completed.includes(item.slug));
  const pending = allChapters.filter((item) => !completed.includes(item.slug));
  const percent = Math.round((completed.length / allChapters.length) * 100);

  return (
    <div className="review-grid">
      <section className="review-summary panel">
        <span className="eyebrow">本机学习记录</span>
        <strong className="review-percent">{percent}%</strong>
        <p>已完成 {completed.length} 章，剩余 {pending.length} 章。</p>
        <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
        {completed.length > 0 && (
          <button className="ghost-button danger" type="button" onClick={clearProgress}>清除本机进度</button>
        )}
      </section>
      <section className="panel review-list">
        <div className="section-heading compact">
          <div><span className="eyebrow">已完成</span><h2>学习足迹</h2></div>
        </div>
        {finished.length === 0 ? (
          <p className="empty-state">还没有完成记录。读完章节后点击“标记本章完成”。</p>
        ) : (
          <ul>{finished.map((item) => <li key={item.slug}><span>✓</span><Link href={`/course/${item.slug}`}>第 {item.number} 章 · {item.title}</Link></li>)}</ul>
        )}
      </section>
      <section className="panel review-list next-list">
        <div className="section-heading compact">
          <div><span className="eyebrow">下一步</span><h2>继续前进</h2></div>
        </div>
        <ul>{pending.slice(0, 5).map((item) => <li key={item.slug}><span>{String(item.number).padStart(2, "0")}</span><Link href={`/course/${item.slug}`}>{item.title}</Link></li>)}</ul>
      </section>
    </div>
  );
}

