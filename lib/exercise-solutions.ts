type ExerciseSolution = {
  solution: string;
  solutionExplanation: string;
};

export const exerciseSolutions: Record<string, ExerciseSolution> = {
  "meet-kotlin": {
    solution: `// 顶层函数不需要再放进 UserUtils 类
fun userLabel(id: Long) = "user-$id"

val label = userLabel(42L) // 输出：user-42`,
    solutionExplanation: "参数默认不可重新赋值；单表达式函数可以让编译器推断 String 返回类型。字符串模板比手动拼接更直接。",
  },

  "types-and-control-flow": {
    solution: `fun httpLabel(code: Int): String = when (code) {
    // 区间分支必须写在具体失败码之外
    in 200..299 -> "成功"
    401 -> "请登录"
    else -> "失败"
}

val label = httpLabel(204) // 成功`,
    solutionExplanation: "when 直接作为返回表达式，因此不需要临时变量；else 负责覆盖所有剩余状态码。",
  },

  functions: {
    solution: `fun loadData(
    page: Int = 1,
    refresh: Boolean = false,
    showLoading: Boolean = true,
) {
    // 调用方只覆盖真正关心的选项
    println("page=$page, refresh=$refresh, loading=$showLoading")
}

loadData()
loadData(page = 2)
loadData(refresh = true, showLoading = false)`,
    solutionExplanation: "默认参数消除了成组重载；具名参数避免调用处出现难以理解的 true、false 和数字序列。",
  },

  "null-safety": {
    solution: `fun Activity.readUserAndRender() {
    val userId: Long = intent
        .getStringExtra("user_id")
        ?.toLongOrNull() // 格式错误时返回 null，而不是抛异常
        ?: return finish() // 缺失或非法时提前结束页面

    renderUser(userId)
}`,
    solutionExplanation: "安全调用负责传播 null，Elvis 在链尾统一处理失败路径；整个实现不需要 !!，也不会产生 NumberFormatException。",
  },

  classes: {
    solution: `class Account(
    val id: Long,
    name: String,
) {
    // 对象创建后，公开数据始终满足约束
    val name: String = name.trim()

    init {
        require(id > 0) { "id 必须大于 0" }
        require(this.name.isNotEmpty()) { "name 不能为空" }
    }
}

interface AccountSource {
    fun find(id: Long): Account?
}

class FakeAccountSource(
    accounts: List<Account>,
) : AccountSource {
    // 构造时建立索引，查询不需要反复遍历列表
    private val accountsById = accounts.associateBy(Account::id)

    override fun find(id: Long): Account? = accountsById[id]
}`,
    solutionExplanation: "主构造函数收集对象成立所需数据，init 校验不变量；接口只描述查询能力，Fake 实现通过构造函数接收测试数据。",
  },

  properties: {
    solution: `class InboxViewModel : ViewModel() {
    private val _unreadCount = MutableStateFlow(0)

    // UI 只能观察，不能直接修改内部可变流
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    fun increment() {
        _unreadCount.update { current -> current + 1 }
    }

    fun markAllRead() {
        _unreadCount.value = 0
    }
}`,
    solutionExplanation: "幕后属性把修改权留在 ViewModel 内；update 以原子方式根据旧值计算新值，适合并发更新。",
  },

  "data-modeling": {
    solution: `sealed interface SearchUiState {
    data object Idle : SearchUiState
    data object Loading : SearchUiState
    data class Content(val results: List<UserRow>) : SearchUiState
    data object Empty : SearchUiState
    data class Failed(val message: String) : SearchUiState
}

fun render(state: SearchUiState) = when (state) {
    SearchUiState.Idle -> showSearchHint()
    SearchUiState.Loading -> showLoading()
    is SearchUiState.Content -> showResults(state.results)
    SearchUiState.Empty -> showEmpty()
    is SearchUiState.Failed -> showError(state.message)
    // sealed 类型已穷举，不需要隐藏遗漏分支的 else
}`,
    solutionExplanation: "五个互斥阶段无法再形成冲突组合；新增状态时，编译器会指出所有尚未处理的 when。",
  },

  lambdas: {
    solution: `fun <T, R> transform(
    items: List<T>,
    mapper: (T) -> R,
): List<R> = items.map(mapper)

data class User(val id: Long, val name: String)
data class UserRow(val id: Long, val title: String)

fun toUserRow(user: User): UserRow =
    UserRow(id = user.id, title = user.name)

// 写法一：显式 Lambda，适合需要额外逻辑时
val rowsByLambda = transform(users) { user ->
    UserRow(user.id, user.name.uppercase())
}

// 写法二：复用已有函数
val rowsByReference = transform(users, ::toUserRow)`,
    solutionExplanation: "mapper 把每个 T 转成 R。函数引用适合原样复用已有行为，Lambda 更适合在调用处增加一小段转换逻辑。",
  },

  "scope-functions": {
    solution: `fun detailIntent(context: Context, id: Long): Intent =
    Intent(context, DetailActivity::class.java).apply {
        // apply 返回配置后的 Intent 本身
        putExtra(EXTRA_ID, id)
    }

fun userName(user: User?): String =
    user?.let { value ->
        // let 返回 Lambda 的计算结果
        value.name.trim()
    } ?: "匿名用户"

fun loggedRequest(request: Request): Request =
    request.also { value ->
        // also 只做附加日志，仍返回原 Request
        logger.debug("request=$value")
    }`,
    solutionExplanation: "三个选择都由返回值决定：apply/also 返回接收者，let 返回计算结果；显式命名 value 可避免嵌套时混淆 it。",
  },

  collections: {
    solution: `data class Contact(val id: Long, val name: String?, val active: Boolean)
data class ContactRow(val id: Long, val title: String)

val rowsByInitial: Map<String, List<ContactRow>> = contacts
    .filter(Contact::active) // 先去掉停用联系人
    .sortedBy { contact -> contact.name.orEmpty() }
    .map { contact ->
        ContactRow(
            id = contact.id,
            title = contact.name?.takeIf(String::isNotBlank) ?: "未命名",
        )
    }
    .groupBy { row ->
        // 没有可用首字母时统一进入 # 组
        row.title.firstOrNull()?.uppercase() ?: "#"
    }`,
    solutionExplanation: "每一步只承担一种数据变换，最终类型直接表达“首字母到联系人行列表”的映射。",
  },

  generics: {
    solution: `interface Reader<out T> {
    // out T 只从接口中产出
    fun read(): T
}

interface Writer<in T> {
    // in T 只被接口消费
    fun write(value: T)
}

open class Animal
class Dog : Animal()

val dogReader: Reader<Dog> = createDogReader()
val animalReader: Reader<Animal> = dogReader

val animalWriter: Writer<Animal> = createAnimalWriter()
val dogWriter: Writer<Dog> = animalWriter`,
    solutionExplanation: "Reader<Dog> 可以安全当作 Reader<Animal>，因为它只会产出更具体的 Dog；能写 Animal 的 Writer 当然也能写 Dog。",
  },

  "inline-and-reified": {
    solution: `class Json {
    fun <T : Any> decode(text: String, type: KClass<T>): T {
        // 实际项目由 JSON 框架根据 KClass 完成解析
        return decodeWithType(text, type)
    }
}

inline fun <reified T : Any> Json.decode(text: String): T =
    decode(text, T::class) // 调用点保留 T 的具体类型

val user: User = json.decode(payload)

// 注意：仅有 KClass 时，List<User> 的 User 类型仍可能被擦除
// 复杂嵌套泛型通常需要 typeOf<T>() 或框架的 TypeToken`,
    solutionExplanation: "reified 让内联函数体可以访问 T::class，但不会自动保留所有嵌套泛型参数；要结合所用 JSON 框架的类型令牌能力。",
  },

  delegation: {
    solution: `class StringPreference(
    private val preferences: SharedPreferences,
    private val defaultValue: String = "",
    private val explicitKey: String? = null,
) : ReadWriteProperty<Any?, String> {
    override fun getValue(thisRef: Any?, property: KProperty<*>): String {
        val key = explicitKey ?: property.name
        return preferences.getString(key, defaultValue) ?: defaultValue
    }

    override fun setValue(
        thisRef: Any?,
        property: KProperty<*>,
        value: String,
    ) {
        val key = explicitKey ?: property.name
        // apply 异步提交，避免阻塞当前线程
        preferences.edit().putString(key, value).apply()
    }
}

var displayName: String by StringPreference(preferences, defaultValue = "访客")`,
    solutionExplanation: "属性名可作为默认 key，显式 key 用于兼容既有数据。SharedPreferences 不适合直接保存口令、令牌等敏感明文。",
  },

  "annotations-reflection": {
    solution: `@Target(AnnotationTarget.FIELD)
@Retention(AnnotationRetention.RUNTIME)
annotation class ValidEmail

@Target(AnnotationTarget.PROPERTY_GETTER)
@Retention(AnnotationRetention.RUNTIME)
annotation class Logged

data class RegisterRequest(
    // 校验框架扫描 JVM Field
    @field:ValidEmail
    // 日志框架扫描 getter 方法
    @get:Logged
    val email: String,
)

// Java 反射读取字段：getDeclaredField("email")
// Kotlin 反射读取 getter：RegisterRequest::email.getter`,
    solutionExplanation: "use-site target 明确同一个 Kotlin 属性上的注解最终落到字段还是 getter，避免框架扫描错位置。",
  },

  "java-interop": {
    solution: `class ImageRequest @JvmOverloads constructor(
    val url: String,
    val width: Int = 0,
    val height: Int = 0,
) {
    init {
        require(url.isNotBlank()) { "url 不能为空" }
    }

    @Throws(IOException::class)
    fun load(): ByteArray {
        // Java 调用方会在签名中看到 throws IOException
        return networkClient.download(url, width, height)
    }

    companion object {
        @JvmStatic
        fun createDefault(url: String): ImageRequest = ImageRequest(url)
    }
}

// Java 调用示例：
// 一个参数：new ImageRequest(url);
// 两个参数：new ImageRequest(url, 320);
// 三个参数：new ImageRequest(url, 320, 180);
// 静态工厂：ImageRequest.createDefault(url);`,
    solutionExplanation: "@JvmOverloads 生成连续尾部默认参数的重载，@JvmStatic 提供真正的静态入口，@Throws 把异常契约写入 JVM 签名。",
  },

  "coroutine-mental-model": {
    solution: `suspend fun syncUser(id: Long): User {
    // 状态 0：开始执行，不需要保存局部变量
    val cached = cache.read(id) // 挂起点 1：阻塞文件实现应在内部切到 IO

    // 状态 1：恢复后需要继续保存 cached
    if (cached?.isFresh == true) return cached
    val remote = api.load(id) // 挂起点 2：异步 Retrofit 通常无需额外切线程

    // 状态 2：恢复后需要保存 remote，随后写入数据库
    database.save(remote) // 挂起点 3：Room 自己管理查询线程
    return remote
}

// Continuation 概念上保存：label、cached、remote 和最终调用者`,
    solutionExplanation: "每个挂起调用把函数切成一个状态；只保存恢复后仍要使用的局部变量。Dispatcher 由底层是否阻塞决定，不由 suspend 关键字决定。",
  },

  "coroutine-context": {
    solution: `suspend fun loadScreen(
    rawFile: File,
    api: UserApi,
    io: CoroutineDispatcher,
    default: CoroutineDispatcher,
): ScreenModel {
    // 同步文件读取会阻塞，因此放到 IO
    val bytes = withContext(io) { rawFile.readBytes() }

    // 大数据排序是 CPU 任务，因此放到 Default
    val ranking = withContext(default) { calculateRanking(bytes) }

    // Retrofit suspend API 已异步化，直接调用即可
    val user = api.loadUser()

    // 返回后由 Main 上的调用方更新 TextView
    return ScreenModel(user, ranking)
}

viewModelScope.launch {
    binding.title.text = loadScreen(file, api, io, default).title
}`,
    solutionExplanation: "让 suspend API 自己保证 main-safe；调用方只需在 Main 收结果并更新 UI，不必了解每个数据源的线程细节。",
  },

  "structured-concurrency": {
    solution: `suspend fun loadHome(): Home = coroutineScope {
    // 用户信息是必需数据，失败时整个首页失败
    val user = userApi.load()

    supervisorScope {
        // 两个可选区域各自把失败转换为空数据
        val recommendations = async {
            runCatching { recommendationApi.load(user.id) }
                .getOrElse { error ->
                    logger.warn("推荐加载失败", error)
                    emptyList()
                }
        }
        val announcements = async {
            runCatching { announcementApi.load() }
                .getOrElse { error ->
                    logger.warn("公告加载失败", error)
                    emptyList()
                }
        }

        Home(user, recommendations.await(), announcements.await())
    }
}`,
    solutionExplanation: "外层保持“必需数据失败即失败”，监督作用域只隔离彼此独立的可选区域；每个 async 的异常仍在内部明确转换。",
  },

  "cancellation-and-errors": {
    solution: `suspend fun searchRecords(
    records: List<Record>,
    query: String,
    default: CoroutineDispatcher,
): List<Record> = withContext(default) {
    records.filter { record ->
        // CPU 循环没有天然挂起点，需要主动检查取消
        ensureActive()
        record.matches(query)
    }
}

suspend fun safeSearch(query: String): SearchResult = try {
    SearchResult.Content(searchRecords(records, query, default))
} catch (cancelled: CancellationException) {
    // 取消是协程控制信号，必须继续向上传播
    throw cancelled
} catch (error: IOException) {
    SearchResult.Failed("读取数据失败")
}`,
    solutionExplanation: "ensureActive 让新查询能及时停止旧 CPU 工作；CancellationException 不能被转换成空结果，否则上层会误以为旧搜索正常完成。",
  },

  "channels-and-testing": {
    solution: `class DebouncedSaver(
    private val scope: CoroutineScope,
    private val save: suspend (String) -> Unit,
) {
    private var pending: Job? = null

    fun onTextChanged(value: String) {
        pending?.cancel() // 新输入取消旧计时
        pending = scope.launch {
            delay(500)
            save(value)
        }
    }
}

@Test
fun only_the_latest_value_is_saved() = runTest {
    val saved = mutableListOf<String>()
    val saver = DebouncedSaver(this, saved::add)

    saver.onTextChanged("K")
    advanceTimeBy(300)
    saver.onTextChanged("Kotlin")

    advanceTimeBy(499)
    runCurrent()
    assertTrue(saved.isEmpty()) // 还未到 500ms

    advanceTimeBy(1)
    runCurrent()
    assertEquals(listOf("Kotlin"), saved)
}`,
    solutionExplanation: "测试作用域使用虚拟时间，因此无需真实等待；第二次输入取消第一份 Job，最终只保存最后一个值。",
  },

  "flow-basics": {
    solution: `val searchResults: Flow<List<User>> = query
    .map(String::trim) // 先统一查询格式
    .filter { text -> text.length >= 2 }
    .debounce(300) // 等待输入稳定
    .distinctUntilChanged() // 相同查询不重复请求
    .flatMapLatest { text ->
        // 新查询到来时自动取消旧搜索流
        repository.searchFlow(text)
    }

// 空查询需要清空结果时，可在 filter 前转换为明确的 SearchCommand`,
    solutionExplanation: "flatMapLatest 提供“最新输入胜出”的取消语义。操作符顺序会影响行为：先 trim 才能正确去重，短查询被过滤后不会请求。",
  },

  "flow-context": {
    solution: `val sharedSensor = sensorFlow
    // 两个消费者共享一个传感器上游
    .shareIn(scope, SharingStarted.WhileSubscribed(), replay = 0)

scope.launch {
    sharedSensor
        .conflate() // UI 只关心最新坐标，允许跳过中间值
        .collectLatest(::renderPosition)
}

scope.launch {
    sharedSensor
        .buffer(capacity = 64) // 短暂吸收写盘速度波动
        .collect { position ->
            writer.append(position) // 记录链不主动丢弃任何值
        }
}`, 
    solutionExplanation: "两条链的业务语义不同：UI 可合并旧位置，记录链必须完整。若写盘长期跟不上，有限 buffer 最终会施加背压，而不是无限增长内存。",
  },

  "hot-flows": {
    solution: `// 新页面必须立刻知道当前值：状态
val loginState = MutableStateFlow<LoginState>(LoginState.LoggedOut)
val searchResults = MutableStateFlow<List<User>>(emptyList())
val appTheme = MutableStateFlow(Theme.System)

// 允许页面不可见时丢失的瞬时展示：广播事件
val toastEvents = MutableSharedFlow<String>(extraBufferCapacity = 1)

// 只应由一个后台消费者处理：工作队列
val downloadQueue = Channel<DownloadTask>(capacity = Channel.BUFFERED)

// 导航若绝不能丢，保存为可确认状态，而不是只发内存事件
data class NavigationState(val pendingUserId: Long? = null)

// 重要业务事实写入数据库，进程重建后再通过 Flow 恢复`,
    solutionExplanation: "选择依据是当前值、广播范围和丢失容忍度。StateFlow、SharedFlow、Channel 都不能替代需要跨进程保存的持久化事实。",
  },

  "flow-lifecycle": {
    solution: `override fun onViewCreated(view: View, savedState: Bundle?) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            // 每条 collect 都放在独立子协程中并行执行
            launch { viewModel.uiState.collect(::render) }
            launch { viewModel.progress.collect(::renderProgress) }
            launch {
                viewModel.effects.collect { effect ->
                    when (effect) {
                        is UiEffect.ShowMessage -> showMessage(effect.text)
                        is UiEffect.OpenUser -> openUserIfNeeded(effect.id)
                    }
                }
            }
        }
    }
}

private fun openUserIfNeeded(id: Long) {
    // 幂等检查避免恢复收集时重复导航
    if (findNavController().currentDestination?.id == R.id.searchFragment) {
        findNavController().navigate(SearchDirections.openUser(id))
    }
}`,
    solutionExplanation: "viewLifecycleOwner 防止视图销毁后继续访问 binding；repeatOnLifecycle 自动启停三个子收集器。不能丢的导航应进一步提升为可确认状态。",
  },

  "android-patterns": {
    solution: `class UserRepository(
    private val api: UserApi,
    private val dao: UserDao,
) {
    // UI 始终观察本地事实来源
    fun observe(id: Long): Flow<User?> =
        dao.observe(id).map { entity -> entity?.toDomain() }

    suspend fun refresh(id: Long) {
        // 网络成功后写库，Room Flow 会自动推动 UI
        dao.upsert(api.load(id).toEntity())
    }
}

class UserViewModel(
    private val repository: UserRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val id = savedStateHandle.getStateFlow("user_id", 0L)

    val uiState = id
        .flatMapLatest(repository::observe)
        .map { user -> user?.let(UserUiState::Content) ?: UserUiState.Loading }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), UserUiState.Loading)

    fun refresh() = viewModelScope.launch {
        runCatching { repository.refresh(id.value) }
            .onFailure { error -> logger.warn("刷新失败，继续显示缓存", error) }
    }
}`, 
    solutionExplanation: "Room 负责可恢复缓存，refresh 只更新数据源。旋转时 ViewModel 与 StateFlow 保留状态，断网失败也不会删除旧内容。",
  },

  capstone: {
    solution: `class SearchViewModel(
    private val repository: UserRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val query = savedStateHandle.getStateFlow("query", "")

    val uiState: StateFlow<SearchUiState> = query
        .map(String::trim)
        .debounce(300)
        .distinctUntilChanged()
        .flatMapLatest { text ->
            if (text.length < 2) {
                flowOf(SearchUiState.Idle)
            } else {
                repository.search(text)
                    .map<List<User>, SearchUiState> { users ->
                        if (users.isEmpty()) SearchUiState.Empty
                        else SearchUiState.Content(users.map(User::toRow))
                    }
                    .onStart {
                        // 刷新网络的同时，Repository 仍可先发射 Room 缓存
                        repository.refresh(text)
                    }
                    .catch { error -> emit(SearchUiState.Failed(error.toMessage())) }
            }
        }
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            SearchUiState.Idle,
        )

    fun onQueryChanged(value: String) {
        // SavedStateHandle 让进程重建后仍能恢复查询词
        savedStateHandle["query"] = value
    }
}`,
    solutionExplanation: "这是一份主链路骨架：查询驱动、旧搜索取消、Room 缓存、网络刷新、错误状态和进程恢复都能在同一数据流中定位。完整项目仍应拆分并分别测试 DAO、Repository 和 ViewModel。",
  },

  performance: {
    solution: `class FeedViewModel(
    repository: FeedRepository,
    formatter: DateFormatter,
) : ViewModel() {
    val rows = repository.observeFeed()
        .map { users ->
            users.map { user ->
                // 日期在上游只格式化一次，不在每次 onBind 时重复解析
                UserRow(
                    id = user.id,
                    title = user.name,
                    lastSeen = formatter.format(user.lastSeenAt),
                )
            }
        }
        // 在 ViewModel 中共享冷流，旋转不会额外启动网络上游
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
}

class UserHolder(
    private val binding: UserRowBinding,
) : RecyclerView.ViewHolder(binding.root) {
    fun bind(row: UserRow) {
        binding.title.text = row.title
        binding.lastSeen.text = row.lastSeen // 绑定阶段只赋值
    }
}`,
    solutionExplanation: "先通过订阅日志确认重复请求来自冷流重启，再用 ViewModel 作用域共享；列表卡顿则把格式化移出 onBind。验证指标是请求次数、绑定耗时和分配数量。",
  },

  "kotlin-21-k2": {
    solution: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android") version "<目标稳定版本>"
    // Compose 项目使用与 Kotlin 工具链配套的插件
    id("org.jetbrains.kotlin.plugin.compose") version "<目标稳定版本>"
}

kotlin {
    // 本地与 CI 使用同一 JDK 工具链
    jvmToolchain(17)
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

// 升级提交建议：
// 1. 记录升级前 clean / incremental build 与测试结果
// 2. 单独更新 Kotlin、AGP、Gradle、JDK、Compose、KSP 兼容组合
// 3. 再处理新诊断和弃用，不同时重构业务
// 4. 预览语言特性放在独立、可撤销的提交中
// 5. CI、真机关键路径与回滚版本全部确认后再发布`,
    solutionExplanation: "版本号必须根据项目当前 AGP、Compose 和 KSP 的官方兼容矩阵填写，不能把示例中的占位符直接用于生产。升级步骤把工具链变化与业务修改分开，便于定位和回滚。",
  },

  "interview-review": {
    solution: `// 示例题：suspend 函数是否一定运行在后台线程？

// 1. 定义
// suspend 只表示函数可以挂起并在之后恢复，不代表自动异步或自动切线程。

// 2. 机制
// 编译器把挂起函数转换为 Continuation 状态机；挂起时保存 label 和必要局部变量。

// 3. Android 场景
// ViewModel 可从 Main 调用 main-safe Repository；阻塞文件读取由 Repository 内部 withContext(IO)。

// 4. 取舍与误区
// Retrofit 的 suspend API 通常已经异步，不必机械包 IO；普通阻塞 API 即使标成 suspend 仍会卡线程。

// 追问
// 取消依赖可取消挂起点或 ensureActive；异常沿 Job 父子树传播，监督关系可隔离独立兄弟任务。`,
    solutionExplanation: "这是 90 秒回答示范。其余题目也用“定义—机制—Android 场景—取舍”组织，再主动补充取消、失败、生命周期和测试。",
  },
};
