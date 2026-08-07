import type { Metadata } from "next";
import { ReviewDashboard } from "../_components/progress-widgets";

export const metadata: Metadata = { title: "学习复习", description: "查看 Kotlin Android 学习进度。" };

export default function ReviewPage() {
  return (
    <main className="page-shell simple-page">
      <header className="page-hero slim"><div><span className="eyebrow">复习中心</span><h1>看见积累，<br />再决定下一步。</h1><p>当前版本在本机记录已完成章节。收藏、错题和跨设备同步会在后续版本逐步加入。</p></div></header>
      <ReviewDashboard />
    </main>
  );
}

