import type { Metadata } from "next";
import { CodeBlock } from "../_components/code-block";

export const metadata: Metadata = { title: "Kotlin 速查", description: "Java Android 开发者常用 Kotlin 语法速查。" };

const cards = [
  { title: "变量与类型", tag: "基础", code: "val name = \"Kotlin\"\nvar count = 0\nval nullable: String? = null", note: "优先 val；类型明显时让编译器推断。" },
  { title: "空安全", tag: "高频", code: "val id = raw\n    ?.toLongOrNull()\n    ?: return", note: "?. 传播空值，?: 提供默认值或提前返回。" },
  { title: "when 表达式", tag: "控制流", code: "val label = when (code) {\n    in 200..299 -> \"成功\"\n    401 -> \"请登录\"\n    else -> \"失败\"\n}", note: "没有 fall-through，也不需要 break。" },
  { title: "默认与具名参数", tag: "函数", code: "fun load(\n    page: Int = 1,\n    refresh: Boolean = false,\n) { /* 执行加载逻辑 */ }\n\nload(refresh = true)", note: "减少重载，让调用处自己解释含义。" },
  { title: "集合转换", tag: "集合", code: "val names = users\n    .filter { it.active }\n    .map { it.name }\n    .distinct()", note: "每一步返回新集合；长链和大数据量关注中间分配。" },
  { title: "作用域函数", tag: "惯用法", code: "val intent = Intent(context, DetailActivity::class.java)\n    .apply { putExtra(EXTRA_ID, id) }\n\nuser?.let { render(it) }", note: "apply 返回接收者；let 返回 Lambda 结果。" },
  { title: "协程切换上下文", tag: "协程", code: "viewModelScope.launch {\n    val data = withContext(Dispatchers.IO) {\n        repository.load()\n    }\n    render(data)\n}", note: "suspend 不等于后台线程，Dispatcher 才决定执行环境。" },
  { title: "StateFlow 更新", tag: "Flow", code: "private val _state = MutableStateFlow(UiState())\nval state = _state.asStateFlow()\n\n_state.update { it.copy(loading = true) }", note: "对外暴露只读 StateFlow，在 ViewModel 内集中修改。" },
  { title: "生命周期安全收集", tag: "Android", code: "val state by viewModel.uiState\n    .collectAsStateWithLifecycle()", note: "Compose 页面低于 STARTED 时停止收集，恢复后读取 StateFlow 最新值。" },
  { title: "Room 唯一事实源", tag: "Jetpack", code: "fun observe(id: Long): Flow<User?> =\n    dao.observe(id).map { it?.toDomain() }\n\nsuspend fun refresh(id: Long) {\n    dao.upsert(api.user(id).toEntity())\n}", note: "网络只负责刷新数据库，UI 始终观察 Room，离线时仍有同一条数据链。" },
  { title: "WorkManager 唯一任务", tag: "Jetpack", code: "workManager.enqueueUniqueWork(\n    \"sync-$userId\",\n    ExistingWorkPolicy.KEEP,\n    request,\n)", note: "适合必须完成的持久任务；配合联网约束、幂等键与退避。" },
  { title: "Compose 状态提升", tag: "Compose", code: "@Composable\nfun SearchBar(\n    query: String,\n    onQueryChange: (String) -> Unit,\n) {\n    TextField(query, onQueryChange)\n}", note: "无状态组件只接收值与事件，业务状态交给 ViewModel 或上层状态持有者。" },
  { title: "Effect 与 key", tag: "Compose", code: "LaunchedEffect(userId) {\n    repository.observe(userId).collect(::render)\n}", note: "userId 改变时取消旧任务并启动新任务；离开 Composition 时自动取消。" },
  { title: "LazyColumn 稳定 key", tag: "Compose", code: "items(\n    items = users,\n    key = User::id,\n) { user ->\n    UserRow(user)\n}", note: "稳定 key 让插入、排序后仍能保持项目身份和局部状态。" },
  { title: "Paging 跨旋转", tag: "Paging", code: "val users = query\n    .flatMapLatest(repository::search)\n    .cachedIn(viewModelScope)", note: "cachedIn 保留 ViewModel 生命周期内的分页代；磁盘缓存由 Room 负责。" },
  { title: "Hilt ViewModel", tag: "Hilt", code: "@HiltViewModel\nclass UserViewModel @Inject constructor(\n    repository: UserRepository,\n    savedStateHandle: SavedStateHandle,\n) : ViewModel()", note: "ViewModel 不是单例；Hilt 同时注入业务依赖和可恢复导航参数。" },
];

export default function ReferencePage() {
  return (
    <main className="page-shell simple-page reference-page">
      <header className="page-hero slim"><div><span className="eyebrow">Kotlin 速查</span><h1>忘记写法时，<br />先来这里看一眼。</h1><p>面向 Android 日常开发的高频语法卡片。每个结论都能在课程中找到完整原理。</p></div></header>
      <div className="reference-grid">
        {cards.map((card) => <article className="reference-card" key={card.title}><div><span>{card.tag}</span><h2>{card.title}</h2></div><CodeBlock code={card.code} comment={`使用场景：${card.title}`} /><p>{card.note}</p></article>)}
      </div>
    </main>
  );
}
