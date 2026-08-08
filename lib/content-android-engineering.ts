import type { CompleteChapterContent } from "./content-types";

export const androidEngineeringContent: Record<string, CompleteChapterContent> = {
  "android-patterns": {
    sections: [
      {
        id: "screen-lifecycle",
        eyebrow: "01 · Activity 与 Fragment",
        title: "页面组件负责生命周期和渲染，不承载业务状态",
        paragraphs: [
          "Activity/Fragment 由系统创建和重建，适合解析导航输入、绑定 View、转发用户操作与收集状态。网络请求、缓存选择和业务判断放入 ViewModel/UseCase，避免配置变化后重复执行或让页面难以测试。",
          "Fragment 同时有实例生命周期与 View 生命周期。任何 ViewBinding、Adapter 回调或 View 引用都必须限制在 onCreateView 到 onDestroyView 之间；跨配置变化的数据由 ViewModel 保存。",
        ],
        kotlinCode: `class UserFragment : Fragment(R.layout.fragment_user) {
    private var _binding: FragmentUserBinding? = null
    private val binding get() = requireNotNull(_binding)
    private val viewModel: UserViewModel by viewModels()

    override fun onViewCreated(view: View, state: Bundle?) {
        _binding = FragmentUserBinding.bind(view)
        binding.retry.setOnClickListener { viewModel.onRetry() }
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}`,
      },
      {
        id: "unidirectional-state",
        eyebrow: "02 · ViewModel",
        title: "UI 发送意图，ViewModel 输出单一状态",
        paragraphs: [
          "ViewModel 对外暴露 StateFlow<UiState>，对内处理 onQueryChanged、onRetry 等用户意图。UI 不直接写可变流，也不拼装业务结果；这样状态来源单一，旋转后新 UI 能立刻拿到当前值。",
          "构造函数只注入业务依赖和可替换调度器，不保存 Activity、Fragment 或 View。需要应用资源时注入窄接口或 Application Context 包装器，避免生命周期泄漏。",
        ],
        kotlinCode: `class UserViewModel(
    private val repository: UserRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val userId = savedStateHandle.getStateFlow("userId", 0L)

    val uiState = userId
        .flatMapLatest(repository::observeUser)
        .map<User, UserUiState>(UserUiState::Content)
        .catch { emit(UserUiState.Failed) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UserUiState.Loading)
}`,
      },
      {
        id: "repository-boundary",
        eyebrow: "03 · Repository、Room 与 Retrofit",
        title: "Repository 统一数据语义，而不是简单转发 DAO 与 API",
        paragraphs: [
          "Room 作为本地事实来源持续发出 Flow，Retrofit suspend API 负责刷新远端。Repository 决定缓存优先级、实体映射、事务边界与错误策略，对上层暴露领域模型而非网络 DTO/数据库 Entity。",
          "典型离线优先链路是：UI 始终观察数据库；refresh 请求网络并在事务中写库；Room 更新自动推动 UI。这样旋转、离线和进程重建都不需要手动把回调重新拼起来。",
        ],
        kotlinCode: `class OfflineFirstUserRepository(
    private val api: UserApi,
    private val dao: UserDao,
    private val database: AppDatabase,
) {
    fun observe(id: Long): Flow<User> =
        dao.observe(id).filterNotNull().map(UserEntity::toDomain)

    suspend fun refresh(id: Long) {
        val remote = api.user(id)
        database.withTransaction {
            dao.upsert(remote.toEntity())
        }
    }
}`,
      },
      {
        id: "parcelize-navigation",
        eyebrow: "04 · 导航与序列化",
        title: "页面之间传标识，不复制整份可变业务对象",
        paragraphs: [
          "@Parcelize 能减少 Parcelable 样板，适合确实需要跨组件传输的小型值对象。但 Bundle 有大小限制，复杂对象也可能很快过期；通常只传 userId，再由目标页面从 Repository 观察最新数据。",
          "导航参数进入 ViewModel 后使用 SavedStateHandle 保存。对必填参数尽早 require 或转换为明确失败状态；不要在多个页面散落相同字符串 key。",
        ],
        kotlinCode: `@Parcelize
data class UserRoute(
    val id: Long,
    val source: String,
) : Parcelable

object UserArgs {
    const val USER_ID = "user_id"
}

val userId = savedStateHandle.getStateFlow(UserArgs.USER_ID, 0L)`,
      },
      {
        id: "layering",
        eyebrow: "05 · 分层判断",
        title: "让每层只知道完成职责所需的最少类型",
        paragraphs: [
          "DTO 反映服务端协议，Entity 反映本地表结构，Domain 反映业务概念，UiModel 反映渲染需求。小项目可以合并部分模型，但应基于变化速度与边界决定，而不是机械地为每个字段复制四份类。",
          "扩展函数适合纯映射与格式化；包含 I/O、导航或全局状态的行为应放入有名字、有依赖的类。分层的目标是让变化局部化和测试容易，而不是目录越多越专业。",
        ],
        bullets: [
          "UI：渲染状态、发送用户意图",
          "ViewModel：组合状态、管理页面任务",
          "UseCase：可复用业务规则（需要时再引入）",
          "Repository：协调数据源与一致性",
          "DataSource：执行具体网络、数据库或文件操作",
        ],
      },
    ],
    exercise: {
      title: "设计一个离线优先的详情页",
      prompt: "画出 UserFragment、UserViewModel、UserRepository、UserDao 与 UserApi 的职责，并写出 observe(id) + refresh(id) 主链路。要求旋转不重复丢状态、离线可显示缓存、错误可重试。",
      hint: "UI 只观察 Room 驱动的 StateFlow；refresh 单独更新加载/错误维度并写库。导航只传 id，Fragment 使用 viewLifecycleOwner 收集。",
    },
  },

  capstone: {
    sections: [
      {
        id: "project-scope",
        eyebrow: "01 · 项目目标",
        title: "完成一个支持搜索、缓存、刷新与恢复的用户目录",
        paragraphs: [
          "项目包含搜索列表和用户详情。搜索输入防抖并取消旧请求；列表优先展示 Room 缓存，联网刷新后自动更新；失败时保留旧内容并允许重试；旋转与进程重建后恢复查询词和详情 id。",
          "先写行为验收标准，再搭目录。这样每个类都有可验证的职责：页面是否只渲染、ViewModel 是否输出稳定状态、Repository 是否保证缓存一致性、测试是否能控制时间与错误。",
        ],
        bullets: [
          "输入 300ms 后开始搜索，新输入取消旧搜索",
          "有缓存时立即显示，刷新指示器不遮住旧内容",
          "断网显示可重试错误，恢复后更新本地库",
          "旋转保留状态，进程重建恢复关键输入",
        ],
      },
      {
        id: "project-models",
        eyebrow: "02 · 模型与模块",
        title: "先稳定边界模型，再连接数据链路",
        paragraphs: [
          "项目可从单 app 模块开始，按 ui、domain、data 分包；只有编译隔离或团队边界真实存在时再拆 Gradle 模块。DTO、Entity、Domain、UiModel 各自属于边界，映射函数保持纯函数。",
          "搜索页面状态用 data class 表示可并存维度：query、items、isRefreshing、error；初次无内容加载可由 items 为空且 isRefreshing 推导，或单独 sealed 分支。避免五个相互矛盾的 Boolean。",
        ],
        kotlinCode: `data class SearchUiState(
    val query: String = "",
    val items: List<UserRow> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
) {
    val showInitialLoading: Boolean
        get() = isRefreshing && items.isEmpty()
}

@JvmInline value class UserId(val value: Long)`,
      },
      {
        id: "project-data",
        eyebrow: "03 · 网络、数据库与事务",
        title: "数据库作为可观察事实来源，网络负责更新事实",
        paragraphs: [
          "DAO 提供 Flow<List<UserEntity>> 查询与 suspend upsert。API 返回 UserDto。Repository 的 search(query) 观察数据库并映射领域模型；refresh(query) 请求远端，在事务中替换对应查询结果与同步时间。",
          "如果列表与查询是多对多关系，需要 UserEntity、SearchResultCrossRef 与 SearchMetadata，而不是每次搜索覆盖整张用户表。事务确保关联与时间戳同时更新，收集者不会看到半完成状态。",
        ],
        kotlinCode: `@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE name LIKE '%' || :query || '%' ORDER BY name")
    fun observeSearch(query: String): Flow<List<UserEntity>>

    @Upsert
    suspend fun upsertAll(users: List<UserEntity>)
}

class UserRepository(
    private val api: UserApi,
    private val dao: UserDao,
    private val database: AppDatabase,
) {
    fun search(query: String): Flow<List<User>> =
        dao.observeSearch(query).map { rows -> rows.map(UserEntity::toDomain) }

    suspend fun refresh(query: String) {
        val remote = api.search(query)
        database.withTransaction { dao.upsertAll(remote.map(UserDto::toEntity)) }
    }
}`,
      },
      {
        id: "project-viewmodel",
        eyebrow: "04 · ViewModel 与 StateFlow",
        title: "查询词驱动数据流，刷新作为可取消动作并入状态",
        paragraphs: [
          "SavedStateHandle 保存 query。查询流 trim、debounce、distinctUntilChanged 后 flatMapLatest 到 Repository，旧查询自动取消。缓存结果与刷新状态 combine 成唯一 UI State。",
          "refresh 仍是显式用户动作：ViewModel 取消旧刷新 Job，设置 isRefreshing，调用 Repository，最后在当前查询仍匹配时清理状态。错误转换为用户可读消息，同时日志保存原 Throwable。",
        ],
        kotlinCode: `private val query = savedStateHandle.getStateFlow("query", "")
private val refreshState = MutableStateFlow<RefreshState>(RefreshState.Idle)

private val rows = query
    .map(String::trim)
    .debounce(300)
    .distinctUntilChanged()
    .flatMapLatest { text ->
        if (text.length < 2) flowOf(emptyList())
        else repository.search(text)
    }
    .map { users -> users.map(User::toRow) }

val uiState = combine(query, rows, refreshState) { text, items, refresh ->
    SearchUiState(
        query = text,
        items = items,
        isRefreshing = refresh is RefreshState.Running,
        errorMessage = (refresh as? RefreshState.Failed)?.message,
    )
}.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), SearchUiState())`,
      },
      {
        id: "project-ui",
        eyebrow: "05 · 生命周期安全 UI",
        title: "一个 render 函数覆盖所有可见状态",
        paragraphs: [
          "Fragment 在 viewLifecycleOwner.repeatOnLifecycle 中收集 uiState。文本变化只调用 onQueryChanged；列表使用 ListAdapter + DiffUtil；重试按钮调用 onRetry。render 是幂等的，同一状态执行多次不会触发重复请求或导航。",
          "加载、空列表、旧内容刷新和错误同时存在时要明确优先级。初次加载显示骨架；有旧内容刷新只显示小型进度；失败且有旧内容显示 Snackbar/行内提示；失败且无内容显示整页重试。",
        ],
        kotlinCode: `private fun render(state: SearchUiState) = with(binding) {
    progress.isVisible = state.showInitialLoading
    swipeRefresh.isRefreshing = state.isRefreshing && state.items.isNotEmpty()
    empty.isVisible = !state.isRefreshing && state.items.isEmpty() && state.errorMessage == null
    errorGroup.isVisible = state.items.isEmpty() && state.errorMessage != null
    errorText.text = state.errorMessage
    adapter.submitList(state.items)
}

viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect(::render)
    }
}`,
      },
      {
        id: "project-tests",
        eyebrow: "06 · 测试与验收",
        title: "测试数据语义、时间语义和生命周期边界",
        paragraphs: [
          "Repository 测试使用内存 Room 与 Fake API，验证缓存先出现、刷新写库、失败不删除旧数据。ViewModel 使用 runTest 与共享 testScheduler，验证防抖、新查询取消旧查询、重试和 SavedStateHandle 恢复。",
          "UI 测试不重复证明所有 Flow 操作符，只验证关键用户路径：输入、加载、结果、错误、重试和旋转。上线前再检查慢网、无网、空结果、大列表、快速连续输入与后台切换。",
        ],
        kotlinCode: `@Test
fun new_query_cancels_previous_search() = runTest {
    val repository = ControlledUserRepository()
    val viewModel = SearchViewModel(repository, SavedStateHandle(), dispatcher)

    viewModel.onQueryChanged("ko")
    advanceTimeBy(299)
    viewModel.onQueryChanged("kotlin")
    advanceTimeBy(300)
    runCurrent()

    assertEquals(listOf("kotlin"), repository.startedQueries)
}`,
      },
    ],
    exercise: {
      title: "按六个提交完成项目",
      prompt: "依次提交模型与验收标准、Room 缓存、Retrofit 刷新、Repository 一致性、ViewModel StateFlow、Fragment 与测试。每个提交都能编译并附一条关键测试。",
      hint: "不要先写完整 UI 再补数据层。每完成一个边界就用 Fake 验证：DAO Flow、刷新事务、防抖取消、生命周期收集和错误恢复。",
    },
  },

  performance: {
    sections: [
      {
        id: "allocations-boxing",
        eyebrow: "01 · 隐藏分配与装箱",
        title: "先定位热点，再关注 Lambda、临时集合和装箱",
        paragraphs: [
          "Kotlin 语法可能生成函数对象、迭代器、临时集合、Continuation 与装箱值，但大部分业务路径并不值得手工微优化。先用 Android Studio Profiler、系统跟踪或基准测试找到频繁执行且耗时/分配明显的路径。",
          "泛型中的 Int、Long 和 value class 在某些边界会装箱。大量数值循环可优先使用原生数组与简单 for；高阶函数在普通非内联 API 中可能分配。正确性和可读性仍是默认目标。",
        ],
        code: {
          title: "热点循环保持简单",
          java: `long sum = 0;
for (int value : values) {
    sum += value;
}`,
          kotlin: `var sum = 0L
for (value in values) { // IntArray 避免元素装箱
    sum += value
}`, 
        },
      },
      {
        id: "collection-performance",
        eyebrow: "02 · 集合性能",
        title: "惰性流水线不是免费午餐，数据结构选择往往更重要",
        paragraphs: [
          "多步 List 操作会创建中间集合，Sequence 可以减少分配，但每个元素多一层调用。对小列表，直接集合操作通常更快也更清楚；对大数据长链或 take 少量结果，Sequence 更可能受益。",
          "先选正确数据结构：频繁按 id 查找应建立 Map，而不是每次 firstOrNull 扫描 List；DiffUtil 需要稳定 id 与不可变项；重复格式化可在 ViewModel 预计算或有限缓存。",
        ],
        kotlinCode: `val usersById = users.associateBy(User::id)
val selected = usersById[selectedId] // O(1) 期望查找

val topRows = users.asSequence()
    .filter(User::isActive)
    .map(User::toRow)
    .take(20)
    .toList()`,
      },
      {
        id: "coroutine-flow-debug",
        eyebrow: "03 · 协程与 Flow 调试",
        title: "给协程命名，观察订阅数量和取消路径",
        paragraphs: [
          "CoroutineName、结构化日志与调试器能把协程树和线程切换呈现出来。排查“请求重复”时先统计 Flow 上游启动次数、stateIn/shareIn 的 Scope 和 SharingStarted，而不是只看 collect 处。",
          "Flow 链可用 onStart、onEach、onCompletion 记录关键边界，但不要在生产环境打印每个高频值。对长时间任务记录 requestId、查询词、Job 生命周期与取消原因，才能区分重复订阅、重试和用户主动刷新。",
        ],
        kotlinCode: `repository.observeFeed()
    .onStart { logger.debug("feed subscribe") }
    .onEach { feed -> metrics.recordSize(feed.items.size) }
    .onCompletion { cause -> logger.debug("feed complete", cause) }
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), Feed.Empty)`,
        note: "catch 不应只记录后返回空列表，这会把真实故障伪装成“没有数据”。日志与 UI 状态要同时保留错误语义。",
      },
      {
        id: "maintainability",
        eyebrow: "04 · 代码规范",
        title: "让约束可见，比追求最短写法更重要",
        paragraphs: [
          "默认 val、明确空值、短函数、不可变状态和窄扩展能降低认知成本。作用域函数嵌套、过度运算符重载、隐藏 I/O 的属性委托和无边界协程会让代码“很 Kotlin”却很难维护。",
          "团队规范应由 ktlint/detekt 等自动检查机械规则，把评审精力留给数据所有权、取消语义和 API 设计。性能规则也要有测量依据，避免全局禁用 map、data class 或协程。",
        ],
        bullets: [
          "公共 API 写清返回类型与失败语义",
          "挂起函数保证 main-safe，Scope 明确所有者",
          "Flow 标注冷/热、重放和共享策略",
          "基准测试证明优化，回归测试保护行为",
        ],
      },
    ],
    exercise: {
      title: "诊断一个重复请求与列表卡顿问题",
      prompt: "页面每次旋转都多一次网络请求，onBind 还进行日期解析。列出观测点、最可能原因、修复方案和验证指标。",
      hint: "检查冷 Flow 是否被多个收集者重复启动、stateIn 的 Scope/SharingStarted；把格式化移到上游 UI 模型。用请求计数、绑定耗时和分配数据验证。",
    },
  },

  "kotlin-21-k2": {
    sections: [
      {
        id: "k2-model",
        eyebrow: "01 · K2 编译器",
        title: "K2 更换的是编译器前端，不是 JVM 运行模型",
        paragraphs: [
          "K2 是 Kotlin 新编译器前端，负责解析、类型推断、语义分析与诊断，并为不同后端提供统一中间表示。Kotlin 2.0 起成为稳定主线，2.1 继续改进性能、诊断与语言能力。你的 suspend 仍编译为状态机，空安全仍依靠类型系统与运行时检查。",
          "升级后最先感受到的通常是 IDE 分析与编译诊断变化。旧代码中依赖模糊重载、错误智能转换或编译器漏洞的写法可能暴露出来；应修正源码约束，而不是盲目关闭新前端。",
        ],
        bullets: [
          "前端：语法、类型推断、调用解析与诊断",
          "后端：JVM/JS/Native 代码生成",
          "IDE：尽量复用同一分析基础设施",
          "迁移重点：插件兼容、诊断变化、构建性能",
        ],
      },
      {
        id: "language-updates",
        eyebrow: "02 · Kotlin 2.1 语言变化",
        title: "稳定特性直接使用，预览特性先查状态再启用",
        paragraphs: [
          "Kotlin 2.1 延续 K2 主线，并提供若干需显式启用或仍处预览阶段的语言能力，例如 when 守卫条件、非局部 break/continue 与多美元符号字符串插值等。预览特性的语法和兼容性可能继续变化，不应未经评估进入核心生产 API。",
          "学习时先掌握稳定的类型、协程与 Flow 模型；评估新特性时查看对应 Kotlin 版本的官方兼容性说明和 languageVersion。不要仅因 IDE 能补全就假设团队构建、静态分析和代码生成插件都已支持。",
        ],
        kotlinCode: `// 示例：when 守卫条件在对应版本中可能需要显式语言特性开关
fun render(status: Status) = when (status) {
    is Status.Ready if status.items.isEmpty() -> "暂无内容"
    is Status.Ready -> "共 ${'$'}{status.items.size} 条"
    Status.Loading -> "加载中"
}

// 项目是否启用，以当前 Kotlin 版本官方说明为准`,
        note: "本章不把预览语法作为前面课程的必需写法；生产项目升级时以官方 release notes、AGP/Compose 兼容矩阵为准。",
      },
      {
        id: "gradle-configuration",
        eyebrow: "03 · Android 构建配置",
        title: "把 Kotlin、AGP、JDK、Compose 与处理器视为一组工具链",
        paragraphs: [
          "升级 Kotlin 插件前，先确认 Android Gradle Plugin、Gradle、JDK、Compose compiler plugin、KSP/KAPT 与主要静态分析插件的兼容范围。Kotlin 2.x 的 Compose 项目通常使用 org.jetbrains.kotlin.plugin.compose，由插件统一管理编译器版本。",
          "使用 JVM toolchain 与 compilerOptions 明确目标，避免本机 JDK 与 CI 不一致。迁移已弃用的 kotlinOptions 写法，并把自由编译参数集中管理；不要在每个模块复制不同设置。",
        ],
        kotlinCode: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

kotlin {
    jvmToolchain(17)
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}`,
      },
      {
        id: "upgrade-checklist",
        eyebrow: "04 · 升级流程",
        title: "一次只跨一个可解释的版本边界",
        paragraphs: [
          "先在独立分支记录基线：clean build、增量编译、单元测试、Lint/KSP 与 APK 行为。更新兼容版本后清理已知弃用，重新生成代码，比较警告和构建时间。不要同时升级所有依赖并重构业务，否则失败时无法定位。",
          "混合 Java/Kotlin 项目还要检查空值注解、JVM 默认方法、泛型通配符和反射/序列化行为。发布前在真实设备验证冷启动、关键页面、协程取消与 Room 迁移，并保留可回滚版本。",
        ],
        bullets: [
          "阅读目标版本 release notes 与兼容指南",
          "确认 AGP、Gradle、JDK、Compose、KSP/插件矩阵",
          "本地与 CI 执行 clean/incremental build、测试、Lint",
          "对比编译诊断、生成代码、性能和 APK 行为",
          "小批发布并准备回滚",
        ],
      },
    ],
    exercise: {
      title: "为现有 Android 项目写 Kotlin 2.1 升级单",
      prompt: "列出当前 Kotlin、AGP、Gradle、JDK、Compose、KSP 与主要插件版本；查明兼容目标，设计分步提交与回滚点，并记录升级前后的构建时间和测试结果。",
      hint: "先升级工具链配置并保持业务代码不变，再单独处理新诊断和弃用。预览语言特性放在独立可撤销提交中。",
    },
  },

  "interview-review": {
    sections: [
      {
        id: "answer-framework",
        eyebrow: "01 · 回答框架",
        title: "用定义、机制、场景、取舍四层回答技术题",
        paragraphs: [
          "先用一句话定义概念，再解释编译器或运行机制，接着放进 Android 真实场景，最后说清选择边界与常见误区。这样既证明理解原理，也不会停在背诵 API。",
          "例如“suspend 是否切线程”：定义是函数可以挂起；机制是 Continuation 状态机；场景是 ViewModel 从 Main 调 Repository；取舍是底层阻塞操作由实现 withContext(IO)，suspend 本身不保证线程。",
        ],
        kotlinCode: `回答模板：
1. 定义：它解决什么问题
2. 机制：编译器/运行时怎样实现
3. 场景：Android 中在哪里使用
4. 取舍：何时不用、常见误区

追问时补充：失败、取消、生命周期、测试与性能`,
      },
      {
        id: "language-review",
        eyebrow: "02 · 类型与语言",
        title: "从约束解释空安全、data、sealed、扩展与泛型",
        paragraphs: [
          "String 与 String? 把空值约束放入类型；data class 依据主构造属性表达值相等与 copy；sealed 类型让有限分支可穷举；扩展是静态分派语法；in/out 通过限制读写方向获得安全型变。",
          "高频追问往往在边界：val 是否不可变、copy 是否深复制、!! 是否可能 NPE、List 是否绝对不可变、扩展能否被 override、reified 是否消除所有擦除。回答时先给结论，再用最小反例证明。",
        ],
        bullets: [
          "val 固定引用，不保证对象深层不可变",
          "data class copy 是浅复制",
          "扩展由编译期接收者类型静态选择",
          "List 是只读视图，不必然是不可变实现",
          "reified 只在内联调用点保留可用类型信息",
        ],
      },
      {
        id: "coroutine-review",
        eyebrow: "03 · 协程",
        title: "把挂起、结构、取消和异常连成一张模型",
        paragraphs: [
          "协程是由 Scope/Context 管理的可暂停任务，suspend 编译为 Continuation 状态机。Job 组成父子树，父等待子，取消向下传播，普通子失败向上取消；监督关系用于隔离独立兄弟。",
          "取消依赖挂起点或 ensureActive；launch 与 async 的结果/异常观察方式不同；CoroutineExceptionHandler 只做根协程兜底。Android 的核心是 Scope 生命周期与 main-safe API。",
        ],
        kotlinCode: `suspend fun load(): Screen = coroutineScope {
    val user = async { repository.user() }
    val settings = async { repository.settings() }
    Screen(user.await(), settings.await())
}

// 任一失败：取消兄弟并把异常交给调用方
// 调用方取消：两个子任务一起取消`,
      },
      {
        id: "flow-review",
        eyebrow: "04 · Flow",
        title: "先回答冷/热，再回答上下文、背压和生命周期",
        paragraphs: [
          "普通 Flow 是冷流，每次 collect 重跑上游；StateFlow 有当前状态并合并相等值；SharedFlow 广播并按 replay/缓冲配置历史。stateIn/shareIn 在指定 Scope 中共享冷流。",
          "flowOn 只影响上方，buffer 保留值并并发上下游，conflate 只保留最新待处理值，collectLatest 取消旧处理。Android UI 使用 repeatOnLifecycle 或 collectAsStateWithLifecycle。",
        ],
        bullets: [
          "combine：任一更新时组合最新值；zip：一一配对",
          "flatMapLatest：新输入取消旧内部流",
          "catch：只捕获上游异常",
          "StateFlow：状态；SharedFlow/Channel：按广播与消费语义选择事件",
        ],
      },
      {
        id: "android-review",
        eyebrow: "05 · Android 架构",
        title: "从数据所有权解释 ViewModel、Repository 与缓存",
        paragraphs: [
          "UI 只渲染 UiState 并上报意图；ViewModel 组合页面状态和管理页面任务；Repository 统一网络与本地数据语义；Room 可作为离线优先事实来源。导航传 id，SavedStateHandle 保存关键输入。",
          "架构题没有越多层越好的答案。说明变化边界、生命周期、线程安全、错误恢复与测试代价，再给出当前规模下的选择，才是工程判断。",
        ],
        kotlinCode: `UI intent
    -> ViewModel
    -> Repository.refresh()
    -> Api + Room transaction
    -> Room Flow
    -> StateFlow<UiState>
    -> lifecycle-safe render`,
      },
      {
        id: "question-bank",
        eyebrow: "06 · 模拟追问",
        title: "用反例检查自己是否真的理解",
        paragraphs: [
          "每道题先口述 60 秒，再写一个最小代码例子，最后主动补充取舍。录下回答，删掉“可能、差不多、就是异步”等模糊词，把结论落到类型、Job、线程或订阅行为。",
          "如果答不上来，回到对应章节重做练习，而不是继续背答案。能预测一段代码在旋转、取消、并发失败和慢收集者下的行为，才算把知识变成了模型。",
        ],
        bullets: [
          "suspend 为什么不能从普通函数直接调用？",
          "supervisorScope 中 async 失败在哪里抛出？",
          "StateFlow 为什么可能跳过中间值？",
          "flowOn 与 withContext 的边界有什么不同？",
          "Fragment 为什么使用 viewLifecycleOwner？",
          "什么时候 Room 应作为 single source of truth？",
        ],
      },
    ],
    exercise: {
      title: "完成一轮 30 分钟模拟面试",
      prompt: "从语言、泛型、协程、Flow、Android 各抽两题。每题按定义—机制—场景—取舍回答 90 秒，再让同伴或录音追问取消、异常、生命周期与测试。",
      hint: "评分只看四点：结论是否准确、机制是否闭环、Android 例子是否真实、是否主动说出不用它的情况。薄弱题回到章节练习而不是背标准句。",
    },
  },
};
