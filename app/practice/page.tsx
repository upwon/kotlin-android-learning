import type { Metadata } from "next";
import Link from "next/link";
import { PracticeQuiz } from "../_components/practice-quiz";

export const metadata: Metadata = { title: "练习中心", description: "Kotlin、协程与 Flow 随堂练习。" };

export default function PracticePage() {
  return (
    <main className="page-shell simple-page">
      <header className="page-hero slim"><div><span className="eyebrow">练习中心</span><h1>不背结论，<br />用选择检验理解。</h1><p>先做一组基础诊断题。提交答案后立即看到原理解释，不记录账号信息。</p></div><Link className="secondary-button" href="/course">回到课程地图</Link></header>
      <PracticeQuiz />
      <section className="practice-types">
        <article><span>01</span><h2>代码阅读</h2><p>判断类型、输出、编译结果和潜在空值风险。</p><em>持续补充</em></article>
        <article><span>02</span><h2>Java 迁移</h2><p>把真实 Android Java 片段改写成清晰 Kotlin。</p><em>随课程开放</em></article>
        <article><span>03</span><h2>面试表达</h2><p>用原理、场景和取舍组织中高级面试回答。</p><em>第 29 章</em></article>
      </section>
    </main>
  );
}

