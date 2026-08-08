import { modernAndroidExerciseSolutions } from "./exercise-solutions-modern-android";

export type ExerciseSolution = {
  solution: string;
  solutionExplanation: string;
  solutionChecks: string[];
  solutionRoles?: {
    component: string;
    responsibility: string;
    boundary: string;
  }[];
};

export const exerciseSolutions: Record<string, ExerciseSolution> = {
  ...modernAndroidExerciseSolutions,
  "meet-kotlin": {
    solution: `// 顶层函数不需要再放进 UserUtils 类
fun userLabel(id: Long) = "user-$id"

val label = userLabel(42L) // 输出：user-42`,
    solutionExplanation: "参数默认不可重新赋值；单表达式函数可以让编译器推断 String 返回类型。字符串模板比手动拼接更直接。",
    solutionChecks: ["顶层函数，不再依赖 Java 工具类", "参数为只读 val 语义", "返回类型由单表达式自动推断"],
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
    solutionChecks: ["覆盖 200～299 区间", "单独处理 401", "else 覆盖其他状态码"],
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
    solutionChecks: ["三个 Java 重载合并为一个函数", "可选参数提供默认值", "调用示例使用具名参数"],
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
    solutionChecks: ["缺失参数会结束页面", "非法 Long 不会抛出格式异常", "实现中没有 if 与 !!"],
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
    solutionChecks: ["id 大于 0 且 name 自动 trim", "属性对外只读", "AccountSource 与可注入 Fake 实现齐全"],
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
    solutionChecks: ["MutableStateFlow 保持私有", "UI 仅获得 StateFlow", "increment 与 markAllRead 都由 ViewModel 修改"],
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
    solutionChecks: ["五种互斥状态完整建模", "Content 与 Failed 携带所需数据", "when 穷举且没有兜底 else"],
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

val users = listOf(
    User(id = 1L, name = "Ada"),
    User(id = 2L, name = "Lin"),
)

// 写法一：显式 Lambda，适合需要额外逻辑时
val rowsByLambda = transform(users) { user ->
    UserRow(user.id, user.name.uppercase())
}

// 写法二：复用已有函数
val rowsByReference = transform(users, ::toUserRow)`,
    solutionExplanation: "mapper 把每个 T 转成 R。函数引用适合原样复用已有行为，Lambda 更适合在调用处增加一小段转换逻辑。",
    solutionChecks: ["transform 的 T、R 泛型签名正确", "给出 Lambda 调用", "给出函数引用调用与完整示例数据"],
  },

  "scope-functions": {
    solution: `const val EXTRA_ID = "extra_id"

fun detailIntent(context: Context, id: Long): Intent =
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
        Log.d("Network", "request=$value")
    }`,
    solutionExplanation: "三个选择都由返回值决定：apply/also 返回接收者，let 返回计算结果；显式命名 value 可避免嵌套时混淆 it。",
    solutionChecks: ["apply 配置并返回 Intent", "let 处理可空 User 并返回名字", "also 记录请求且仍返回原请求"],
  },

  collections: {
    solution: `data class Contact(val id: Long, val name: String?, val active: Boolean)
data class ContactRow(
    val id: Long,
    val title: String,
    val initial: String,
)

fun groupContacts(
    contacts: List<Contact>,
): Map<String, List<ContactRow>> =
    contacts
        .filter(Contact::active) // 先去掉停用联系人
        .sortedBy { contact -> contact.name?.trim().orEmpty() }
        .map { contact ->
            val normalizedName = contact.name?.trim().orEmpty()
            ContactRow(
                id = contact.id,
                title = normalizedName.ifEmpty { "未命名" },
                // 必须根据原始姓名计算分组，不能对“未命名”取首字母
                initial = normalizedName
                    .firstOrNull()
                    ?.uppercaseChar()
                    ?.toString()
                    ?: "#",
            )
        }
        .groupBy(ContactRow::initial)`,
    solutionExplanation: "每一步只承担一种数据变换，最终类型直接表达“首字母到联系人行列表”的映射。",
    solutionChecks: ["依次使用 filter、sortedBy、map、groupBy", "停用联系人被过滤", "空姓名稳定归入 # 组"],
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

val dogReader: Reader<Dog> = object : Reader<Dog> {
    override fun read(): Dog = Dog()
}
val animalReader: Reader<Animal> = dogReader

val animalWriter: Writer<Animal> = object : Writer<Animal> {
    override fun write(value: Animal) {
        // 能处理任意 Animal，自然也能处理 Dog
        println(value)
    }
}
val dogWriter: Writer<Dog> = animalWriter`,
    solutionExplanation: "Reader<Dog> 可以安全当作 Reader<Animal>，因为它只会产出更具体的 Dog；能写 Animal 的 Writer 当然也能写 Dog。",
    solutionChecks: ["Reader 使用 out 并只产出 T", "Writer 使用 in 并只消费 T", "两种安全赋值都有可运行对象"],
  },

  "inline-and-reified": {
    solution: `interface Json {
    // 题目已给出的底层解析入口
    fun <T : Any> decode(text: String, type: KClass<T>): T
}

inline fun <reified T : Any> Json.decode(text: String): T =
    decode(text, T::class) // 调用点保留 T 的具体类型

fun decodeUser(json: Json, payload: String): User =
    json.decode(payload)

// 注意：仅有 KClass 时，List<User> 的 User 类型仍可能被擦除
// 复杂嵌套泛型通常需要 typeOf<T>() 或框架的 TypeToken`,
    solutionExplanation: "reified 让内联函数体可以访问 T::class，但不会自动保留所有嵌套泛型参数；要结合所用 JSON 框架的类型令牌能力。",
    solutionChecks: ["inline 与 reified 声明完整", "T::class 传给已有 decode", "说明 List<User> 等嵌套泛型限制"],
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
    solutionChecks: ["getValue 与 setValue 都已实现", "支持默认值和显式 key", "说明敏感信息的安全边界"],
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
    solutionChecks: ["两个注解均为运行时可见", "明确使用 @field 与 @get 落点", "说明 Java/Kotlin 反射读取元素"],
  },

  "java-interop": {
    solution: `interface ImageLoader {
    @Throws(IOException::class)
    fun load(url: String, width: Int, height: Int): ByteArray
}

object DefaultImageLoader : ImageLoader {
    override fun load(url: String, width: Int, height: Int): ByteArray {
        // 示例使用 URL；Android 生产代码应换成已注入的网络客户端
        return URL(url).openStream().use { input -> input.readBytes() }
    }
}

class ImageRequest private constructor(
    val url: String,
    val width: Int,
    val height: Int,
    private val loader: ImageLoader,
) {
    @JvmOverloads
    constructor(
        url: String,
        width: Int = 0,
        height: Int = 0,
    ) : this(url, width, height, DefaultImageLoader)

    init {
        require(url.isNotBlank()) { "url 不能为空" }
    }

    @Throws(IOException::class)
    fun load(): ByteArray {
        // Java 调用方会在签名中看到 throws IOException
        return loader.load(url, width, height)
    }

    companion object {
        @JvmStatic
        fun createDefault(url: String): ImageRequest = ImageRequest(url)

        // 测试可注入 Fake，不必真的访问网络
        internal fun createForTest(
            url: String,
            loader: ImageLoader,
        ): ImageRequest = ImageRequest(url, 0, 0, loader)
    }
}

// Java 调用示例：
// 一个参数：new ImageRequest(url);
// 两个参数：new ImageRequest(url, 320);
// 三个参数：new ImageRequest(url, 320, 180);
// 静态工厂：ImageRequest.createDefault(url);`,
    solutionExplanation: "@JvmOverloads 生成连续尾部默认参数的重载，@JvmStatic 提供真正的静态入口，@Throws 把异常契约写入 JVM 签名。",
    solutionChecks: ["Java 可用 1～3 个参数构造", "createDefault 是 Java 静态入口", "load 的 IOException 契约和调用示例齐全"],
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
    solutionChecks: ["标出读取、网络、保存三个挂起点", "说明跨挂起点保存的局部变量", "逐步判断 IO 调度需求"],
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
    solutionChecks: ["TextView 更新留在 Main", "文件读取使用 IO", "CPU 排名使用 Default，Retrofit suspend 直接调用"],
  },

  "structured-concurrency": {
    solution: `suspend fun loadHome(): Home = coroutineScope {
    // 用户信息是必需数据，失败时整个首页失败
    val user = userApi.load()

    supervisorScope {
        // 两个可选区域各自只处理“预期的网络失败”
        val recommendations = async {
            try {
                recommendationApi.load(user.id)
            } catch (error: IOException) {
                logger.warn("推荐加载失败", error)
                emptyList()
            }
        }
        val announcements = async {
            try {
                announcementApi.load()
            } catch (error: IOException) {
                logger.warn("公告加载失败", error)
                emptyList()
            }
        }

        Home(user, recommendations.await(), announcements.await())
    }
}

// 没有捕获 CancellationException：
// 父协程取消时，用户、推荐和公告都会按结构化并发一起停止。`,
    solutionExplanation: "外层保持“必需数据失败即失败”，监督作用域只隔离彼此独立的可选区域；每个 async 的异常仍在内部明确转换。",
    solutionChecks: ["用户失败会让首页整体失败", "推荐与公告互不取消", "预期异常就地处理且取消仍向上传播"],
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

suspend fun safeSearch(
    records: List<Record>,
    query: String,
    default: CoroutineDispatcher,
): SearchResult = try {
    SearchResult.Content(searchRecords(records, query, default))
} catch (cancelled: CancellationException) {
    // 取消是协程控制信号，必须继续向上传播
    throw cancelled
} catch (error: IOException) {
    SearchResult.Failed("读取数据失败")
}`,
    solutionExplanation: "ensureActive 让新查询能及时停止旧 CPU 工作；CancellationException 不能被转换成空结果，否则上层会误以为旧搜索正常完成。",
    solutionChecks: ["CPU 循环主动检查取消", "CancellationException 明确重新抛出", "预期读取错误转换为 Failed 而非空结果"],
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
    val saver = DebouncedSaver(this) { value ->
        saved.add(value)
        Unit // 明确匹配 suspend (String) -> Unit
    }

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
    solutionChecks: ["新输入取消旧 Job", "499ms 明确断言未保存", "500ms 只保存最后一次输入"],
  },

  "flow-basics": {
    solution: `val searchResults: Flow<List<User>> = query
    .map(String::trim) // 先统一查询格式
    .debounce(300) // 等待输入稳定
    .distinctUntilChanged() // 相同查询不重复请求
    .flatMapLatest { text ->
        if (text.length < 2) {
            // 短查询既不请求，也在本次防抖后清空旧结果
            flowOf(emptyList())
        } else {
            // 新查询到来时自动取消旧搜索流
            repository.searchFlow(text)
        }
    }
`,
    solutionExplanation: "flatMapLatest 提供“最新输入胜出”的取消语义。短查询显式发射空列表，避免简单 filter 导致页面继续显示上一次搜索结果。",
    solutionChecks: ["trim、300ms 防抖与去重齐全", "少于 2 字符不会请求且会清空结果", "flatMapLatest 取消旧搜索"],
  },

  "flow-context": {
    solution: `val sharedSensor = sensorFlow
    // rendezvous 共享：慢的无损订阅者会让上游等待，不会静默丢值
    .buffer(capacity = 0)
    .shareIn(
        scope,
        started = SharingStarted.WhileSubscribed(),
        replay = 0,
    )

scope.launch {
    sharedSensor
        .conflate() // UI 只关心最新坐标，允许跳过待绘制的旧位置
        .collectLatest { position ->
            renderPosition(position)
        }
}

scope.launch {
    sharedSensor
        .buffer(
            capacity = 64,
            onBufferOverflow = BufferOverflow.SUSPEND,
        ) // 写满后挂起，不丢数据
        .collect { position ->
            writer.append(position)
        }
}

// 要求“从第一个值起完整记录”时，应先启动记录收集器，再启动传感器。
// 更严格的生产设计可把 writer.append 放到共享前的 onEach 中，
// 让“成功写入”成为上游发布每个坐标的前置条件。`,
    solutionExplanation: "UI 可合并旧位置，记录链使用 SUSPEND 溢出策略。共享流本身不是持久队列；要求绝对不丢时，还要控制订阅启动顺序或先落盘再广播。",
    solutionChecks: ["UI 链允许 conflate/collectLatest 跳过旧帧", "记录链不使用丢弃策略", "有界缓冲写满后通过挂起施加背压"],
  },

  "hot-flows": {
    solution: `// 1. 登录状态：旋转后立即恢复；进程重建后从持久会话恢复
val loginState = MutableStateFlow<LoginState>(LoginState.LoggedOut)

// 2. 搜索结果：旋转后保留；进程重建后重新查询或从 Room 恢复
val searchResults = MutableStateFlow<List<User>>(emptyList())

// 3. Toast：允许页面不可见时丢失，不设置 replay
val toastEvents = MutableSharedFlow<String>(extraBufferCapacity = 1)

// 4. 导航：保存待处理 id，并由 UI 成功导航后确认消费
data class NavigationState(val pendingUserId: Long? = null)
val navigation = MutableStateFlow(NavigationState())

// 5. 下载任务：只让一个消费者领取；重要任务还要落 Room/WorkManager
val downloadQueue = Channel<DownloadTask>(capacity = Channel.BUFFERED)

// 6. 全局主题：新页面立即得到当前值，并持久化到 DataStore
val appTheme = MutableStateFlow(Theme.System)

// StateFlow 只能自动跨旋转；登录、导航、下载、主题等关键事实若要跨进程，
// 必须写入 SavedStateHandle、Room、DataStore 或 WorkManager。`,
    solutionExplanation: "选择依据是当前值、广播范围和丢失容忍度。StateFlow、SharedFlow、Channel 都不能替代需要跨进程保存的持久化事实。",
    solutionChecks: ["六种数据逐一选择模型", "解释旋转后的行为", "解释进程重建与必须持久化的数据"],
  },

  "flow-lifecycle": {
    solution: `// ViewModel：导航是“等待 UI 确认”的状态
private val _pendingUserId = MutableStateFlow<Long?>(null)
val pendingUserId: StateFlow<Long?> = _pendingUserId.asStateFlow()

fun requestOpenUser(id: Long) {
    _pendingUserId.value = id
}

fun onUserOpened(id: Long) {
    _pendingUserId.compareAndSet(id, null)
}

// Fragment：三条 Flow 在 repeatOnLifecycle 内分别 launch
override fun onViewCreated(view: View, savedState: Bundle?) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            launch { viewModel.uiState.collect(::render) }
            launch { viewModel.progress.collect(::renderProgress) }
            launch {
                viewModel.pendingUserId.collect { id ->
                    if (id != null && openUserIfPossible(id)) {
                        // navigate 成功后才确认，停止期间不会丢
                        viewModel.onUserOpened(id)
                    }
                }
            }
        }
    }
}

private fun openUserIfPossible(id: Long): Boolean {
    val navController = findNavController()
    if (navController.currentDestination?.id != R.id.searchFragment) return false
    navController.navigate(SearchDirections.openUser(id))
    return true
}

// Toast 若允许停止时丢失，仍可使用 replay = 0 的 SharedFlow。`,
    solutionExplanation: "viewLifecycleOwner 防止视图销毁后继续访问 binding；repeatOnLifecycle 自动启停三个子收集器。不能丢的导航应进一步提升为可确认状态。",
    solutionChecks: ["三条 Flow 在独立子协程并行收集", "收集绑定 viewLifecycleOwner", "导航使用可确认状态并防重复"],
  },

  "android-patterns": {
    solutionRoles: [
      { component: "UserFragment", responsibility: "收集并渲染 UiState；转发重试点击", boundary: "不直接访问 Dao 或 Api" },
      { component: "UserViewModel", responsibility: "跨旋转持有状态；首刷、去重刷新、错误转换", boundary: "不持有 View/Context" },
      { component: "UserRepository", responsibility: "协调 observe 与 refresh；Room 为唯一事实源", boundary: "网络结果不绕过数据库直达 UI" },
      { component: "UserDao / Room", responsibility: "持久缓存并通过 Flow 持续发射", boundary: "不知道页面与网络状态" },
      { component: "UserApi", responsibility: "请求远端并返回 DTO", boundary: "不保存 UI 状态或本地缓存" },
    ],
    solution: `// ---------- 职责 ----------
// UserFragment：渲染状态、转发点击；不直接访问网络或数据库。
// UserViewModel：持有跨旋转状态、启动首刷、处理重试和并发刷新。
// UserRepository：以 Room 为唯一事实源；网络成功后只写库。
// UserDao：持续观察缓存并原子写入。
// UserApi：只负责远端 HTTP 请求与 DTO。

data class User(val id: Long, val name: String)

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: Long,
    val name: String,
)

data class UserDto(val id: Long, val name: String)

fun UserEntity.toDomain() = User(id, name)
fun UserDto.toEntity() = UserEntity(id, name)

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id")
    fun observe(id: Long): Flow<UserEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(user: UserEntity)
}

interface UserApi {
    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: Long): UserDto
}

class UserRepository(
    private val api: UserApi,
    private val dao: UserDao,
) {
    // observe 只读 Room；断网时仍会发出最后一次缓存
    fun observe(id: Long): Flow<User?> =
        dao.observe(id).map { entity -> entity?.toDomain() }

    suspend fun refresh(id: Long) {
        // 网络成功后写库；Room Flow 再推动所有观察者更新
        val remote = api.getUser(id)
        dao.upsert(remote.toEntity())
    }
}

sealed interface RefreshState {
    data object Loading : RefreshState
    data object Idle : RefreshState
    data class Failed(val message: String) : RefreshState
}

data class UserUiState(
    val user: User? = null,
    val isInitialLoading: Boolean = true,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,
)

class UserViewModel(
    private val repository: UserRepository,
    private val savedStateHandle: SavedStateHandle,
) : ViewModel() {
    // Navigation/SavedStateHandle 写入 user_id；进程重建也能恢复参数
    private val userId: Long =
        checkNotNull(savedStateHandle["user_id"]) { "缺少 user_id" }

    // Eagerly 让 Room 观察属于 ViewModel，而不是属于某一份 Fragment View
    private val cachedUser = repository.observe(userId).stateIn(
        scope = viewModelScope,
        started = SharingStarted.Eagerly,
        initialValue = null,
    )
    private val refreshState =
        MutableStateFlow<RefreshState>(RefreshState.Loading)
    private var refreshJob: Job? = null

    val uiState: StateFlow<UserUiState> = combine(
        cachedUser,
        refreshState,
    ) { user, refresh ->
        UserUiState(
            user = user,
            // 无缓存时显示整页加载；有缓存时只显示小刷新指示
            isInitialLoading = user == null && refresh is RefreshState.Loading,
            isRefreshing = user != null && refresh is RefreshState.Loading,
            errorMessage = (refresh as? RefreshState.Failed)?.message,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = UserUiState(),
    )

    init {
        // 首刷只在 ViewModel 创建时发生；旋转不会重新创建 ViewModel
        refresh()
    }

    fun refresh() {
        // 连续点击重试或旋转期间，不并发发出相同请求
        if (refreshJob?.isActive == true) return
        refreshJob = viewModelScope.launch {
            refreshState.value = RefreshState.Loading
            try {
                repository.refresh(userId)
                refreshState.value = RefreshState.Idle
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Exception) {
                // 不清空 cachedUser；有缓存继续显示，无缓存显示错误页
                refreshState.value = RefreshState.Failed(
                    error.message ?: "刷新失败，请检查网络后重试",
                )
            }
        }
    }

    fun retry() {
        refresh()
    }
}

class UserFragment : Fragment(R.layout.fragment_user) {
    private var _binding: FragmentUserBinding? = null
    private val binding get() = checkNotNull(_binding)
    private val viewModel: UserViewModel by viewModels()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentUserBinding.bind(view)
        binding.retryButton.setOnClickListener { viewModel.retry() }

        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect(::render)
            }
        }
    }

    private fun render(state: UserUiState) = with(binding) {
        fullScreenProgress.isVisible = state.isInitialLoading
        refreshProgress.isVisible = state.isRefreshing
        contentGroup.isVisible = state.user != null
        errorGroup.isVisible = state.errorMessage != null
        errorText.text = state.errorMessage
        retryButton.isVisible = state.errorMessage != null
        state.user?.let { user -> nameText.text = user.name }
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}

// Activity 用法只有生命周期拥有者不同：
class UserActivity : AppCompatActivity(R.layout.activity_user) {
    private val viewModel: UserViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        findViewById<Button>(R.id.retryButton)
            .setOnClickListener { viewModel.retry() }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect(::render)
            }
        }
    }

    private fun render(state: UserUiState) {
        // 与 Fragment 的 render 相同；Activity 不需要清理 ViewBinding
    }
}

@Test
fun rotation_keeps_cache_and_does_not_repeat_refresh() {
    fakeDao.seed(UserEntity(1L, "缓存 Ada"))
    fakeApi.enqueueFailure(IOException("offline"))
    val scenario = launchFragmentInContainer<UserFragment>(
        fragmentArgs = bundleOf("user_id" to 1L),
    )

    onView(withText("缓存 Ada")).check(matches(isDisplayed()))
    scenario.recreate()

    onView(withText("缓存 Ada")).check(matches(isDisplayed()))
    onView(withText("offline")).check(matches(isDisplayed()))
    assertEquals(1, fakeApi.requestCount)
}

@Test
fun retry_recovers_after_initial_offline_error() {
    fakeApi.enqueueFailure(IOException("offline"))
    fakeApi.enqueueSuccess(UserDto(1L, "远端 Ada"))
    launchFragmentInContainer<UserFragment>(
        fragmentArgs = bundleOf("user_id" to 1L),
    )

    onView(withId(R.id.retryButton)).perform(click())

    onView(withText("远端 Ada")).check(matches(isDisplayed()))
    assertEquals(2, fakeApi.requestCount)
}

// 旋转证明：
// 1. Fragment/View 会重建，但对应 ViewModelStore 中的 ViewModel 保留。
// 2. refresh() 不在 onViewCreated，进行中的 refreshJob 不会重启。
// 3. 新 View 在 STARTED 后立即收到 StateFlow 最新值。
// 4. 即使进程被杀，user_id 可恢复，Room 缓存仍可重新发射。`,
    solutionExplanation: "这是完整的离线优先链路：Room 是唯一事实源，刷新只写库；缓存内容、刷新进度和错误是三个可共存维度。旋转只重建 View，不重建同一作用域的 ViewModel；首刷不放在 Fragment，因此不会重复。若进程被系统终止，SavedStateHandle 恢复 id，Room 恢复缓存，再重新刷新。",
    solutionChecks: ["五个组件职责与 observe + refresh 链路完整", "旋转不会在 Fragment 重启刷新或丢失状态", "离线缓存、错误展示、重试与 Fragment/Activity 用法齐全"],
  },

  capstone: {
    solution: `// 提交 1：feat(model): 定义模型与验收标准
// 产物：User、SearchUiState、UserRow；纯 Kotlin 模块可编译。
// 验收：短查询为 Idle；空列表为 Empty；非空列表为 Content。
sealed interface SearchUiState {
    data object Idle : SearchUiState
    data object Loading : SearchUiState
    data class Content(val rows: List<UserRow>) : SearchUiState
    data object Empty : SearchUiState
    data class Failed(val message: String) : SearchUiState
}

@Test
fun commit1_non_empty_users_map_to_content() {
    val state = usersToState(listOf(User(1, "Ada")))
    assertIs<SearchUiState.Content>(state)
}

// 提交 2：feat(room): 加入 Room 缓存
// 产物：Entity、Dao、Database 和 mapper；App 可编译，尚不联网。
@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE name LIKE '%' || :query || '%'")
    fun observeSearch(query: String): Flow<List<UserEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun replaceAll(users: List<UserEntity>)
}

@Test
fun commit2_dao_emits_after_insert() = runTest {
    dao.replaceAll(listOf(UserEntity(1, "Ada")))
    assertEquals("Ada", dao.observeSearch("Ad").first().single().name)
}

// 提交 3：feat(network): 加入 Retrofit 刷新
// 产物：UserApi、DTO、mapper；只验证 HTTP 边界，不接 ViewModel。
interface UserApi {
    @GET("users")
    suspend fun search(@Query("q") query: String): List<UserDto>
}

@Test
fun commit3_api_decodes_response() = runTest {
    mockWebServer.enqueue(MockResponse().setBody(
        """[{"id":1,"name":"Ada"}]""",
    ))
    assertEquals("Ada", api.search("Ad").single().name)
}

// 提交 4：feat(repository): Room 为唯一事实源
// observe 只看库；refresh 请求成功后事务写库，失败绝不清空缓存。
class UserRepository(
    private val dao: UserDao,
    private val api: UserApi,
) {
    fun observe(query: String): Flow<List<User>> =
        dao.observeSearch(query).map { rows -> rows.map(UserEntity::toDomain) }

    suspend fun refresh(query: String) {
        val remote = api.search(query)
        dao.replaceAll(remote.map(UserDto::toEntity))
    }
}

@Test
fun commit4_refresh_writes_api_result_to_dao() = runTest {
    val repository = UserRepository(fakeDao, fakeApiReturningAda)
    repository.refresh("Ad")
    assertEquals("Ada", fakeDao.observeSearch("Ad").first().single().name)
}

// 提交 5：feat(viewmodel): 查询、取消、状态与错误恢复
// SavedStateHandle 保存查询；flatMapLatest 取消旧会话；每次会话并行观察缓存和刷新。
class SearchViewModel(
    private val repository: UserRepository,
    private val savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val query = savedStateHandle.getStateFlow("query", "")
    private val retryVersion = MutableStateFlow(0)

    private val normalizedQuery = query
        .map(String::trim)
        .debounce(300)
        .distinctUntilChanged()

    val uiState: StateFlow<SearchUiState> = combine(
        normalizedQuery,
        retryVersion,
    ) { text, version -> text to version }
        .flatMapLatest { (text, _) -> searchSession(text) }
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            SearchUiState.Idle,
        )

    private fun searchSession(text: String): Flow<SearchUiState> {
        if (text.length < 2) return flowOf(SearchUiState.Idle)

        return channelFlow {
            // 缓存观察与网络刷新并行，慢网络不会挡住 Room 首次发射
            launch {
                repository.observe(text).collect { users ->
                    send(usersToState(users))
                }
            }
            launch {
                try {
                    repository.refresh(text)
                } catch (cancelled: CancellationException) {
                    throw cancelled
                } catch (error: Exception) {
                    send(SearchUiState.Failed(error.message ?: "刷新失败"))
                }
            }
        }.onStart { emit(SearchUiState.Loading) }
    }

    fun onQueryChanged(value: String) {
        savedStateHandle["query"] = value
    }

    fun retry() {
        retryVersion.update { version -> version + 1 }
    }
}

@Test
fun commit5_new_query_cancels_old_search() = runTest {
    viewModel.onQueryChanged("Ko")
    advanceTimeBy(300)
    viewModel.onQueryChanged("Kotlin")
    advanceTimeBy(300)
    assertEquals("Kotlin", fakeRepository.startedQueries.last())
    assertTrue(fakeRepository.cancelledQueries.contains("Ko"))
}

// 提交 6：feat(ui): Fragment 生命周期收集 + 端到端恢复测试
override fun onViewCreated(view: View, savedState: Bundle?) {
    binding.search.doAfterTextChanged {
        viewModel.onQueryChanged(it.toString())
    }
    binding.retry.setOnClickListener {
        viewModel.retry()
    }
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            viewModel.uiState.collect(::render)
        }
    }
}

@Test
fun commit6_rotation_keeps_query_cache_and_single_request() {
    val scenario = launchFragmentInContainer<SearchFragment>()
    onView(withId(R.id.search)).perform(typeText("Kotlin"))
    onView(withText("Ada")).check(matches(isDisplayed()))

    scenario.recreate()

    // ViewModel 与 Room 缓存跨旋转，首刷不能再发一次
    onView(withText("Ada")).check(matches(isDisplayed()))
    assertEquals(1, fakeApi.requestCount)

    fakeApi.enqueueFailure(IOException("offline"))
    onView(withId(R.id.retry)).perform(click())
    onView(withText("offline")).check(matches(isDisplayed()))

    fakeApi.enqueueSuccess(listOf(UserDto(2, "Lin")))
    onView(withId(R.id.retry)).perform(click())
    onView(withText("Lin")).check(matches(isDisplayed()))
}

// 每次提交的绿色门槛：
// ./gradlew assembleDebug testDebugUnitTest
// Room/Fragment 提交再运行 connectedDebugAndroidTest。`,
    solutionExplanation: "六个提交都限定了生产边界、可编译产物、关键测试和绿色命令。实现顺序从纯模型到 Room、网络、Repository、ViewModel、Fragment；任何一步失败都能在当前边界定位，也可单独回滚。",
    solutionChecks: ["六个提交的边界和可编译产物明确", "每个提交都有一条关键测试", "最终覆盖缓存、刷新、取消、生命周期和错误恢复"],
  },

  performance: {
    solution: `// 先观测，再修改：
// 1. OkHttp Interceptor 记录 URL、开始时间和请求序号。
// 2. Flow.onStart/onCompletion 记录上游启动次数和 collector 数。
// 3. RecyclerView.onBindViewHolder 用 Trace 记录每次绑定耗时。
// 4. Profiler 记录旋转前后的对象分配、掉帧和主线程占用。
class RequestCountingInterceptor : Interceptor {
    val count = AtomicInteger(0)

    override fun intercept(chain: Interceptor.Chain): Response {
        val requestNumber = count.incrementAndGet()
        Log.d("FeedRequest", "request #$requestNumber")
        return chain.proceed(chain.request())
    }
}

// 最可能原因 A：Fragment 每次创建都 collect 冷 Flow，并在上游触发 refresh。
// 修复：把共享边界提升到 ViewModel；网络刷新由明确事件或 Repository 策略控制。
class FeedViewModel(
    repository: FeedRepository,
    formatter: DateFormatter,
) : ViewModel() {
    val rows = repository.observeFeed()
        .onStart { Log.d("FeedFlow", "upstream started") }
        .map { users ->
            users.map { user ->
                // 最可能原因 B：日期在 onBind 解析；现在上游只格式化一次
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
        Trace.beginSection("UserHolder.bind")
        try {
            binding.title.text = row.title
            binding.lastSeen.text = row.lastSeen // 绑定阶段只做轻量赋值
        } finally {
            Trace.endSection()
        }
    }
}

// 前后对比必须在同一设备、同一数据量、相同旋转次数下记录：
data class PerformanceResult(
    val requestsAfterFiveRotations: Int, // 目标：修复前 > 1，修复后 = 1
    val bindP95Millis: Double,           // 目标：明显下降，且不阻塞 16.7ms 帧预算
    val allocationsPerScroll: Long,      // 目标：日期解析相关分配接近 0
    val slowFramesPercent: Double,       // 目标：下降并满足项目基线
)

// 若请求仍重复，再检查：是否有多个 ViewModel 实例、stateIn scope 是否错误、
// SharingStarted 停止后重订阅是否会在 Repository 内触发网络副作用。`,
    solutionExplanation: "答案先定义四类观测点，再分别验证冷 Flow 重启与 onBind 重计算两个假设。修复是否成立以五次旋转请求数、bind P95、滚动分配量和慢帧比例为准，而不是凭肉眼判断。",
    solutionChecks: ["给出请求、订阅、绑定与分配观测点", "定位冷流重复启动和 onBind 重计算", "提供修复及可量化前后验证指标"],
  },

  "kotlin-21-k2": {
    solution: `// 一、先盘点“实际值”，不能凭记忆填写
// Kotlin/AGP/Compose/KSP：settings.gradle(.kts)、根 build.gradle(.kts)、
// gradle/libs.versions.toml 与各模块 plugins 块
// Gradle：gradle/wrapper/gradle-wrapper.properties
// JDK：java -version、./gradlew -version、CI workflow、jvmToolchain
// 其他插件：Hilt、Room、KSP/KAPT、Detekt、Ktlint、Crashlytics、Baseline Profile

// 把结果提交为 docs/kotlin-2.1-upgrade.md：
// | 组件 | 当前版本 | 目标版本 | 兼容依据 | 阻塞项 |
// | Kotlin | 实际值 | 2.1.21 | Kotlin release notes | 无/说明 |
// | AGP | 实际值 | 查 AGP↔Gradle↔JDK 矩阵 | Android 官方表 | ... |
// | Gradle | 实际值 | 与目标 AGP 匹配 | Android 官方表 | ... |
// | JDK | 本地/CI 实际值 | 与目标 AGP 匹配 | AGP 文档 | ... |
// | Compose | BOM/插件实际值 | 与 Kotlin 2.1 配套 | Compose 文档 | ... |
// | KSP | 实际值 | 支持目标 Kotlin | KSP release notes | ... |
// 每条“兼容依据”都记录 URL 和查阅日期；无法确认就停止升级。

// 二、建立可复现基线
// ./gradlew --stop
// ./gradlew clean :app:assembleDebug --profile
// 修改一个 Kotlin 文件后：./gradlew :app:assembleDebug --profile
// ./gradlew testDebugUnitTest lintDebug
// ./gradlew connectedDebugAndroidTest
// 记录 clean/增量构建时间、测试数、警告数、APK 大小与关键真机路径。

// 三、每步一个可回滚提交
// 0. docs(k2): record pre-upgrade baseline
//    绿色条件：当前主干测试全部通过；打标签 pre-kotlin-2.1。
// 1. build(k2): align Gradle wrapper and JDK
//    绿色条件：./gradlew help、assembleDebug、CI 通过。
// 2. build(k2): align AGP and Android plugins
//    绿色条件：assemble、Lint、manifest/resource 合并通过。
// 3. build(k2): upgrade Kotlin 2.1.21, Compose plugin and KSP
//    绿色条件：KSP 重新生成、Compose 编译、单测通过。
// 4. fix(k2): address new diagnostics and deprecations
//    只修编译器指出的问题，不顺手重构业务；每类修复可再拆提交。
// 5. experiment(k2): enable preview language features
//    可选且必须独立；生产不需要时不提交。

// 四、目标配置示意；版本目录中的实际插件号以兼容表为准
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android") version "2.1.21"
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.21"
}

kotlin {
    jvmToolchain(17) // 若目标 AGP 要求不同，以兼容矩阵为准
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

// 五、回滚与前后验收
// 任一步失败：git revert 对应提交；恢复 pre-kotlin-2.1 后重跑基线命令。
// 升级完成后在相同机器、同一 Gradle 参数下重跑两次，取中位数：
// | 指标 | 升级前 | 升级后 | 允许差异/结论 |
// | clean build | 填写 | 填写 | 项目阈值 |
// | incremental build | 填写 | 填写 | 项目阈值 |
// | unit/lint/instrumented | 通过数 | 通过数 | 不得减少 |
// | warnings | 数量 | 数量 | 解释新增项 |
// | APK + 启动关键路径 | 填写 | 填写 | 不得出现未解释回退 |`,
    solutionExplanation: "由于题目说的是“现有项目”，参考答案不能伪造项目当前版本；它给出每个版本的唯一读取位置、目标 2.1.21、必须查证的兼容证据、五个可回滚提交和同条件前后测量表。填写完实际值与官方依据后，这份升级单才算通过。",
    solutionChecks: ["提供版本盘点位置与兼容目标表", "分步提交均有验证和回滚点", "记录升级前后构建时间、测试与产物结果"],
  },

  "interview-review": {
    solution: `// 使用方式：每题限时 90 秒，必须按“定义—机制—Android 场景—取舍”回答。

// 1【语言】Kotlin 的可空类型比 Java 判空多解决了什么？
// 定义：String 与 String? 是不同类型，编译器强制处理 null。
// 机制：安全调用、Elvis、智能转换把空值路径写入控制流；Java 平台类型仍需在边界收紧。
// 场景：Intent 参数先 toLongOrNull，再提前返回；Repository 不向 UI 暴露含糊平台类型。
// 取舍：它不能阻止反射、错误 !! 或 Java 注解缺失带来的运行时 null。
// 追问：何时可用 !!？答：只有不变量已被同一边界验证，且失败应视为程序错误时。

// 2【语言】为什么 UI 状态适合 sealed interface，而不是三个 Boolean？
// 定义：sealed 限制实现集合，data object/data class 分别表达无数据与带数据状态。
// 机制：when 可穷举，非法组合在类型层面不可表示。
// 场景：Idle、Loading、Content、Empty、Failed；渲染函数只接收一个状态。
// 取舍：缓存内容与刷新错误可共存时，不应硬塞进互斥状态，要拆成正交字段。
// 追问：进程重建会自动恢复 sealed 对象吗？答：不会，关键输入/事实仍需 SavedStateHandle 或持久化。

// 3【泛型】解释 out、in，并给一个 Android 例子。
// 定义：out 是生产者协变，in 是消费者逆变。
// 机制：只返回 T 才能把 Reader<Dog> 当 Reader<Animal>；只接收 T 才能反向赋值。
// 场景：只读数据源可 out；事件处理器/Comparator 可 in。
// 取舍：接口同时读写 T 时必须保持不型变，或拆成只读与只写视图。
// 追问：MutableList<Dog> 能否赋给 MutableList<Animal>？答：不能，否则可写入 Cat。

// 4【泛型】inline reified 真正保留了什么？
// 定义：内联调用点把具体 T 带入函数体，可访问 T::class 和进行 is T。
// 机制：普通泛型受 JVM 擦除；reified 通过代码内联绕过函数体内的部分限制。
// 场景：简化 Intent extra、Service 查找和 JSON 顶层类型入口。
// 取舍：KClass<List<User>> 仍不足以表达元素 User，常需 typeOf 或 TypeToken；也会增加代码体积。
// 追问：为什么成员函数不能随便 reified？答：必须 inline，而可覆写/动态分派函数不能这样内联。

// 5【协程】suspend 函数是否一定在后台线程？
// 定义：suspend 只表示可挂起并恢复，不代表异步或自动切线程。
// 机制：编译器生成 Continuation 状态机，Dispatcher 决定在哪个线程执行。
// 场景：Retrofit suspend 通常直接调用；阻塞文件 API 在 Repository 内 withContext(IO)。
// 取舍：机械包 IO 会增加切换；普通阻塞函数即使加 suspend 仍可能卡 Main。
// 追问：CPU 循环如何取消？答：放 Default，并周期调用 ensureActive/yield。

// 6【协程】coroutineScope 与 supervisorScope 怎样选择？
// 定义：普通父子关系中一个子失败会取消兄弟；监督关系隔离兄弟失败。
// 机制：异常沿 Job 树传播，await 仍会暴露 async 的失败；取消信号必须继续传播。
// 场景：用户是首页必需数据，用 coroutineScope；推荐和公告可独立降级，用 supervisorScope。
// 取舍：监督不是吞异常，每个可选任务仍要把预期异常转成局部错误状态。
// 追问：runCatching 有什么坑？答：可能把 CancellationException 当失败值，需显式重抛或只捕获预期异常。

// 7【Flow】冷 Flow、StateFlow、SharedFlow、Channel 的边界是什么？
// 定义：冷 Flow 每次收集重启上游；StateFlow 保存当前状态；SharedFlow 广播；Channel 分配给消费者。
// 机制：replay、buffer、SharingStarted 决定订阅和背压，不提供跨进程持久化。
// 场景：UI 状态用 StateFlow，允许丢的 Toast 用 SharedFlow，单消费者任务可 Channel。
// 取舍：导航/下载若不能丢，应保存为可确认状态或交给 Room/WorkManager。
// 追问：旋转与进程死亡分别怎样？答：ViewModel 热流可跨旋转，进程死亡必须靠持久层恢复。

// 8【Flow】如何实现“最新搜索胜出”？
// 定义：trim、debounce、distinctUntilChanged 后用 flatMapLatest。
// 机制：新查询会取消旧内部 Flow；取消必须传到 Retrofit/DAO/CPU 工作。
// 场景：少于 2 字符显式发空列表，避免 filter 后残留旧结果。
// 取舍：flatMapMerge 适合允许并发全部完成的任务；flowOn 只改变它上方的上游上下文。
// 追问：怎样测试？答：runTest + 虚拟时间，断言 299/300ms 和旧请求收到取消。

// 9【Android】旋转后怎样不重复请求、不丢 UI 状态？
// 定义：ViewModel 持有 screen state，Fragment 只持有 View 引用。
// 机制：同一导航目的地的 ViewModelStore 跨配置变化保留；StateFlow 向新 View 发最新值。
// 场景：首刷放 ViewModel init，Fragment 用 viewLifecycleOwner.repeatOnLifecycle 收集。
// 取舍：ViewModel 不能替代进程持久化；binding 必须在 onDestroyView 清空。
// 追问：验证方式？答：ActivityScenario.recreate，断言请求数不增、内容相同、旧 View 无更新。

// 10【Android】离线优先详情页的 observe + refresh 如何闭环？
// 定义：Room 是唯一事实源；observe 持续读库，refresh 请求网络后写库。
// 机制：DAO Flow 因写库重新发射；缓存、刷新中和错误应为可共存维度。
// 场景：断网继续显示 User 缓存并展示可重试错误；无缓存则错误页。
// 取舍：不要让 API 结果直接绕过数据库更新 UI；要定义缓存过期、事务和冲突策略。
// 追问：怎样测试？答：Fake API/DAO 验证写库，旋转测试单次请求，离线测试缓存与 retry。

// 逐题评分（0～4 分，总分 40）：
// 0：结论错误；1：结论正确；2：能解释机制；3：有真实 Android 场景；
// 4：还主动说明取舍/不用它的情况，并能接住该题追问。
// 复盘：32～40 可进入项目追问；24～31 回看薄弱题对应章节；
// 低于 24 不背答案，重新完成练习并在 24 小时后再录一轮。`,
    solutionExplanation: "答案提供了完整 10 题题库：语言、泛型、协程、Flow、Android 各两题。每题都有可在 90 秒内展开的四段提纲、一个机制追问和测试/生命周期/异常要点，最后用统一 0～4 分量表复盘。",
    solutionChecks: ["语言、泛型、协程、Flow、Android 各两题", "10 题均有 90 秒答案提纲与追问", "提供逐题评分规则和复盘方式"],
  },
};
