import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allChapters, courseUnits, getAdjacentChapters, getChapter } from "@/lib/course-data";
import { ChapterCompleteButton } from "@/app/_components/progress-widgets";
import { CodeBlock, CodeComparison } from "@/app/_components/code-block";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allChapters.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = getChapter(slug);
  return item ? { title: `第 ${item.number} 章：${item.title}`, description: item.summary } : { title: "课程不存在" };
}

export default async function ChapterPage({ params }: Props) {
  const { slug } = await params;
  const item = getChapter(slug);
  if (!item) notFound();
  const { previous, next } = getAdjacentChapters(slug);
  const unit = courseUnits.find((entry) => entry.id === item.unitId);

  return (
    <main className="lesson-layout page-shell">
      <aside className="lesson-course-nav" aria-label="本部分课程">
        <Link className="back-to-map" href="/course">← 返回课程地图</Link>
        <span className="eyebrow">{item.unitLabel}</span>
        <h2>{item.unitTitle}</h2>
        <nav>
          {unit?.chapters.map((chapter) => (
            <Link className={chapter.slug === item.slug ? "active" : ""} href={`/course/${chapter.slug}`} key={chapter.slug}>
              <span>{String(chapter.number).padStart(2, "0")}</span>{chapter.title}
            </Link>
          ))}
        </nav>
      </aside>

      <article className="lesson-article">
        <div className="lesson-breadcrumb"><Link href="/course">课程</Link><span>/</span><span>{item.unitTitle}</span><span>/</span><strong>第 {item.number} 章</strong></div>
        <header className="lesson-header">
          <div className="lesson-status-row"><span className="chapter-pill">CHAPTER {String(item.number).padStart(2, "0")}</span><span>{item.level}</span><span>{item.duration} 分钟</span><span>{item.lessons.length} 小节</span></div>
          <h1>{item.title}</h1>
          <p>{item.summary}</p>
          <div className="lesson-objectives"><strong>学完本章，你将能够</strong><ul>{item.objectives.map((objective) => <li key={objective}><span>✓</span>{objective}</li>)}</ul></div>
        </header>

        <section className="lesson-outline panel" id="lesson-outline">
          <div><span className="eyebrow">本章路线</span><h2>{item.lessons.length} 个知识小节</h2></div>
          <ol>{item.lessons.map((lesson, index) => <li key={lesson}><span>{String(index + 1).padStart(2, "0")}</span>{lesson}</li>)}</ol>
        </section>

        {item.sections ? (
          <div className="lesson-sections">
            {item.sections.map((section) => (
              <section className="lesson-section" id={section.id} key={section.id}>
                <span className="eyebrow">{section.eyebrow}</span>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul className="concept-list">{section.bullets.map((bullet) => <li key={bullet}><span>→</span>{bullet}</li>)}</ul>}
                {section.code && <CodeComparison {...section.code} />}
                {section.kotlinCode && <CodeBlock code={section.kotlinCode} />}
                {section.note && <aside className="lesson-note"><strong>注意</strong><p>{section.note}</p></aside>}
              </section>
            ))}
          </div>
        ) : (
          <section className="outline-only panel">
            <span className="eyebrow">课程大纲已收录</span>
            <h2>本章详细讲义正在编写</h2>
            <p>你现在可以先查看学习目标和完整小节安排。正式讲义会继续采用 Java 对照、原理拆解、Android 案例和练习的统一结构。</p>
            <div className="outline-topics">{item.lessons.map((lesson) => <span key={lesson}>{lesson}</span>)}</div>
          </section>
        )}

        {item.exercise && (
          <section className="exercise-card" id="exercise">
            <div className="exercise-label">动手练习</div>
            <h2>{item.exercise.title}</h2>
            <p>{item.exercise.prompt}</p>
            {item.exercise.starter && <CodeBlock code={item.exercise.starter} label="待改写代码" />}
            <details><summary>查看提示</summary><p>{item.exercise.hint}</p></details>
          </section>
        )}

        <section className="lesson-complete-panel">
          <div><span className="eyebrow">学习记录</span><h2>{item.status === "ready" ? "完成本章后，继续向前。" : "先收藏这条学习路线。"}</h2><p>进度只保存在当前浏览器，不需要登录。</p></div>
          <ChapterCompleteButton slug={item.slug} />
        </section>

        <nav className="lesson-pagination" aria-label="章节翻页">
          {previous ? <Link href={`/course/${previous.slug}`}><span>← 上一章</span><strong>{previous.title}</strong></Link> : <span />}
          {next ? <Link className="next" href={`/course/${next.slug}`}><span>下一章 →</span><strong>{next.title}</strong></Link> : <Link className="next" href="/review"><span>完成课程 →</span><strong>查看学习记录</strong></Link>}
        </nav>
      </article>

      <aside className="lesson-toc" aria-label="本页目录">
        <span className="eyebrow">本页目录</span>
        <a href="#lesson-outline">本章路线</a>
        {item.sections?.map((section) => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}
        {item.exercise && <a href="#exercise">动手练习</a>}
      </aside>
    </main>
  );
}

