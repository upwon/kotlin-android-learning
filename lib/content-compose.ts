import type { CompleteChapterContent } from "./content-types";

export const composeContent: Record<string, CompleteChapterContent> = {
  "compose-mental-model": {
    sections: [
      {
        id: "declarative-ui",
        eyebrow: "01 · 声明式 UI",
        title: "Composable 描述当前状态应该对应什么界面",
        paragraphs: [
          "View 体系常先创建控件，再在回调里逐项修改；Compose 则让函数读取状态并描述 UI 树。状态变化后框架再次执行受影响的 Composable，计算新的描述。你不需要手动找到 TextView 再 setText。",
          "@Composable 函数可以调用其他 Composable，但通常不返回 View。它应该快速、幂等并尽量无副作用，因为组合可能按不同顺序执行、被跳过，甚至在提交前取消。",
        ],
        code: {
          title: "从命令式更新到状态驱动",
          java: `titleView.setText(user.getName());
progressView.setVisibility(loading ? VISIBLE : GONE);`,
          kotlin: `@Composable
fun UserHeader(
    name: String,
    loading: Boolean,
) {
    Text(text = name)
    if (loading) CircularProgressIndicator()
}`,
        },
      },
      {
        id: "composition-recomposition",
        eyebrow: "02 · 组合与重组",
        title: "重组是重新执行可能变化的函数，不等于整棵界面重绘",
        paragraphs: [
          "首次调用建立 Composition，Compose 记录调用位置和读取过的 Snapshot State。状态变化时，只让依赖该状态的可重组范围重新执行；布局和绘制是否发生还取决于输出是否真的改变。",
          "Composable 可能在一帧内执行多次，也可能被跳过。因此不能在函数体里直接发网络请求、写数据库或修改 ViewModel；这些行为必须由事件处理或 Effect API 管理。",
        ],
        kotlinCode: `@Composable
fun Counter(value: Int, onIncrement: () -> Unit) {
    Column {
        Text("当前值：" + value)
        Button(onClick = onIncrement) {
            Text("增加")
        }
    }
}

// value 改变时 Counter 可能重组；
// onClick 不执行时不会产生业务副作用。`,
      },
      {
        id: "identity-slot-table",
        eyebrow: "03 · 身份",
        title: "调用位置和 key 决定一个 Composable 实例是谁",
        paragraphs: [
          "Compose 在内部按调用位置保存节点与 remember 状态。列表顺序变化时，如果没有稳定 key，框架可能把旧状态关联到错误项目，正在运行的 Effect 也可能被取消并重启。",
          "LazyColumn 的 key 和普通 key 块都应使用稳定、唯一的业务标识。不要使用会变化的列表下标，也不要每次组合随机生成 id。",
        ],
        kotlinCode: `LazyColumn {
    items(
        items = users,
        key = User::id,
        contentType = { "user" },
    ) { user ->
        UserRow(user = user)
    }
}`,
      },
      {
        id: "stability-preview",
        eyebrow: "04 · 稳定性与 Preview",
        title: "稳定输入帮助跳过重组，Preview 帮助隔离 UI",
        paragraphs: [
          "当 Compose 能证明参数稳定且值未变化时，可以跳过对应函数。不可变 data class、稳定集合和只读接口有利于判断；把 MutableList 或行为不明确的可变对象直接传入 UI 会让更新丢失或扩大重组范围。",
          "Preview 使用固定 UiState 与回调展示不同状态，不应启动真实网络、数据库或 Hilt 图。把 Screen 拆成 Route 与纯 UI 函数，既方便 Preview，也方便普通 Compose 测试。",
        ],
        kotlinCode: `@Immutable
data class UserCardModel(
    val id: Long,
    val name: String,
)

@Preview(showBackground = true)
@Composable
private fun UserCardPreview() {
    AppTheme {
        UserCard(
            model = UserCardModel(1, "Ada"),
            onClick = {},
        )
    }
}`,
        note: "不要为了追求“零重组”乱加 @Stable。先保证数据真实不可变，再用工具确认热点。",
      },
    ],
    exercise: {
      title: "把命令式计数页改成 Compose",
      prompt: "实现 CounterScreen：显示 count、增加和重置按钮。要求 UI 函数无副作用、状态由调用方传入、列表型历史记录使用稳定 key，并提供 0、10 两种 Preview。解释 count 改变时哪些函数可能重组。",
      hint: "拆成 CounterRoute 与 CounterScreen；Screen 接收 value、history、onIncrement、onReset。",
    },
  },

  "compose-layout-material": {
    sections: [
      {
        id: "constraints",
        eyebrow: "01 · 布局约束",
        title: "父节点传约束，子节点选择尺寸，父节点再放置",
        paragraphs: [
          "Compose 布局经历测量与放置。Row、Column、Box 把约束传给子项，再根据排列规则决定位置。子项不能随意突破父约束，这解释了为什么 fillMaxSize、wrapContentSize 和 weight 在不同父容器中效果不同。",
          "一条布局链中通常只测量子项一次。需要自定义布局时使用 Layout API 明确测量和放置，不要通过读取屏幕像素后硬编码位置。",
        ],
        kotlinCode: `Row(
    modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp),
    verticalAlignment = Alignment.CenterVertically,
) {
    Avatar()
    Spacer(Modifier.width(12.dp))
    Text(
        text = user.name,
        modifier = Modifier.weight(1f),
    )
    IconButton(onClick = onMore) { MoreIcon() }
}`,
      },
      {
        id: "modifier-order",
        eyebrow: "02 · Modifier",
        title: "Modifier 从左到右包装，顺序就是行为",
        paragraphs: [
          "Modifier 同时参与布局、绘制、输入和语义。padding().background() 与 background().padding() 生成不同的包装层；clickable 放在 padding 前后也会改变可点击区域。",
          "可复用 Composable 应接受 modifier: Modifier = Modifier，并把它应用在最外层且通常只应用一次。不要在组件内部替调用方覆盖 fillMaxWidth 或 padding，除非这是组件契约。",
        ],
        kotlinCode: `@Composable
fun PrimaryCard(
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .clip(MaterialTheme.shapes.large)
            .clickable(onClick = onClick)
            .background(MaterialTheme.colorScheme.surfaceContainer)
            .padding(16.dp),
        content = content,
    )
}`,
      },
      {
        id: "material-theme",
        eyebrow: "03 · Material 3",
        title: "主题提供设计令牌，组件读取语义颜色",
        paragraphs: [
          "MaterialTheme 统一 colorScheme、typography 与 shapes。业务组件读取 primary、surface、onSurface 等语义颜色，而不是散落十六进制值；深色主题和动态配色才能统一切换。",
          "Scaffold 组织 TopAppBar、NavigationBar、SnackbarHost 与内容区域。contentPadding 必须传给页面内容，避免被系统栏或底部导航遮挡。",
        ],
        kotlinCode: `@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) darkColorScheme() else lightColorScheme(),
        typography = AppTypography,
        shapes = AppShapes,
        content = content,
    )
}`,
      },
      {
        id: "component-api",
        eyebrow: "04 · 组件 API",
        title: "状态、事件和插槽组成可扩展组件契约",
        paragraphs: [
          "组件接收展示所需最小状态和事件回调。复杂可变对象、ViewModel、NavController 不应层层传入叶子组件。标题、图标或操作区域需要定制时，用 @Composable 插槽代替十几个 Boolean 配置。",
          "组件要同时处理文字放大、长文本、RTL、暗色和不同宽度。Preview 参数可以批量展示关键组合，但最终仍要真机检查。",
        ],
        kotlinCode: `@Composable
fun EmptyState(
    title: String,
    modifier: Modifier = Modifier,
    illustration: @Composable () -> Unit,
    action: @Composable (() -> Unit)? = null,
) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        illustration()
        Text(title, style = MaterialTheme.typography.titleMedium)
        action?.invoke()
    }
}`,
      },
    ],
    exercise: {
      title: "实现一个可复用 Material 3 用户卡片",
      prompt: "实现 UserCard：头像、名字、描述、收藏按钮和可选尾部插槽。支持外部 modifier、整卡点击、48dp 触控目标、深浅主题和长文本。解释 Modifier 顺序，并提供窄屏与暗色 Preview。",
      hint: "最外层 Surface/Column 接收 modifier；收藏按钮单独点击时注意不要让事件同时触发整卡。",
    },
  },

  "compose-state": {
    sections: [
      {
        id: "snapshot-state",
        eyebrow: "01 · Snapshot State",
        title: "读取 State 建立订阅，写入值触发相关范围失效",
        paragraphs: [
          "mutableStateOf 创建 Compose 可观察状态，remember 让它跨重组保存在当前 Composition 中。如果每次执行函数都重新创建状态，输入会不断回到初始值。",
          "普通 MutableList 修改内容不会自动通知 Compose。使用 SnapshotStateList，或更推荐把不可变 List 放进 State 并替换为新列表。",
        ],
        kotlinCode: `@Composable
fun SearchField() {
    var query by remember { mutableStateOf("") }

    OutlinedTextField(
        value = query,
        onValueChange = { query = it },
        label = { Text("搜索") },
    )
}`,
      },
      {
        id: "state-lifespans",
        eyebrow: "02 · 状态寿命",
        title: "remember 跨重组，rememberSaveable 还能跨 Activity 重建",
        paragraphs: [
          "remember 只属于当前 Composition，离开页面或配置变化后可能丢失。rememberSaveable 通过 SavedStateRegistry 保存 Bundle 可表达的数据，适合输入框、选中页签和滚动等 UI 元素状态。",
          "业务数据不能全部塞进 rememberSaveable。页面 id 进入 SavedStateHandle，用户和订单等事实来自 Repository；大量对象保存进 Bundle 可能造成 TransactionTooLargeException。",
        ],
        kotlinCode: `var selectedTab by rememberSaveable {
    mutableIntStateOf(0)
}

val listState = rememberLazyListState()
// LazyListState 自带 Saver，可通过 rememberSaveable 保存滚动位置。`,
      },
      {
        id: "state-hoisting",
        eyebrow: "03 · 状态提升",
        title: "把状态提升到同时读取和修改它的最低共同祖先",
        paragraphs: [
          "无状态组件接收 value 与 onValueChange，调用方决定状态保存在哪里。这样同一组件可以由本地 remember、普通状态持有者或 ViewModel 驱动，也更容易 Preview 和测试。",
          "不是所有状态都要提升到 ViewModel。纯 UI 展开、临时焦点和动画进度通常留在 Composition；涉及业务规则、跨页面共享或进程恢复的状态才提升到更高层。",
        ],
        kotlinCode: `@Composable
fun NameField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier,
    )
}`,
      },
      {
        id: "derived-snapshot-flow",
        eyebrow: "04 · 派生状态",
        title: "derivedStateOf 限制高频读取，snapshotFlow 把状态桥接到 Flow",
        paragraphs: [
          "derivedStateOf 适合输入变化频率高于 UI 真正需要更新频率的计算，例如只有列表离开顶部后才显示回顶按钮。普通字符串拼接或便宜计算不必使用，它本身也有成本。",
          "snapshotFlow 在协程中观察 Snapshot State，并按 Flow 语义去重、转换和收集，适合滚动埋点。业务数据仍应从 ViewModel Flow 进入 UI，不要绕一圈转换。",
        ],
        kotlinCode: `val showScrollToTop by remember {
    derivedStateOf {
        listState.firstVisibleItemIndex > 0
    }
}

LaunchedEffect(listState) {
    snapshotFlow { listState.firstVisibleItemIndex }
        .filter { index -> index > 0 }
        .distinctUntilChanged()
        .collect(analytics::logScrolledPastFirstItem)
}`,
      },
    ],
    exercise: {
      title: "设计一个状态寿命正确的搜索表单",
      prompt: "搜索页包含 query、筛选面板展开状态、选中筛选、滚动位置和服务器结果。分别决定 remember、rememberSaveable、SavedStateHandle、ViewModel StateFlow 的归属；实现无状态 SearchBar，并用 derivedStateOf 控制回顶按钮。",
      hint: "先区分 UI 元素状态与业务状态，再分别回答重组、旋转、进程死亡是否需要恢复。",
    },
  },

  "compose-viewmodel-udf": {
    sections: [
      {
        id: "collect-state",
        eyebrow: "01 · 收集",
        title: "使用 collectAsStateWithLifecycle 把 StateFlow 变成 Compose State",
        paragraphs: [
          "Android 页面收集 Flow 时要受 Lifecycle 约束。collectAsStateWithLifecycle 在页面不可见时停止上游收集，并在重新可见后读取 StateFlow 最新值，避免后台持续渲染相关工作。",
          "Route 函数负责获得 ViewModel 和收集状态，Screen 函数只接收 UiState 与事件。这一层拆分让 Screen 可以在普通 Preview 和测试中运行。",
        ],
        kotlinCode: `@Composable
fun UserRoute(
    viewModel: UserViewModel = hiltViewModel(),
    onBack: () -> Unit,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    UserScreen(
        state = state,
        onAction = viewModel::onAction,
        onBack = onBack,
    )
}`,
      },
      {
        id: "ui-state-model",
        eyebrow: "02 · UiState",
        title: "Screen UiState 是一帧可完整渲染的不可变快照",
        paragraphs: [
          "UiState 应包含页面渲染所需数据，而不是泄露 Entity、Response 或 MutableFlow。缓存内容、刷新进度、分页错误等可共存时使用正交字段；真正互斥阶段再使用 sealed 类型。",
          "格式化日期、组合标签等与展示相关且可测试的转换放在状态生产管线，避免每次重组做昂贵解析。资源 id 或用户可见字符串的归属按本地化策略决定。",
        ],
        kotlinCode: `@Immutable
data class UserScreenState(
    val user: UserUi? = null,
    val initialLoading: Boolean = true,
    val refreshing: Boolean = false,
    val errorMessage: String? = null,
    val favorite: Boolean = false,
)`,
      },
      {
        id: "events-effects",
        eyebrow: "03 · 事件与效果",
        title: "业务事件进入 ViewModel，导航和 Snackbar 留在 UI 边界",
        paragraphs: [
          "点击重试、收藏和提交等业务意图进入 ViewModel。导航通常由 Screen 上报语义回调，再由 NavHost 所在层执行；ViewModel 不需要持有 NavController。",
          "必须保证的操作结果建模为状态并确认消费；允许页面不可见时丢失的 Toast 可用 SharedFlow。不要用 replay=1 粗暴修复导航丢失，它容易在旋转后重复。",
        ],
        kotlinCode: `sealed interface UserAction {
    data object Retry : UserAction
    data object ToggleFavorite : UserAction
}

UserScreen(
    state = state,
    onAction = viewModel::onAction,
    onOpenPosts = { userId -> navController.navigate(PostsRoute(userId)) },
)`,
      },
      {
        id: "state-holder-preview",
        eyebrow: "04 · 状态持有者",
        title: "复杂 UI 逻辑可以交给普通 State Holder",
        paragraphs: [
          "抽屉、Scaffold、焦点和多个局部组件协调属于 UI 逻辑，可由 remember 创建的普通状态持有者管理。它依赖 Compose 或 Android UI 类型，但不承担业务数据加载。",
          "Preview 和 Screen 测试传入完整 Fake state 与空回调，不启动 ViewModel。ViewModel 单独用 runTest 验证状态生产，两个层次各自稳定。",
        ],
        kotlinCode: `@Stable
class SearchScreenState(
    val listState: LazyListState,
    val snackbarHostState: SnackbarHostState,
) {
    suspend fun scrollToTop() = listState.animateScrollToItem(0)
}

@Composable
fun rememberSearchScreenState() = remember {
    SearchScreenState(
        listState = LazyListState(),
        snackbarHostState = SnackbarHostState(),
    )
}`,
      },
    ],
    exercise: {
      title: "连接离线详情 ViewModel 与 Compose",
      prompt: "把第 25 章 UserViewModel 接到 UserRoute/UserScreen。要求生命周期安全收集，缓存内容和刷新错误同时显示，重试与收藏进入 ViewModel，返回和打开文章通过回调导航，并提供 Loading、Content+Error 两个 Preview。",
      hint: "Route 持有 ViewModel；Screen 不导入 Hilt、NavController 或 Repository。",
    },
  },

  "compose-effects": {
    sections: [
      {
        id: "launched-effect",
        eyebrow: "01 · LaunchedEffect",
        title: "LaunchedEffect 的 Job 寿命由调用位置和 key 决定",
        paragraphs: [
          "LaunchedEffect 进入 Composition 时启动协程，key 改变会取消旧 Job 并启动新 Job，离开 Composition 时取消。它适合收集一次性 UI effect、执行与当前参数绑定的动画或滚动。",
          "不要用 Unit 隐藏真正依赖，也不要把每次重组都变化的对象当 key。网络数据通常由 ViewModel 加载，而不是页面进入时在 LaunchedEffect 直接调用 Repository。",
        ],
        kotlinCode: `LaunchedEffect(userId) {
    viewModel.effects.collect { effect ->
        when (effect) {
            is UserEffect.Message ->
                snackbarHostState.showSnackbar(effect.text)
        }
    }
}`,
      },
      {
        id: "scope-updated-state",
        eyebrow: "02 · Scope 与最新回调",
        title: "事件回调启动协程用 rememberCoroutineScope",
        paragraphs: [
          "点击按钮后打开 Snackbar、抽屉或执行动画，需要一个随当前 Composition 取消的 Scope，使用 rememberCoroutineScope。不要在 onClick 里创建 GlobalScope。",
          "长期 Effect 需要调用可能变化的 Lambda 时，用 rememberUpdatedState 获取最新回调而不重启整个 Effect，例如倒计时结束回调。",
        ],
        kotlinCode: `val scope = rememberCoroutineScope()

Button(
    onClick = {
        scope.launch {
            snackbarHostState.showSnackbar("已保存")
        }
    },
) {
    Text("保存")
}`,
      },
      {
        id: "disposable-effect",
        eyebrow: "03 · DisposableEffect",
        title: "注册外部监听时必须在 onDispose 对称解除",
        paragraphs: [
          "Lifecycle Observer、广播监听、传感器或第三方 SDK 回调不由 Compose 自动管理。DisposableEffect 根据 key 注册，并在 key 变化或离开 Composition 时清理。",
          "清理必须与本次注册使用同一个对象。若监听只属于页面可见阶段，还要结合 Lifecycle 状态，而不是假设存在于 Composition 就一定可见。",
        ],
        kotlinCode: `DisposableEffect(lifecycleOwner) {
    val observer = LifecycleEventObserver { _, event ->
        if (event == Lifecycle.Event.ON_START) analytics.screenVisible()
    }
    lifecycleOwner.lifecycle.addObserver(observer)

    onDispose {
        lifecycleOwner.lifecycle.removeObserver(observer)
    }
}`,
      },
      {
        id: "produce-side-effect",
        eyebrow: "04 · 其他 Effect",
        title: "produceState 桥接回调数据，SideEffect 同步组合结果",
        paragraphs: [
          "produceState 用协程把非 Compose 数据转换为 State，并支持 awaitDispose 清理回调。SideEffect 在一次成功组合提交后执行，适合把当前用户属性同步给分析 SDK；它不能执行昂贵工作。",
          "Effect API 解决的是副作用寿命，不是业务分层。若数据源已有 Flow，优先在 ViewModel 或 collectAsStateWithLifecycle 中收集。",
        ],
        kotlinCode: `@Composable
fun rememberConnectivity(): State<Boolean> =
    produceState(initialValue = false) {
        val callback = networkMonitor.register { connected ->
            value = connected
        }
        awaitDispose { networkMonitor.unregister(callback) }
    }`,
        note: "选择 Effect 前先写清楚：何时启动、什么变化要重启、何时取消、失败交给谁。",
      },
    ],
    exercise: {
      title: "修复四个会重复执行的 Compose 副作用",
      prompt: "页面需要：按 userId 收集消息、点击后显示 Snackbar、注册 Lifecycle 监听、把最新 onTimeout 回调用于 30 秒倒计时。分别选择 LaunchedEffect、rememberCoroutineScope、DisposableEffect、rememberUpdatedState，并说明 key 与取消时机。",
      hint: "不要把四件事都放进 LaunchedEffect(Unit)。每个 Effect 只承担一个寿命边界。",
    },
  },

  "compose-lists-forms-paging": {
    sections: [
      {
        id: "lazy-layout",
        eyebrow: "01 · Lazy 布局",
        title: "LazyColumn 只组合视口附近项目，key 保持项目身份",
        paragraphs: [
          "LazyColumn、LazyRow 与 LazyVerticalGrid 适合大列表。items 的 key 使用稳定业务 id，contentType 帮助不同类型项目复用；不要在 item 内对整份列表做排序或过滤。",
          "滚动状态通过 rememberLazyListState 管理，需要恢复时使用其 Saver。列表数据的排序、筛选和格式化在 ViewModel 状态管线完成。",
        ],
        kotlinCode: `LazyColumn(
    state = listState,
    contentPadding = PaddingValues(vertical = 8.dp),
) {
    items(
        items = users,
        key = UserUi::id,
        contentType = { "user" },
    ) { user ->
        UserRow(user = user, onClick = { onOpen(user.id) })
    }
}`,
      },
      {
        id: "forms-focus",
        eyebrow: "02 · 表单",
        title: "受控输入、IME Action 与焦点共同组成表单体验",
        paragraphs: [
          "TextField 由 value 与 onValueChange 驱动，ViewModel 保存需要恢复和校验的输入，本地 UI 状态保存焦点与密码可见性。不要每个字符都发网络请求，查询可在 ViewModel 中防抖。",
          "使用 KeyboardOptions 和 KeyboardActions 定义键盘类型与 Next/Done 行为，提交后清理焦点；错误信息通过 supportingText 和 isError 与字段关联。",
        ],
        kotlinCode: `OutlinedTextField(
    value = email,
    onValueChange = onEmailChanged,
    label = { Text("邮箱") },
    isError = emailError != null,
    supportingText = { emailError?.let { Text(it) } },
    keyboardOptions = KeyboardOptions(
        keyboardType = KeyboardType.Email,
        imeAction = ImeAction.Next,
    ),
)`,
      },
      {
        id: "paging-compose",
        eyebrow: "03 · Paging Compose",
        title: "collectAsLazyPagingItems 连接 PagingData 与 LazyColumn",
        paragraphs: [
          "ViewModel 暴露 cachedIn 的 Flow<PagingData<UserUi>>，页面调用 collectAsLazyPagingItems。itemKey 与 itemContentType 继续维持项目身份；索引位置可能暂时为 null，要显示占位或跳过。",
          "不要把 LazyPagingItems 放进 ViewModel，它属于 UI 适配器。刷新使用 items.refresh，失败步骤重试使用 items.retry。",
        ],
        kotlinCode: `val users = viewModel.users.collectAsLazyPagingItems()

LazyColumn {
    items(
        count = users.itemCount,
        key = users.itemKey(UserUi::id),
        contentType = users.itemContentType { "user" },
    ) { index ->
        users[index]?.let { user ->
            UserRow(user = user)
        }
    }
}`,
      },
      {
        id: "paging-states",
        eyebrow: "04 · 加载状态",
        title: "首次加载、下拉刷新和追加失败分别渲染",
        paragraphs: [
          "refresh Loading 且没有数据时显示整页加载；已有数据刷新时保留列表并显示轻量指示；append Loading 放在尾部。错误同样按 refresh 与 append 分开，避免追加失败遮住已加载内容。",
          "空态只在 refresh 完成且 itemCount 为零时显示。可将 LoadStateAdapter 语义移植为 Compose 尾部组件，重试按钮调用 retry。",
        ],
        kotlinCode: `when {
    users.loadState.refresh is LoadState.Loading &&
        users.itemCount == 0 -> FullScreenLoading()

    users.loadState.refresh is LoadState.Error &&
        users.itemCount == 0 -> FullScreenError(onRetry = users::retry)

    users.itemCount == 0 -> EmptyUsers()
    else -> UserPagingList(users)
}`,
      },
    ],
    exercise: {
      title: "完成带搜索和错误恢复的 Paging Compose 页面",
      prompt: "实现用户搜索页：300ms 防抖、LazyColumn 稳定 key、滚动位置、邮箱输入 IME、首次/刷新/追加加载状态、空态和 retry。ViewModel 暴露 cachedIn PagingData，Composable 不直接访问 Repository。",
      hint: "先写 Route 收集 query 与 PagingData，再把 LazyPagingItems 传给 Screen；分别判断 refresh 和 append。",
    },
  },

  "navigation-compose": {
    sections: [
      {
        id: "nav-host",
        eyebrow: "01 · NavHost",
        title: "NavHost 集中拥有 NavController，Screen 只接收语义回调",
        paragraphs: [
          "rememberNavController 在应用导航层创建控制器，NavHost 声明起点与目的地。叶子 Screen 不接收 NavController，而接收 onOpenUser、onBack 等回调，保持可复用和可测试。",
          "Route 类型使用 Kotlin Serialization 描述参数，避免手写字符串路径与解析。详情只传 id，状态由目标 ViewModel 恢复。",
        ],
        kotlinCode: `@Serializable data object HomeRoute
@Serializable data class UserRoute(val id: Long)

NavHost(
    navController = navController,
    startDestination = HomeRoute,
) {
    composable<HomeRoute> {
        HomeRoute(onOpenUser = { id ->
            navController.navigate(UserRoute(id))
        })
    }
    composable<UserRoute> { entry ->
        val route = entry.toRoute<UserRoute>()
        UserRoute(userId = route.id, onBack = navController::popBackStack)
    }
}`,
      },
      {
        id: "nested-back-stack",
        eyebrow: "02 · 图与返回栈",
        title: "嵌套图表达流程，popUpTo 表达完成后的栈清理",
        paragraphs: [
          "认证、注册和下单等流程拥有内部目的地，可通过 navigation 建立嵌套图。完成登录后 popUpTo 清除认证流程，避免返回键回到密码页。",
          "每个 NavBackStackEntry 提供生命周期、SavedStateHandle 和 ViewModelStore。共享 ViewModel 要作用域到明确图 Entry，不要默认使用 Activity 范围制造全局状态。",
        ],
        kotlinCode: `navController.navigate(HomeRoute) {
    popUpTo(AuthGraph) {
        inclusive = true
    }
    launchSingleTop = true
    restoreState = true
}`,
      },
      {
        id: "deep-link-state",
        eyebrow: "03 · 深链与恢复",
        title: "深链从任意进程状态进入，目标页必须独立恢复",
        paragraphs: [
          "Deep Link 可能冷启动应用并直接创建详情 Entry，所以详情不能依赖列表页先把对象放入内存。Route id 进入 SavedStateHandle，Room 先提供缓存，再由 Repository 刷新。",
          "外部参数先做范围与权限验证；未登录时记录待恢复目标并进入认证流程。敏感页面还要验证当前账户是否有权限访问对应 id。",
        ],
        kotlinCode: `composable<UserRoute>(
    deepLinks = listOf(
        navDeepLink<UserRoute>(
            basePath = "https://example.com/user",
        ),
    ),
) {
    UserRoute()
}`,
      },
      {
        id: "nav-testing",
        eyebrow: "04 · 测试",
        title: "先测试 Screen 回调，再测试少量真实图行为",
        paragraphs: [
          "Screen 测试点击用户行并断言 onOpenUser 收到正确 id，不需要 NavController。图测试使用 TestNavHostController，设置 ComposeNavigator 后验证当前 Route、参数、返回和 Deep Link。",
          "不要把导航断言分散在每个组件测试里。导航层集中测试图配置，页面集中测试何时发出导航意图。",
        ],
        kotlinCode: `@Test
fun user_click_opens_correct_route() {
    var openedId: Long? = null
    composeRule.setContent {
        UserListScreen(
            users = listOf(UserUi(42, "Ada")),
            onOpenUser = { openedId = it },
        )
    }

    composeRule.onNodeWithText("Ada").performClick()
    assertEquals(42L, openedId)
}`,
      },
    ],
    exercise: {
      title: "搭建类型安全 Compose 导航",
      prompt: "实现 Home、Search、User(id)、Settings 四个目的地与 Auth 嵌套图。User 支持 HTTPS Deep Link；底部导航保存各自状态；登录成功清除 Auth。Screen 不接收 NavController，并写出点击回调与返回栈测试。",
      hint: "Route 类型集中定义；NavHost 负责把 Screen 回调翻译成 navigate/popBackStack。",
    },
  },

  "compose-motion-interoperability": {
    sections: [
      {
        id: "animation-choice",
        eyebrow: "01 · 动画",
        title: "根据变化维度选择最小动画 API",
        paragraphs: [
          "单个属性变化使用 animate*AsState，内容进入退出使用 AnimatedVisibility，两个状态之间整体切换使用 AnimatedContent，多属性同步用 Transition。无限动画才使用 rememberInfiniteTransition。",
          "动画目标来自状态，而不是手写每帧。减少布局尺寸变化带来的整树重测，优先使用 graphicsLayer 等绘制阶段属性，但要通过工具验证是否真的改善。",
        ],
        kotlinCode: `val elevation by animateDpAsState(
    targetValue = if (selected) 8.dp else 1.dp,
    label = "card elevation",
)

AnimatedVisibility(visible = error != null) {
    ErrorBanner(message = error.orEmpty())
}`,
      },
      {
        id: "gestures",
        eyebrow: "02 · 手势",
        title: "优先使用带语义的高层组件，再使用 pointerInput",
        paragraphs: [
          "Button、clickable、scrollable 和 draggable 已处理焦点、语义与常见手势冲突。只有自定义多点或组合手势时才进入 pointerInput。",
          "pointerInput 的 key 决定手势协程何时重启。事件消费会影响父子手势竞争；自定义手势还要补充 Semantics 和键盘操作。",
        ],
        kotlinCode: `Modifier.pointerInput(enabled) {
    if (!enabled) return@pointerInput
    detectTapGestures(
        onLongPress = { position -> onLongPress(position) },
        onDoubleTap = { position -> onZoom(position) },
    )
}`,
      },
      {
        id: "window-insets",
        eyebrow: "03 · Insets",
        title: "系统栏、键盘和刘海属于动态窗口约束",
        paragraphs: [
          "WindowInsets 描述状态栏、导航栏、显示切口和 IME 占用空间。Scaffold contentPadding 与 imePadding、safeDrawingPadding 等 Modifier 要避免重复消费导致双倍留白。",
          "键盘弹出、横屏和多窗口都会改变可用空间。不要根据固定屏幕高度判断键盘，也不要硬编码状态栏像素。",
        ],
        kotlinCode: `Scaffold(
    contentWindowInsets = WindowInsets.safeDrawing,
) { innerPadding ->
    MessageComposer(
        modifier = Modifier
            .padding(innerPadding)
            .imePadding(),
    )
}`,
      },
      {
        id: "interop",
        eyebrow: "04 · View 互操作",
        title: "ComposeView 与 AndroidView 支持按页面渐进迁移",
        paragraphs: [
          "Fragment 可以用 ComposeView 承载新 UI，并设置与 ViewTreeLifecycleOwner 匹配的 CompositionStrategy；Compose 页面也能通过 AndroidView 包装地图、WebView 或尚未迁移的自定义 View。",
          "AndroidView 的 factory 只创建实例，update 根据最新状态更新属性。监听器要避免重复注册，WebView 等资源在释放时显式清理。互操作是迁移桥梁，不应让两套状态系统互相写。",
        ],
        kotlinCode: `AndroidView(
    factory = { context ->
        PlayerView(context).apply {
            useController = true
        }
    },
    update = { view ->
        view.player = player
    },
    onRelease = { view ->
        view.player = null
    },
)`,
      },
    ],
    exercise: {
      title: "把旧详情页渐进迁移到 Compose",
      prompt: "Fragment 暂时保留旧地图 View，其余标题、收藏和错误状态改为 Compose。写出 ComposeView 生命周期策略、AndroidView 的 factory/update/onRelease、收藏动画、IME/系统栏处理，并说明状态只能由哪一侧持有。",
      hint: "ViewModel 仍是唯一业务状态源；Compose 与旧 View 都只渲染同一个 UiState。",
    },
  },

  "compose-adaptive-accessibility": {
    sections: [
      {
        id: "adaptive-window",
        eyebrow: "01 · 自适应窗口",
        title: "根据当前窗口能力布局，不根据设备名称猜测",
        paragraphs: [
          "手机、平板、折叠屏和桌面窗口都可能改变尺寸。自适应 UI 根据 Window Size Class 或 WindowAdaptiveInfo 选择导航和内容结构，而不是判断“是不是平板”。",
          "紧凑宽度显示单页列表，较宽窗口显示列表详情双栏，超宽窗口可加入辅助栏。状态和导航目标保持一致，布局只是同一状态的不同表达。",
        ],
        kotlinCode: `when (windowSizeClass.windowWidthSizeClass) {
    WindowWidthSizeClass.COMPACT ->
        UserListPane(onOpenUser = onOpenUser)

    else ->
        UserListDetailLayout(
            selectedUserId = selectedUserId,
            onSelectUser = onOpenUser,
        )
}`,
      },
      {
        id: "fold-multi-window",
        eyebrow: "02 · 折叠与多窗",
        title: "铰链和窗口变化可能在页面存活期间发生",
        paragraphs: [
          "折叠设备的分隔特征会影响内容能否跨越；多窗口与自由窗口会让尺寸随时变化。Composable 必须由当前状态重新布局，不能只在 Activity 创建时计算一次。",
          "列表详情布局要定义选中项在窄屏返回栈和宽屏双栏间如何迁移。选择 id 可保存，具体 Pane 由当前窗口决定。",
        ],
        kotlinCode: `data class AdaptiveUserState(
    val selectedUserId: Long? = null,
    val listScrollIndex: Int = 0,
)

// 保存业务选择，不保存“当前是双栏”这种派生事实。`,
      },
      {
        id: "semantics",
        eyebrow: "03 · Semantics",
        title: "无障碍和测试都通过语义理解界面",
        paragraphs: [
          "Material 组件自带常见角色和状态，但图标按钮仍要 contentDescription，自定义开关要提供 role、stateDescription 与可执行 action。装饰图片使用 null 描述，避免 TalkBack 朗读无意义内容。",
          "组合头像、名字和描述的卡片可以合并子语义，让读屏一次获得完整信息。不要通过清除语义掩盖真实可操作控件。",
        ],
        kotlinCode: `Modifier.semantics(mergeDescendants = true) {
    role = Role.Button
    stateDescription = if (favorite) "已收藏" else "未收藏"
    onClick(
        label = if (favorite) "取消收藏" else "添加收藏",
        action = {
            onToggleFavorite()
            true
        },
    )
}`,
      },
      {
        id: "accessible-design",
        eyebrow: "04 · 可访问设计",
        title: "触控目标、对比度、文字缩放和遍历顺序一起验收",
        paragraphs: [
          "可点击目标至少保持足够尺寸，颜色不能成为唯一信息，文字放大后不能被固定高度裁切。动态内容更新要用合适 liveRegion，错误与字段建立语义关系。",
          "测试同时包含自动语义断言和 TalkBack 真机走查。自定义 Lazy 列表、复杂图表与手势组件尤其需要检查遍历顺序和替代操作。",
        ],
        kotlinCode: `IconButton(
    onClick = onFavorite,
    modifier = Modifier.minimumInteractiveComponentSize(),
) {
    Icon(
        imageVector = if (favorite) Icons.Filled.Star else Icons.Outlined.Star,
        contentDescription = if (favorite) "取消收藏" else "收藏",
    )
}`,
        note: "自适应不是把内容等比放大；无障碍也不是最后补一条 contentDescription。",
      },
    ],
    exercise: {
      title: "实现手机与平板共用的无障碍列表详情页",
      prompt: "紧凑窗口显示列表→详情导航，宽窗口同时显示两栏。保存 selectedUserId，处理窗口实时变化；用户卡片支持 TalkBack、键盘与 48dp 触控目标。写出布局分支、语义和自动测试断言。",
      hint: "布局模式是派生状态，不写入 ViewModel；选中用户是可恢复状态。",
    },
  },

  "compose-testing-performance": {
    sections: [
      {
        id: "compose-test-rule",
        eyebrow: "01 · UI 测试",
        title: "Compose Test Rule 自动等待界面空闲",
        paragraphs: [
          "测试通过语义树查找节点、执行点击和输入并断言结果。优先使用可见文本、角色和 testTag 等稳定语义，避免依赖内部函数或节点顺序。",
          "createComposeRule 适合纯组件，createAndroidComposeRule 适合需要 Activity、Navigation 或 Hilt 的集成测试。异步状态由可控 Fake 发射，不使用 Thread.sleep。",
        ],
        kotlinCode: `@get:Rule
val composeRule = createComposeRule()

@Test
fun retry_is_shown_after_failure() {
    composeRule.setContent {
        UserScreen(
            state = UserScreenState(errorMessage = "网络失败"),
            onAction = {},
            onBack = {},
        )
    }

    composeRule.onNodeWithText("网络失败").assertIsDisplayed()
    composeRule.onNodeWithText("重试").assertHasClickAction()
}`,
      },
      {
        id: "semantics-screenshot",
        eyebrow: "02 · 语义与截图",
        title: "行为测试验证可用性，截图测试守住视觉回归",
        paragraphs: [
          "Semantics 测试断言角色、状态、描述和 action，可以同时发现无障碍问题。合并语义时使用打印树理解实际节点，不要随意加 testTag 绕过语义设计。",
          "截图测试适合主题、字号、语言和关键设备尺寸组合，但像素差异可能受字体与渲染环境影响，需要固定设备配置并只覆盖稳定组件。",
        ],
        kotlinCode: `composeRule
    .onNode(
        hasRole(Role.Button) and
            hasStateDescription("已收藏"),
    )
    .assertExists()
    .assertHasClickAction()`,
      },
      {
        id: "recomposition-performance",
        eyebrow: "03 · 重组性能",
        title: "先测量状态读取和阶段，再调整稳定性",
        paragraphs: [
          "Layout Inspector、Composition Tracing 和编译器报告可以观察重组与跳过。常见问题包括在组合中排序大列表、向列表传不稳定可变集合、Effect key 每次变化，以及把高频状态读在过高层。",
          "把状态读取下移、使用稳定 key、缓存昂贵派生值并让模型真实不可变。不要用 remember 包住错误架构，也不要因看到重组次数就盲目添加 @Stable。",
        ],
        kotlinCode: `// 上游只在 users/query 真正变化时完成排序
val rows by remember(users, query) {
    derivedStateOf {
        users
            .filter { it.name.contains(query, ignoreCase = true) }
            .sortedBy(User::name)
    }
}`,
      },
      {
        id: "macrobenchmark-baseline",
        eyebrow: "04 · 宏基准与 Baseline Profile",
        title: "启动、滚动和动画要在真实设备进程边界测量",
        paragraphs: [
          "Macrobenchmark 从应用外控制启动和关键用户旅程，测量启动时间、帧耗时等指标。基准使用 release-like、profileable 构建，不能用 Debug 结果代表生产性能。",
          "Baseline Profile 记录关键路径需要预编译的代码，使首次安装后的启动与常用交互更快。Profile 生成后仍要用 Macrobenchmark 比较有无 Profile 的结果，并在 CI 监控回退。",
        ],
        kotlinCode: `@Test
fun coldStartup() = benchmarkRule.measureRepeated(
    packageName = "com.example.app",
    metrics = listOf(StartupTimingMetric()),
    compilationMode = CompilationMode.Partial(),
    startupMode = StartupMode.COLD,
    iterations = 10,
) {
    pressHome()
    startActivityAndWait()
    device.findObject(By.text("用户")).waitForExists(5_000)
}`,
        note: "微优化必须绑定指标：启动、慢帧、内存或耗电。没有前后测量的“优化”不能进入结论。",
      },
    ],
    exercise: {
      title: "为 Compose 用户列表建立质量门禁",
      prompt: "编写三类验证：Screen 行为测试覆盖加载/错误/重试；Semantics 测试覆盖收藏状态与触控；Macrobenchmark 测冷启动和列表滚动，并生成 Baseline Profile。列出重组观测点和优化前后指标。",
      hint: "UI 测试不负责测帧；Macrobenchmark 不负责验证业务文案。每种测试只证明自己的层次。",
    },
  },
};
