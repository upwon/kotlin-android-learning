import type { CompleteChapterContent } from "./content-types";

export const jetpackContent: Record<string, CompleteChapterContent> = {
  "modern-android-architecture": {
    sections: [
      {
        id: "layer-boundaries",
        eyebrow: "01 · 分层",
        title: "UI 层展示状态，数据层持有业务事实",
        paragraphs: [
          "现代 Android 架构至少区分 UI 层与数据层。UI 元素读取 UiState、上报用户事件；ViewModel 负责状态生产；Repository 对外暴露领域数据并协调本地与远端数据源。分层的价值不是目录整齐，而是让每层只有一个清楚的变化原因。",
          "Activity、Fragment 或 Composable 不应直接组合 DAO 与 Retrofit 返回值。否则生命周期、缓存、错误和线程语义散落在页面里，旋转和测试都会变得困难。Repository 也不是把 DAO 方法重新命名一遍，它必须统一数据所有权和一致性策略。",
        ],
        kotlinCode: `data class UserUiState(
    val user: User? = null,
    val loading: Boolean = false,
    val error: String? = null,
)

interface UserRepository {
    fun observe(id: Long): Flow<User?>
    suspend fun refresh(id: Long)
}`,
      },
      {
        id: "udf",
        eyebrow: "02 · 单向数据流",
        title: "事件向上，状态向下",
        paragraphs: [
          "单向数据流把页面交互变成明确事件，例如 Retry、ToggleFavorite、QueryChanged。ViewModel 处理事件并产生新的不可变状态，UI 只根据状态渲染。这样同一个输入状态总能得到同一个画面，也更容易复现线上问题。",
          "不要把所有点击都包装成巨大 Event 总线。页面公开少量有业务含义的方法同样符合 UDF。关键是 UI 不直接修改 Repository 或 MutableStateFlow，状态变更必须经过唯一入口。",
        ],
        kotlinCode: `sealed interface UserAction {
    data object Retry : UserAction
    data class FavoriteChanged(val favorite: Boolean) : UserAction
}

fun onAction(action: UserAction) {
    when (action) {
        UserAction.Retry -> refresh()
        is UserAction.FavoriteChanged -> setFavorite(action.favorite)
    }
}`,
      },
      {
        id: "state-production",
        eyebrow: "03 · 状态生产",
        title: "把持久数据、页面输入和瞬时操作合成 UiState",
        paragraphs: [
          "页面状态通常来自多个源：SavedStateHandle 中的导航参数、Repository 的数据 Flow、刷新或提交动作的内部状态。ViewModel 使用 combine、flatMapLatest 和 stateIn 把它们合成一个 StateFlow，UI 不需要知道每个字段来自哪里。",
          "错误不一定与内容互斥。离线刷新失败时，缓存内容和错误提示可以同时存在，因此生产项目经常使用 data class 的正交字段，而不是把所有状态硬塞进 Loading、Content、Error 三选一。",
        ],
        kotlinCode: `val uiState: StateFlow<UserUiState> = combine(
    repository.observe(userId),
    refreshState,
) { user, refresh ->
    UserUiState(
        user = user,
        loading = user == null && refresh is RefreshState.Loading,
        error = (refresh as? RefreshState.Failed)?.message,
    )
}.stateIn(
    viewModelScope,
    SharingStarted.WhileSubscribed(5_000),
    UserUiState(loading = true),
)`,
      },
      {
        id: "domain-and-recovery",
        eyebrow: "04 · Domain 与恢复",
        title: "UseCase 只在业务逻辑值得复用时加入",
        paragraphs: [
          "Domain 层是可选的。跨多个 ViewModel 复用的业务规则、组合多个 Repository 的操作或复杂校验，适合放进 UseCase；只调用一次 repository.load() 的空壳 UseCase 反而增加跳转成本。边界应由复杂度驱动，而不是按模板机械生成。",
          "ViewModel 能跨配置变化，但不能替代持久化。关键导航参数进入 SavedStateHandle，业务事实进入 Room/DataStore，必须完成的后台工作进入 WorkManager。恢复设计要分别回答旋转、进程死亡和设备重启三个问题。",
        ],
        kotlinCode: `class SubmitOrderUseCase(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
) {
    suspend operator fun invoke(): OrderId {
        val cart = cartRepository.currentCart()
        require(cart.items.isNotEmpty()) { "购物车不能为空" }
        return orderRepository.submit(cart)
    }
}`,
        note: "架构图不是目标。能清楚说明状态所有者、写入入口、失败位置和恢复来源，才算架构闭环。",
      },
    ],
    exercise: {
      title: "为结算功能划分现代 Android 架构",
      prompt: "设计 CartScreen、CartViewModel、SubmitOrderUseCase、CartRepository 与 OrderRepository 的职责。状态包含商品、总价、提交中和错误；要求旋转不重复提交、进程重建可恢复购物车，并写出事件到状态的主链路。",
      hint: "先确定购物车事实保存在哪里，再区分可恢复页面状态与一次提交动作。提交 Job 只属于 ViewModel，提交结果写入持久层。",
    },
  },

  "hilt-dependency-injection": {
    sections: [
      {
        id: "graph",
        eyebrow: "01 · 依赖图",
        title: "依赖注入让对象声明需要什么，而不是到处寻找什么",
        paragraphs: [
          "构造函数注入把依赖关系写进类型签名。Hilt 从 Application 入口建立组件树，根据 @Inject 构造函数与 Module 绑定生成工厂。业务对象不再读取 ServiceLocator 或全局单例，测试也可以替换边界实现。",
          "能使用构造函数注入时优先使用它；第三方类型、接口绑定和需要构建参数的对象再放进 Module。Module 不是业务对象仓库，不要把所有创建逻辑集中到一个巨型 AppModule。",
        ],
        kotlinCode: `@HiltAndroidApp
class LearningApp : Application()

class UserRepository @Inject constructor(
    private val api: UserApi,
    private val dao: UserDao,
)

@AndroidEntryPoint
class UserActivity : AppCompatActivity()`,
      },
      {
        id: "scope",
        eyebrow: "02 · 组件与作用域",
        title: "作用域表达实例寿命，不表达“这个对象很重要”",
        paragraphs: [
          "SingletonComponent 与进程内 Application 同寿命；ActivityRetainedComponent 可跨配置变化；ViewModelComponent 跟随 ViewModel；ActivityComponent 和 FragmentComponent 则跟随对应实例。错误作用域会造成状态串页、内存泄漏或重复昂贵对象。",
          "无状态且创建便宜的类通常不需要作用域。只有需要共享身份或创建成本高的对象才标注 @Singleton 等作用域，并确保它依赖的对象寿命不短于自己。",
        ],
        kotlinCode: `@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideOkHttp(): OkHttpClient =
        OkHttpClient.Builder().build()
}`,
      },
      {
        id: "bindings-qualifiers",
        eyebrow: "03 · 绑定与 Qualifier",
        title: "接口用 @Binds，同类型多实现用 Qualifier",
        paragraphs: [
          "@Binds 告诉 Hilt 某个实现满足某个接口，方法本身没有运行时代码；@Provides 用于无法修改构造函数的第三方类型。同一类型存在生产、缓存或认证版本时，使用自定义 Qualifier 明确区分，不能依赖参数名猜测。",
          "Context 也有不同寿命。单例依赖只能使用 @ApplicationContext；把 Activity Context 放进单例会让整个页面无法释放。",
        ],
        kotlinCode: `@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class Authenticated

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindUserRepository(
        impl: OfflineFirstUserRepository,
    ): UserRepository
}`,
      },
      {
        id: "viewmodel-testing",
        eyebrow: "04 · ViewModel 与测试",
        title: "Hilt 创建 ViewModel，测试替换外部边界",
        paragraphs: [
          "@HiltViewModel 允许 SavedStateHandle 和业务依赖一起进入构造函数，页面继续使用 by viewModels 或 hiltViewModel 获取实例。不要在 Composable 内手动 new Repository，也不要把 NavController 注入 ViewModel。",
          "测试可使用 @TestInstallIn 替换生产 Module，或在纯单元测试中直接构造 ViewModel 并传入 Fake。依赖注入框架不应该迫使所有测试启动 Android 容器。",
        ],
        kotlinCode: `@HiltViewModel
class UserViewModel @Inject constructor(
    private val repository: UserRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel()

@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [NetworkModule::class],
)
object FakeNetworkModule`,
        note: "优先测试业务行为，而不是测试 Hilt 能不能生成对象；Hilt 集成测试只覆盖关键绑定图。",
      },
    ],
    exercise: {
      title: "为用户功能建立可测试 Hilt 依赖图",
      prompt: "注入 UserApi、UserDao、UserRepository 与 UserViewModel。OkHttpClient 需要普通和带登录态两个版本；Repository 为接口。写出组件、作用域、Qualifier、@Binds/@Provides，并说明测试如何替换 UserApi。",
      hint: "OkHttpClient 属于进程级资源；ViewModel 不应成为单例。接口绑定用 @Binds，第三方对象用 @Provides。",
    },
  },

  "room-advanced": {
    sections: [
      {
        id: "schema-index",
        eyebrow: "01 · Schema",
        title: "Entity 是数据库契约，不是 UI 模型",
        paragraphs: [
          "Entity 需要稳定主键、明确列名和真正服务查询的索引。网络 DTO、数据库 Entity 与领域模型变化原因不同，应通过 mapper 隔离。不要因为字段看起来相同就让一个 data class 横跨三层。",
          "索引加速读取但增加写入成本和存储空间，应根据 WHERE、JOIN 与 ORDER BY 的实际查询建立。唯一索引还能把业务不变量交给数据库保证。",
        ],
        kotlinCode: `@Entity(
    tableName = "users",
    indices = [Index(value = ["email"], unique = true)],
)
data class UserEntity(
    @PrimaryKey val id: Long,
    val email: String,
    val displayName: String,
    val updatedAt: Long,
)`,
      },
      {
        id: "relations-transactions",
        eyebrow: "02 · 关系与事务",
        title: "跨表读写要声明一致性边界",
        paragraphs: [
          "@Embedded 与 @Relation 可以组合查询结果，但复杂关系要关注生成 SQL 和 N+1 风险。一次业务操作需要同时更新多张表时，使用 @Transaction DAO 方法或 database.withTransaction，确保观察者不会看到半完成状态。",
          "事务函数内部不做慢网络请求。先在事务外请求远端，再在短事务内替换本地数据；否则会长时间占用数据库连接并阻塞其他操作。",
        ],
        kotlinCode: `data class UserWithPosts(
    @Embedded val user: UserEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "authorId",
    )
    val posts: List<PostEntity>,
)

@Transaction
@Query("SELECT * FROM users WHERE id = :id")
fun observeUserWithPosts(id: Long): Flow<UserWithPosts?>`,
      },
      {
        id: "migration",
        eyebrow: "03 · Migration",
        title: "数据库升级必须证明旧数据能安全到达新 Schema",
        paragraphs: [
          "开发阶段 destructiveMigration 很方便，但生产环境会直接丢失用户数据。每次 Schema 变化都要提供 Migration 或受支持的 AutoMigration，并导出 Schema 文件进入版本控制。",
          "Migration 测试从真实旧 Schema 创建数据库，写入代表性数据，执行升级后再验证表结构和业务数据。只断言“能打开数据库”不足以发现默认值、索引或字段映射错误。",
        ],
        kotlinCode: `val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "ALTER TABLE users ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS index_users_updatedAt ON users(updatedAt)",
        )
    }
}`,
      },
      {
        id: "flow-testing",
        eyebrow: "04 · Flow 与测试",
        title: "DAO Flow 负责失效通知，测试负责验证数据语义",
        paragraphs: [
          "Room 的 Flow 会在相关表变化后重新执行查询，因此 Repository 可以把数据库作为事实来源。查询是否发射、顺序是否稳定、事务是否原子，都应在内存数据库测试中验证。",
          "测试关闭数据库并让查询在测试调度器中完成；不要 mock Room DAO 的 SQL 行为。Repository 单元测试可使用 Fake DAO，而真正的查询、索引和 Migration 必须交给 Room 集成测试。",
        ],
        kotlinCode: `@Test
fun observe_emits_updated_user() = runTest {
    dao.upsert(UserEntity(1, "a@b.com", "Ada", 0))
    val first = dao.observe(1).first()

    dao.upsert(first!!.copy(displayName = "Ada Lovelace"))

    assertEquals("Ada Lovelace", dao.observe(1).first()!!.displayName)
}`,
      },
    ],
    exercise: {
      title: "完成一次不丢数据的 Room 升级",
      prompt: "users 表 v1 只有 id、name；v2 增加非空 updatedAt 和 name 索引，并新增 posts 表。写出 Entity、Migration(1,2)、一次用户与文章的事务查询，以及 Migration 测试的关键断言。",
      hint: "新增非空列必须提供旧行可用的默认值；测试既检查列和索引，也检查升级前插入的用户仍存在。",
    },
  },

  datastore: {
    sections: [
      {
        id: "preferences",
        eyebrow: "01 · Preferences",
        title: "小型设置使用 Preferences DataStore，而不是同步 SharedPreferences",
        paragraphs: [
          "Preferences DataStore 通过 Flow 异步读取，并在 edit 事务中更新。Key 仍是动态的，适合主题、排序方式和已读提示等简单配置。实例应在 Context 顶层只创建一次，再通过 Repository 暴露。",
          "读取时处理 IOException 并回退默认 Preferences；其他异常继续抛出。不要在 UI 或 Composable 中直接调用 DataStore，把存储细节留在数据层。",
        ],
        kotlinCode: `val Context.settingsDataStore by preferencesDataStore(
    name = "settings",
)

private val THEME = stringPreferencesKey("theme")

val theme: Flow<Theme> = dataStore.data
    .catch { error ->
        if (error is IOException) emit(emptyPreferences()) else throw error
    }
    .map { values -> Theme.from(values[THEME]) }`,
      },
      {
        id: "proto",
        eyebrow: "02 · Proto",
        title: "需要类型和 Schema 演进时选择 Proto DataStore",
        paragraphs: [
          "Proto DataStore 使用明确消息类型，编译器能检查字段；Serializer 定义默认值以及输入输出。它适合字段较多、需要版本演进或希望消除字符串 Key 的设置模型。",
          "Proto 不适合大型关系数据、部分更新查询或分页，那些仍属于 Room。DataStore 的核心是保存一份小型对象，而不是成为通用数据库。",
        ],
        kotlinCode: `object SettingsSerializer : Serializer<Settings> {
    override val defaultValue: Settings = Settings.getDefaultInstance()

    override suspend fun readFrom(input: InputStream): Settings =
        try {
            Settings.parseFrom(input)
        } catch (error: InvalidProtocolBufferException) {
            throw CorruptionException("设置文件损坏", error)
        }

    override suspend fun writeTo(
        value: Settings,
        output: OutputStream,
    ) = value.writeTo(output)
}`,
      },
      {
        id: "migration-update",
        eyebrow: "03 · 迁移与更新",
        title: "从 SharedPreferences 迁移一次，更新始终基于最新快照",
        paragraphs: [
          "SharedPreferencesMigration 可在 DataStore 首次读取前搬迁旧值。迁移成功后应删除或停止写旧存储，避免两个事实来源互相覆盖。",
          "updateData 和 edit 都是串行事务。调用方传业务意图，Repository 根据最新值生成新设置；不要先读取 Flow.value 再另行写入，否则并发更新可能丢失。",
        ],
        kotlinCode: `suspend fun setDarkMode(enabled: Boolean) {
    dataStore.updateData { current ->
        current.toBuilder()
            .setDarkMode(enabled)
            .build()
    }
}`,
      },
      {
        id: "repository-test",
        eyebrow: "04 · Repository 与测试",
        title: "UI 观察领域设置，测试使用临时文件",
        paragraphs: [
          "SettingsRepository 把存储模型映射成 AppSettings，ViewModel 再 stateIn 为页面状态。进程重建后 DataStore 会重新发出已保存设置，旋转则由 ViewModel 热流直接恢复。",
          "测试为每个用例创建独立临时文件和 TestScope，写入后读取 first，并在结束时取消作用域与删除文件。这样可以真实验证序列化、默认值和事务更新。",
        ],
        kotlinCode: `class SettingsRepository(
    private val dataStore: DataStore<Settings>,
) {
    val settings: Flow<AppSettings> =
        dataStore.data.map(Settings::toDomain)

    suspend fun setTheme(theme: Theme) {
        dataStore.updateData { it.copy { this.theme = theme.name } }
    }
}`,
      },
    ],
    exercise: {
      title: "把主题设置迁移到 DataStore",
      prompt: "旧项目用 SharedPreferences 保存 theme 与 dynamicColor。设计 Preferences 或 Proto DataStore、一次性迁移、SettingsRepository、ViewModel StateFlow，并写出测试：默认值、修改后发射、进程重建可重新读取。",
      hint: "字段较少可选 Preferences；若选择 Proto，要提供 Serializer 与默认实例。UI 只能访问 Repository 的领域设置。",
    },
  },

  workmanager: {
    sections: [
      {
        id: "when-to-use",
        eyebrow: "01 · 选择边界",
        title: "只有必须跨进程继续的可延迟任务才交给 WorkManager",
        paragraphs: [
          "页面可见期间的请求属于 viewModelScope；精确闹钟、媒体播放等有专门 API；必须在满足条件后最终完成的上传、同步和清理，才适合 WorkManager。它提供持久调度，不保证立刻执行。",
          "Worker 必须幂等，因为系统、进程或网络可能让任务重试。输入只传小型标识，真正数据从数据库读取；不要把大对象塞进 Data。",
        ],
        kotlinCode: `class SyncWorker(
    appContext: Context,
    params: WorkerParameters,
    private val repository: SyncRepository,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result =
        try {
            repository.sync()
            Result.success()
        } catch (error: IOException) {
            Result.retry()
        }
}`,
      },
      {
        id: "constraints-unique",
        eyebrow: "02 · 约束与唯一工作",
        title: "让系统选择时机，让业务选择去重策略",
        paragraphs: [
          "Constraints 可以要求联网、充电、空闲或足够存储。约束不满足时任务等待，不应在 Worker 内轮询网络。唯一工作防止同一业务被重复入队，KEEP、REPLACE 与 APPEND 代表不同产品语义。",
          "同步通常使用唯一名称和 KEEP；用户明确要求刷新时可能使用 REPLACE；分阶段处理可用链式工作。策略必须和幂等性一起设计。",
        ],
        kotlinCode: `val request = OneTimeWorkRequestBuilder<SyncWorker>()
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build(),
    )
    .setBackoffCriteria(
        BackoffPolicy.EXPONENTIAL,
        30,
        TimeUnit.SECONDS,
    )
    .build()

workManager.enqueueUniqueWork(
    "user-sync",
    ExistingWorkPolicy.KEEP,
    request,
)`,
      },
      {
        id: "progress-chain",
        eyebrow: "03 · 进度与链式任务",
        title: "持久进度来自 WorkInfo，业务结果仍写数据库",
        paragraphs: [
          "Worker 可通过 setProgress 发布短期进度，页面观察 WorkInfo 展示百分比。最终业务事实应写 Room，不能只保存在 WorkInfo outputData，因为其他页面也需要统一观察。",
          "链式工作适合先压缩、再上传、最后清理。每一步只负责一个可重试边界；任何共享临时文件都要在失败和取消时安全清理。",
        ],
        kotlinCode: `workManager
    .beginUniqueWork(
        "avatar-upload-" + userId,
        ExistingWorkPolicy.REPLACE,
        compressRequest,
    )
    .then(uploadRequest)
    .then(cleanupRequest)
    .enqueue()`,
      },
      {
        id: "worker-testing",
        eyebrow: "04 · 测试",
        title: "测试 Worker 结果，也测试约束与重试次数",
        paragraphs: [
          "CoroutineWorker 单元测试注入 Fake Repository，分别验证成功、可重试网络错误和不可重试业务错误。WorkManager 集成测试使用测试初始化器和 TestDriver 主动满足约束，不等待真实系统调度。",
          "不要断言任务“马上开始”。正确断言是入队策略、约束、状态迁移和最终数据库结果。生产中还要记录 attempt 次数和最后失败原因，避免无限重试。",
        ],
        kotlinCode: `@Test
fun network_failure_requests_retry() = runTest {
    val worker = TestListenableWorkerBuilder<SyncWorker>(context)
        .setWorkerFactory(fakeWorkerFactory)
        .build()

    assertEquals(ListenableWorker.Result.retry(), worker.doWork())
}`,
      },
    ],
    exercise: {
      title: "设计一个可靠的离线收藏同步任务",
      prompt: "本地收藏写 Room 后最终同步服务器。要求有网才执行、同一用户不重复入队、网络错误指数退避、401 不无限重试、页面可观察进度。写出 CoroutineWorker、Request 和入队代码，并给出三条关键测试。",
      hint: "本地数据库先记录 pending 操作；Worker 读取 pending 队列并幂等提交。区分 retry 与 failure。",
    },
  },

  "paging-3": {
    sections: [
      {
        id: "paging-source",
        eyebrow: "01 · PagingSource",
        title: "PagingSource 描述如何按 key 加载一页",
        paragraphs: [
          "PagingSource 的 Key 可以是页码、游标或数据库位置，Value 是领域或数据库行。load 根据 LoadParams 返回 Page 或 Error，并给出 prevKey、nextKey。refreshKey 决定失效后从用户附近哪个位置恢复。",
          "PagingSource 实例只能服务一代数据，失效后 Pager 会创建新实例。不要把可变页码保存在 Repository 单例中。",
        ],
        kotlinCode: `class UserPagingSource(
    private val api: UserApi,
) : PagingSource<Int, User>() {
    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, User> =
        try {
            val page = params.key ?: 1
            val users = api.users(page, params.loadSize)
            LoadResult.Page(
                data = users,
                prevKey = if (page == 1) null else page - 1,
                nextKey = if (users.isEmpty()) null else page + 1,
            )
        } catch (error: Exception) {
            LoadResult.Error(error)
        }
}`,
      },
      {
        id: "pager-viewmodel",
        eyebrow: "02 · Pager",
        title: "Pager 生成 Flow，cachedIn 共享同一代分页数据",
        paragraphs: [
          "Pager 组合 PagingConfig 与 pagingSourceFactory，向上层提供 Flow<PagingData<T>>。ViewModel 使用 cachedIn(viewModelScope)，让旋转后的新 UI 继续使用已加载页面并避免重复请求。",
          "查询条件变化时用 flatMapLatest 创建新 Pager；PagingConfig 的 pageSize、prefetchDistance 和 initialLoadSize 要根据接口、屏幕和数据大小测量，不照抄固定值。",
        ],
        kotlinCode: `val users: Flow<PagingData<User>> = query
    .debounce(300)
    .distinctUntilChanged()
    .flatMapLatest { text ->
        Pager(
            config = PagingConfig(pageSize = 30),
            pagingSourceFactory = { dao.pagingSource(text) },
        ).flow
    }
    .cachedIn(viewModelScope)`,
      },
      {
        id: "load-state",
        eyebrow: "03 · LoadState",
        title: "刷新、追加和空态是不同的 UI 状态",
        paragraphs: [
          "CombinedLoadStates 分别描述 refresh、prepend、append。首次 refresh Loading 显示整页加载，已有内容时 append Loading 只显示尾部进度；错误也要区分首次失败和追加失败。",
          "空态必须在 refresh NotLoading 且 itemCount 为 0 时出现，不能在首次加载前闪现。retry 重试失败步骤，refresh 则创建新一代数据，产品语义不同。",
        ],
        kotlinCode: `val showEmpty =
    items.loadState.refresh is LoadState.NotLoading &&
        items.itemCount == 0

when (val refresh = items.loadState.refresh) {
    LoadState.Loading -> FullScreenLoading()
    is LoadState.Error -> ErrorPane(
        message = refresh.error.message,
        onRetry = items::retry,
    )
    is LoadState.NotLoading -> UserList(items)
}`,
      },
      {
        id: "remote-mediator",
        eyebrow: "04 · RemoteMediator",
        title: "RemoteMediator 更新数据库，UI 永远分页读取 Room",
        paragraphs: [
          "网络加数据库分页时，PagingSource 来自 Room，RemoteMediator 根据 LoadType 请求远端并在事务里写 Entity 与 RemoteKey。这样缓存、离线和失效通知仍由数据库统一负责。",
          "REFRESH 要决定是否清空旧数据，APPEND 要从 RemoteKey 找下一页，PREPEND 可按产品直接结束。网络响应与 RemoteKey 必须同一事务写入，否则进程中断会留下无法继续的页状态。",
        ],
        kotlinCode: `database.withTransaction {
    if (loadType == LoadType.REFRESH) {
        remoteKeyDao.clear()
        userDao.clear()
    }
    userDao.upsertAll(response.items.map(UserDto::toEntity))
    remoteKeyDao.upsert(
        RemoteKey(query = query, nextPage = response.nextPage),
    )
}`,
        note: "RemoteMediator 不是第二个 UI 数据源。页面仍只收集 Room 创建的 PagingData。",
      },
    ],
    exercise: {
      title: "实现可离线搜索的 Paging 3 列表",
      prompt: "搜索接口按 page 返回用户，本地使用 Room。写出 Pager、DAO PagingSource、RemoteMediator 的 REFRESH/APPEND 主逻辑和 Compose/View 加载状态处理。要求旋转不重载、离线显示缓存、追加失败可单独重试。",
      hint: "Pager 使用 Room pagingSourceFactory，RemoteMediator 只负责更新 Room；Flow 在 ViewModel cachedIn。",
    },
  },

  navigation: {
    sections: [
      {
        id: "typed-routes",
        eyebrow: "01 · 路由",
        title: "目的地使用类型安全 Route，只传恢复页面所需的最小参数",
        paragraphs: [
          "导航参数用于标识目的地，不用于搬运整份可变对象。详情页传 userId，再由 SavedStateHandle 和 Repository 恢复数据。类型安全 Route 可以让参数、编码和目的地在编译期关联。",
          "敏感信息、超大对象和容易过期的列表不应进入路由。Parcelable 适合小型 UI 参数，但不是数据库替代品。",
        ],
        kotlinCode: `@Serializable
data object UsersRoute

@Serializable
data class UserDetailRoute(val userId: Long)

navController.navigate(UserDetailRoute(userId = user.id))`,
      },
      {
        id: "back-stack",
        eyebrow: "02 · 返回栈",
        title: "navigate、popBackStack 与 launchSingleTop 改变的是栈语义",
        paragraphs: [
          "每次 navigate 通常压入新目的地，返回键弹出顶部。launchSingleTop 防止顶部重复实例，popUpTo 可以清除登录或引导流程。错误配置常造成返回到不该存在的页面或重复创建同一详情。",
          "返回栈 Entry 有自己的 Lifecycle、SavedStateHandle 和 ViewModelStore。作用域到图或 Entry 的 ViewModel 可以跨同一流程共享，但要明确何时随栈弹出而清除。",
        ],
        kotlinCode: `navController.navigate(HomeRoute) {
    popUpTo(LoginRoute) {
        inclusive = true
    }
    launchSingleTop = true
}`,
      },
      {
        id: "nested-deep-links",
        eyebrow: "03 · 嵌套图与深链",
        title: "嵌套图表达流程，Deep Link 必须经过同一参数校验",
        paragraphs: [
          "登录、下单等多步骤流程可放入嵌套图，对外只暴露流程入口。深链可能从冷启动、已有任务或通知进入，不能假设前置页面已经执行。",
          "Deep Link 的 host、path 和参数都要验证；需要登录时先保存目标，再跳转认证，成功后恢复。外部 URI 不可信，不能直接拼 SQL、文件路径或 WebView 地址。",
        ],
        kotlinCode: `composable<UserDetailRoute>(
    deepLinks = listOf(
        navDeepLink<UserDetailRoute>(
            basePath = "https://example.com/users",
        ),
    ),
) { entry ->
    val route = entry.toRoute<UserDetailRoute>()
    UserDetailScreen(userId = route.userId)
}`,
      },
      {
        id: "results-testing",
        eyebrow: "04 · 结果与测试",
        title: "结果属于前一个 Entry，导航行为要在测试中验证",
        paragraphs: [
          "选择器返回结果时，可写入 previousBackStackEntry.savedStateHandle，再弹栈；前一页观察并在处理后清除。需要跨进程保证的业务结果仍应写数据库。",
          "导航测试断言起点、点击后的当前目的地、参数、返回行为和深链。Composable 或 Fragment 最好接收 onOpenUser 回调，使普通 UI 测试不必创建真实 NavController。",
        ],
        kotlinCode: `navController.previousBackStackEntry
    ?.savedStateHandle
    ?.set("selected_user_id", userId)
navController.popBackStack()

// UI 只上报导航意图
UserRow(onClick = { onOpenUser(user.id) })`,
      },
    ],
    exercise: {
      title: "设计一个可深链进入的用户流程",
      prompt: "实现 Users、UserDetail(userId)、EditUser(userId) 三个类型安全目的地。详情可从 https://example.com/users/{id} 进入，编辑成功返回 saved 结果；登录后清除 Login。写出路由、NavHost 主代码和导航测试断言。",
      hint: "UI Composable/Fragment 接收导航回调；只有根节点持有 NavController。深链参数先验证，再交给 ViewModel。",
    },
  },

  "android-testing": {
    sections: [
      {
        id: "test-pyramid",
        eyebrow: "01 · 分层",
        title: "把测试放在最便宜且能证明行为的层",
        paragraphs: [
          "纯业务规则、mapper、UseCase 和 ViewModel 优先本地单元测试；SQL、Migration、Worker 调度和 Android 生命周期使用对应集成测试；关键用户旅程再用 Espresso 或 Compose UI 测试。全部依赖端到端测试会慢且难定位。",
          "测试名称描述前置条件、动作与结果。不要只覆盖代码行，要覆盖取消、并发失败、旋转、进程恢复和离线等真正风险。",
        ],
        kotlinCode: `@Test
fun retry_keeps_cached_content_and_clears_error() = runTest {
    repository.emitCached(user)
    repository.failNextRefresh(IOException("offline"))

    viewModel.retry()
    advanceUntilIdle()

    assertEquals(user, viewModel.uiState.value.user)
    assertEquals("offline", viewModel.uiState.value.error)
}`,
      },
      {
        id: "coroutine-flow-tests",
        eyebrow: "02 · 协程与 Flow",
        title: "所有协程共享一个 TestScheduler",
        paragraphs: [
          "runTest 提供虚拟时间；注入的 StandardTestDispatcher 应使用同一个 testScheduler。MainDispatcherRule 在测试前替换 Dispatchers.Main，结束后恢复，避免 viewModelScope 依赖真实主线程。",
          "StateFlow 测试既可检查 value，也可使用收集工具验证完整发射序列。包含 WhileSubscribed 时要启动收集器，否则上游可能不会运行。",
        ],
        kotlinCode: `@get:Rule
val mainDispatcherRule = MainDispatcherRule()

@Test
fun debounce_waits_300_ms() = runTest {
    viewModel.onQueryChanged("Kotlin")
    advanceTimeBy(299)
    assertTrue(repository.queries.isEmpty())

    advanceTimeBy(1)
    runCurrent()
    assertEquals(listOf("Kotlin"), repository.queries)
}`,
      },
      {
        id: "component-tests",
        eyebrow: "03 · Jetpack 组件",
        title: "Room、WorkManager 与 Navigation 测真实框架行为",
        paragraphs: [
          "Room 使用内存数据库验证 SQL、事务与 Migration；WorkManager TestDriver 主动满足约束；Navigation 使用测试 NavController 验证图与返回栈。这些行为不适合用 Mockito 猜测。",
          "测试资源要在 finally 或 @After 中释放。数据库、服务器和调度器泄漏会让整套测试随机失败。",
        ],
        kotlinCode: `@Before
fun createDatabase() {
    database = Room.inMemoryDatabaseBuilder(
        context,
        AppDatabase::class.java,
    ).allowMainThreadQueries().build()
}

@After
fun closeDatabase() = database.close()`,
      },
      {
        id: "ui-tests",
        eyebrow: "04 · UI 与替身",
        title: "UI 测试面向用户可观察行为，不依赖内部实现",
        paragraphs: [
          "Espresso 或 Compose 测试查找可见文本、语义与可点击控件，执行真实操作并断言页面结果。不要断言私有字段或 ViewModel 方法调用次数，那会让正常重构破坏测试。",
          "Fake 比无边界 Mock 更适合状态型依赖：Fake Repository 可以主动发射缓存、失败和延迟结果。网络契约测试使用 MockWebServer，验证路径、请求体和错误映射。",
        ],
        kotlinCode: `@Test
fun offline_cache_is_visible_and_retry_recovers() {
    fakeRepository.emitCached(user)
    launchUserScreen()

    onView(withText("Ada")).check(matches(isDisplayed()))
    onView(withId(R.id.retry)).perform(click())
    onView(withText("已更新")).check(matches(isDisplayed()))
}`,
        note: "稳定测试的关键不是增加 sleep，而是控制时间、调度器、数据源和生命周期。",
      },
    ],
    exercise: {
      title: "为离线详情页设计测试矩阵",
      prompt: "给 UserDao、UserRepository、UserViewModel、WorkManager 同步和 Fragment/Compose 页面分别写一条最关键测试。覆盖缓存先显示、网络失败不清空、重试成功、旋转不重复请求与进程恢复，并说明每条属于哪一层。",
      hint: "同一行为不必在五层重复测试；把 SQL 交给 Room 测试，把状态组合交给 ViewModel 测试，把完整用户旅程留给 UI 测试。",
    },
  },
};
