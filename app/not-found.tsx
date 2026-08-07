import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found page-shell">
      <span className="brand-mark">K</span><strong>404</strong><h1>这节课还不存在</h1><p>可能是链接发生了变化，回到课程地图继续学习吧。</p><Link className="primary-button" href="/course">返回课程地图</Link>
    </main>
  );
}

