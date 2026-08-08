import type { Metadata } from "next";
import { allChapters, courseUnits, totalLessons } from "@/lib/course-data";
import { CourseCatalog } from "../_components/course-catalog";

export const metadata: Metadata = {
  title: "课程地图",
  description: "Kotlin Android 学习站完整 29 章课程地图。",
};

export default function CoursePage() {
  return (
    <main className="page-shell catalog-page">
      <header className="page-hero compact-hero">
        <div><span className="eyebrow">完整课程地图</span><h1>从 Java 到 Kotlin，<br />每一步都能完整学习。</h1><p>八个部分、{allChapters.length} 章、{totalLessons} 个知识小节现已全部提供完整讲义、代码示例与动手练习。</p></div>
        <div className="hero-metric-stack">
          <div><strong>{courseUnits.length}</strong><span>知识部分</span></div>
          <div><strong>{allChapters.length}</strong><span>系统章节</span></div>
          <div><strong>{allChapters.filter((item) => item.status === "ready").length}</strong><span>完整讲义</span></div>
        </div>
      </header>
      <CourseCatalog />
    </main>
  );
}
