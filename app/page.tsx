import Link from "next/link";
import { allChapters, courseUnits, totalLessons, totalMinutes } from "@/lib/course-data";
import { ProgressRing } from "./_components/progress-widgets";

const hours = Math.round(totalMinutes / 60);

export default function Home() {
  return (
    <main>
      <section className="hero section-shell">
        <div className="hero-copy">
          <div className="hero-badge"><span>K</span>Kotlin 2.1 · Android 专属路径</div>
          <h1>把熟悉的 Java，<br />变成真正理解的 <em>Kotlin</em></h1>
          <p>为有 Java Android 经验的开发者重新组织官方知识：从常用语法、类型系统，一路深入协程状态机、Flow 与 Android 生命周期。</p>
          <div className="hero-actions">
            <Link className="primary-button large" href="/course/meet-kotlin">开始第一章 <span>→</span></Link>
            <Link className="secondary-button large" href="/course">查看完整课程</Link>
          </div>
          <div className="hero-trust">
            <span><strong>{allChapters.length}</strong> 章系统课程</span>
            <span><strong>{totalLessons}</strong> 个知识小节</span>
            <span><strong>{hours}</strong> 小时主线内容</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Kotlin 代码学习示例">
          <div className="floating-label label-one">空安全 <strong>String?</strong></div>
          <div className="floating-label label-two">结构化并发 <strong>Job</strong></div>
          <div className="hero-code-card">
            <div className="code-card-top"><div><span /><span /><span /></div><small>UserViewModel.kt</small><b>K</b></div>
            <pre><code><span className="code-purple">class</span> UserViewModel(<br />  <span className="code-blue">private val</span> repo: UserRepository<br />) : ViewModel() {'{'}<br /><br />  <span className="code-blue">val</span> uiState = repo.observeUser()<br />    .<span className="code-teal">map</span> {'{'} user -&gt;<br />      UiState.Content(user)<br />    {'}'}<br />    .<span className="code-teal">stateIn</span>(viewModelScope)<br />{'}'}</code></pre>
            <div className="code-card-result"><span>✓</span><div><strong>状态由数据流驱动</strong><small>生命周期安全 · 可测试 · 可组合</small></div></div>
          </div>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        </div>
      </section>

      <section className="section-shell progress-section">
        <ProgressRing />
      </section>

      <section className="section-shell home-section">
        <div className="section-heading">
          <div><span className="eyebrow">两条学习路线</span><h2>按你的目标，选择节奏</h2></div>
          <p>路线不同，知识体系相同。快速路线先解决日常开发，系统路线补齐语言与运行原理。</p>
        </div>
        <div className="track-grid">
          <article className="track-card fast">
            <div className="track-icon">↗</div><span className="track-tag">推荐先走</span>
            <h3>快速实战路线</h3>
            <p>先完成语法、常用写法、协程、Flow 和 Android 实战，尽快具备 Kotlin 项目开发能力。</p>
            <ul><li>Java → Kotlin 常用迁移</li><li>协程与 Flow 主线</li><li>完整 Android 项目</li></ul>
            <Link href="/course">约 18 章 · 查看路线 <span>→</span></Link>
          </article>
          <article className="track-card deep">
            <div className="track-icon">⌘</div><span className="track-tag">原理进阶</span>
            <h3>系统原理路线</h3>
            <p>按 29 章完整学习类型、泛型、内联、委托、JVM、协程状态机和工程实践。</p>
            <ul><li>语言设计与类型系统</li><li>JVM 字节码和互操作</li><li>大厂面试原理表达</li></ul>
            <Link href="/course">完整 29 章 · 查看路线 <span>→</span></Link>
          </article>
        </div>
      </section>

      <section className="curriculum-section">
        <div className="section-shell">
          <div className="section-heading light">
            <div><span className="eyebrow">完整知识地图</span><h2>八个部分，从语法走到工程判断</h2></div>
            <Link className="outline-link" href="/course">打开课程地图 <span>→</span></Link>
          </div>
          <div className="unit-preview-grid">
            {courseUnits.map((unit, index) => (
              <Link className={`unit-preview accent-${unit.accent}`} href={`/course#${unit.id}`} key={unit.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{unit.title}</strong><small>{unit.chapters.length} 章 · {unit.description}</small></div>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell home-section methodology">
        <div className="section-heading centered"><div><span className="eyebrow">不是换皮电子书</span><h2>每一节都从你的 Java 经验出发</h2></div><p>先建立直觉，再理解机制，最后放回 Android 场景验证。</p></div>
        <div className="method-grid">
          <article><span>01</span><h3>Java 对照</h3><p>从已经会的写法进入，准确指出迁移的变化。</p></article>
          <article><span>02</span><h3>原理拆解</h3><p>解释编译器、JVM、状态机和生命周期，而不只背结论。</p></article>
          <article><span>03</span><h3>Android 案例</h3><p>用 Activity、ViewModel、Repository 和 UI 状态落地。</p></article>
          <article><span>04</span><h3>练习复盘</h3><p>代码阅读、迁移练习、易错题和面试化表达。</p></article>
        </div>
      </section>

      <section className="section-shell final-cta">
        <div><span className="eyebrow">第一阶段 · 语言基础</span><h2>先用 32 分钟，建立正确的 Kotlin 起点。</h2><p>第一章已经可以完整学习，进度会自动保存在当前设备。</p></div>
        <Link className="primary-button light-button large" href="/course/meet-kotlin">进入第一章 <span>→</span></Link>
      </section>
    </main>
  );
}

