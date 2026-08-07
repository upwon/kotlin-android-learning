import type { Metadata } from "next";
import { CodeBlock } from "../_components/code-block";

export const metadata: Metadata = { title: "Kotlin 速查", description: "Java Android 开发者常用 Kotlin 语法速查。" };

const cards = [
  { title: "变量与类型", tag: "基础", code: "val name = \"Kotlin\"\nvar count = 0\nval nullable: String? = null", note: "优先 val；类型明显时让编译器推断。" },
  { title: "空安全", tag: "高频", code: "val id = raw\n    ?.toLongOrNull()\n    ?: return", note: "?. 传播空值，?: 提供默认值或提前返回。" },
  { title: "when 表达式", tag: "控制流", code: "val label = when (code) {\n    in 200..299 -> \"成功\"\n    401 -> \"请登录\"\n    else -> \"失败\"\n}", note: "没有 fall-through，也不需要 break。" },
  { title: "默认与具名参数", tag: "函数", code: "fun load(\n    page: Int = 1,\n    refresh: Boolean = false,\n) { /* ... */ }\n\nload(refresh = true)", note: "减少重载，让调用处自己解释含义。" },
  { title: "集合转换", tag: "集合", code: "val names = users\n    .filter { it.active }\n    .map { it.name }\n    .distinct()", note: "每一步返回新集合；长链和大数据量关注中间分配。" },
  { title: "作用域函数", tag: "惯用法", code: "val intent = Intent(context, DetailActivity::class.java)\n    .apply { putExtra(EXTRA_ID, id) }\n\nuser?.let { render(it) }", note: "apply 返回接收者；let 返回 Lambda 结果。" },
  { title: "协程切换上下文", tag: "协程", code: "viewModelScope.launch {\n    val data = withContext(Dispatchers.IO) {\n        repository.load()\n    }\n    render(data)\n}", note: "suspend 不等于后台线程，Dispatcher 才决定执行环境。" },
  { title: "StateFlow 更新", tag: "Flow", code: "private val _state = MutableStateFlow(UiState())\nval state = _state.asStateFlow()\n\n_state.update { it.copy(loading = true) }", note: "对外暴露只读 StateFlow，在 ViewModel 内集中修改。" },
];

export default function ReferencePage() {
  return (
    <main className="page-shell simple-page reference-page">
      <header className="page-hero slim"><div><span className="eyebrow">Kotlin 速查</span><h1>忘记写法时，<br />先来这里看一眼。</h1><p>面向 Android 日常开发的高频语法卡片。每个结论都能在课程中找到完整原理。</p></div></header>
      <div className="reference-grid">
        {cards.map((card) => <article className="reference-card" key={card.title}><div><span>{card.tag}</span><h2>{card.title}</h2></div><CodeBlock code={card.code} /><p>{card.note}</p></article>)}
      </div>
    </main>
  );
}

