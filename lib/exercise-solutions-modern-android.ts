import type { ExerciseSolution } from "./exercise-solutions";

export const modernAndroidExerciseSolutions: Record<string, ExerciseSolution> = {
  "modern-android-architecture": {
    solution: `// 1. 持久层模型：购物车事实进入 Room，不能只放在 ViewModel 内存中
data class CartItem(
    val productId: Long,
    val title: String,
    val quantity: Int,
    val unitPrice: Long,
)

data class Cart(
    val id: Long,
    val items: List<CartItem>,
) {
    val totalPrice: Long = items.sumOf { it.unitPrice * it.quantity }
}

interface CartRepository {
    fun observeCart(cartId: Long): Flow<Cart>
    suspend fun ensureCart(cartId: Long)
}

interface OrderRepository {
    // requestId 是幂等键：进程重建后重复发送也只能生成一个订单
    suspend fun submit(cart: Cart, requestId: String): Long
    suspend fun saveSubmittedOrder(cartId: Long, requestId: String, orderId: Long)
    fun observeSubmittedOrder(cartId: Long): Flow<Long?>
}

class SubmitOrderUseCase(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
) {
    suspend operator fun invoke(cartId: Long, requestId: String): Long {
        val cart = cartRepository.observeCart(cartId).first()
        require(cart.items.isNotEmpty()) { "购物车不能为空" }

        val orderId = orderRepository.submit(cart, requestId)
        // 先持久化成功事实，页面再通过 Flow 得到结果
        orderRepository.saveSubmittedOrder(cartId, requestId, orderId)
        return orderId
    }
}

data class CartUiState(
    val items: List<CartItem> = emptyList(),
    val totalPrice: Long = 0,
    val submitting: Boolean = false,
    val error: String? = null,
    val submittedOrderId: Long? = null,
)

sealed interface CartAction {
    data object Submit : CartAction
    data object Retry : CartAction
    data object ErrorShown : CartAction
}

class CartViewModel(
    savedStateHandle: SavedStateHandle,
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val submitOrder: SubmitOrderUseCase,
) : ViewModel() {
    private val cartId: Long = checkNotNull(savedStateHandle["cartId"])

    // 幂等键写入 SavedStateHandle，可跨进程重建恢复
    private val requestId: String =
        savedStateHandle.get<String>("submitRequestId")
            ?: UUID.randomUUID().toString().also {
                savedStateHandle["submitRequestId"] = it
            }

    private val submitting = MutableStateFlow(false)
    private val error = MutableStateFlow<String?>(null)
    private var submitJob: Job? = null

    val uiState: StateFlow<CartUiState> = combine(
        cartRepository.observeCart(cartId),
        orderRepository.observeSubmittedOrder(cartId),
        submitting,
        error,
    ) { cart, orderId, isSubmitting, message ->
        CartUiState(
            items = cart.items,
            totalPrice = cart.totalPrice,
            submitting = isSubmitting,
            error = message,
            submittedOrderId = orderId,
        )
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        CartUiState(),
    )

    init {
        viewModelScope.launch { cartRepository.ensureCart(cartId) }
    }

    fun onAction(action: CartAction) {
        when (action) {
            CartAction.Submit, CartAction.Retry -> submit()
            CartAction.ErrorShown -> error.value = null
        }
    }

    private fun submit() {
        // 旋转沿用同一个 ViewModel；活跃 Job 存在时不重复提交
        if (submitJob?.isActive == true || submitting.value) return
        submitJob = viewModelScope.launch {
            submitting.value = true
            error.value = null
            try {
                submitOrder(cartId, requestId)
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Throwable) {
                error.value = failure.message ?: "提交失败，请重试"
            } finally {
                submitting.value = false
            }
        }
    }
}

@Composable
fun CartRoute(
    viewModel: CartViewModel = hiltViewModel(),
    onOrderCreated: (Long) -> Unit,
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    // 导航是 UI 行为；持久成功事实仍由 Repository 保存
    LaunchedEffect(state.submittedOrderId) {
        state.submittedOrderId?.let(onOrderCreated)
    }

    CartScreen(
        state = state,
        onSubmit = { viewModel.onAction(CartAction.Submit) },
        onRetry = { viewModel.onAction(CartAction.Retry) },
    )
}

// 主链路：
// 点击 Submit → ViewModel 防重复 → UseCase 读取 Room 购物车
// → OrderRepository 以 requestId 幂等提交 → 成功结果写入持久层
// → Repository Flow 发射 → UiState 更新 → Screen 渲染/导航。`,
    solutionExplanation: "CartScreen 只渲染和上报事件；ViewModel 是页面状态与提交 Job 的所有者；UseCase 保存可复用的提交规则；CartRepository 持有购物车事实；OrderRepository 管理幂等提交与成功结果。旋转复用 ViewModel，不会重建活跃 Job；进程死亡后 Room 恢复购物车、SavedStateHandle 恢复 requestId，服务端幂等键避免重复下单。",
    solutionChecks: ["五个组件职责与事件到状态主链路齐全", "旋转通过 ViewModel Job 防重复，进程重建通过 Room 与幂等键恢复", "提交中、错误、成功结果和重试均有明确状态"],
    solutionRoles: [
      { component: "CartScreen", responsibility: "渲染 UiState、把点击转成回调", boundary: "不访问 Repository，不拥有业务状态" },
      { component: "CartViewModel", responsibility: "合成页面状态、处理事件、持有提交 Job", boundary: "不保存购物车唯一事实，不执行导航" },
      { component: "SubmitOrderUseCase", responsibility: "校验购物车并编排幂等提交", boundary: "不依赖 Android UI 类型" },
      { component: "CartRepository", responsibility: "从 Room 提供可恢复购物车事实", boundary: "不处理页面 loading/error" },
      { component: "OrderRepository", responsibility: "提交订单并持久化提交结果", boundary: "不直接更新 UI" },
    ],
  },

  "hilt-dependency-injection": {
    solution: `// Application 是 Hilt 组件树入口
@HiltAndroidApp
class LearningApp : Application()

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class PlainClient

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AuthClient

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    @PlainClient
    fun providePlainClient(): OkHttpClient =
        OkHttpClient.Builder().build()

    @Provides
    @Singleton
    @AuthClient
    fun provideAuthClient(
        tokenProvider: TokenProvider,
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .header("Authorization", "Bearer " + tokenProvider.current())
                .build()
            chain.proceed(request)
        }
        .build()

    @Provides
    @Singleton
    fun provideUserApi(
        @AuthClient client: OkHttpClient,
    ): UserApi = Retrofit.Builder()
        .baseUrl("https://api.example.com/")
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create())
        .build()
        .create(UserApi::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context,
    ): AppDatabase = Room.databaseBuilder(
        context,
        AppDatabase::class.java,
        "learning.db",
    ).build()

    @Provides
    fun provideUserDao(database: AppDatabase): UserDao = database.userDao()
}

interface UserRepository {
    fun observe(id: Long): Flow<User?>
    suspend fun refresh(id: Long)
}

@Singleton
class OfflineFirstUserRepository @Inject constructor(
    private val api: UserApi,
    private val dao: UserDao,
) : UserRepository {
    override fun observe(id: Long): Flow<User?> =
        dao.observe(id).map { entity -> entity?.toDomain() }

    override suspend fun refresh(id: Long) {
        dao.upsert(api.getUser(id).toEntity())
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    // 接口到自有实现使用 @Binds
    @Binds
    @Singleton
    abstract fun bindUserRepository(
        implementation: OfflineFirstUserRepository,
    ): UserRepository
}

@HiltViewModel
class UserViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: UserRepository,
) : ViewModel() {
    private val userId: Long = checkNotNull(savedStateHandle["userId"])
    val user = repository.observe(userId)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
}

@AndroidEntryPoint
class UserFragment : Fragment(R.layout.fragment_user) {
    private val viewModel: UserViewModel by viewModels()
}

// androidTest：用测试模块替换真实网络模块
@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [NetworkModule::class],
)
object FakeNetworkModule {
    @Provides
    @Singleton
    fun provideFakeUserApi(): UserApi = FakeUserApi()

    // 若其他绑定仍需要两个 Client，也要完整提供对应 Qualifier
    @Provides @PlainClient
    fun plainClient(): OkHttpClient = OkHttpClient()

    @Provides @AuthClient
    fun authClient(): OkHttpClient = OkHttpClient()
}

// 纯 JVM ViewModel 测试更直接：不启动 Hilt，手动传 FakeUserRepository。
// Hilt 集成测试只验证关键组件图和 Module 替换是否正确。`,
    solutionExplanation: "OkHttpClient 和 Retrofit 属于进程级资源，安装在 SingletonComponent；UserViewModel 由 ViewModelComponent 管理，不能标成单例。第三方构造用 @Provides，接口绑定用 @Binds，同类型客户端通过 Qualifier 区分。生产 UserApi 可被 @TestInstallIn 模块整体替换。",
    solutionChecks: ["Application、组件、作用域与页面入口完整", "普通/登录 Client 使用 Qualifier，@Provides 与 @Binds 分工正确", "给出 @TestInstallIn 替换网络及纯单测 Fake 方案"],
  },

  "room-advanced": {
    solution: `// v2 Schema
@Entity(
    tableName = "users",
    indices = [Index(value = ["name"])],
)
data class UserEntity(
    @PrimaryKey val id: Long,
    val name: String,
    // v1 旧行升级后使用 0，之后由同步流程写入真实时间
    val updatedAt: Long,
)

@Entity(
    tableName = "posts",
    foreignKeys = [
        ForeignKey(
            entity = UserEntity::class,
            parentColumns = ["id"],
            childColumns = ["userId"],
            onDelete = ForeignKey.CASCADE,
        ),
    ],
    indices = [Index(value = ["userId"])],
)
data class PostEntity(
    @PrimaryKey val id: Long,
    val userId: Long,
    val title: String,
)

data class UserWithPosts(
    @Embedded val user: UserEntity,
    @Relation(
        parentColumn = "id",
        entityColumn = "userId",
    )
    val posts: List<PostEntity>,
)

@Dao
interface UserDao {
    @Transaction
    @Query("SELECT * FROM users WHERE id = :id")
    fun observeUserWithPosts(id: Long): Flow<UserWithPosts?>
}

val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        // 新增非空列必须让所有旧行获得合法值
        db.execSQL(
            "ALTER TABLE users ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0",
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS index_users_name ON users(name)",
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                title TEXT NOT NULL,
                PRIMARY KEY(id),
                FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
            )
            """.trimIndent(),
        )
        db.execSQL(
            "CREATE INDEX IF NOT EXISTS index_posts_userId ON posts(userId)",
        )
    }
}

@Database(
    entities = [UserEntity::class, PostEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
}

// androidTest：需要 androidx.room:room-testing 和导出的 schema
@RunWith(AndroidJUnit4::class)
class Migration1To2Test {
    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
    )

    @Test
    fun migrate1To2_keepsUserAndCreatesSchema() {
        helper.createDatabase("migration-test", 1).apply {
            execSQL("INSERT INTO users(id, name) VALUES(1, 'Ada')")
            close()
        }

        helper.runMigrationsAndValidate(
            "migration-test",
            2,
            true,
            MIGRATION_1_2,
        ).use { db ->
            db.query(
                "SELECT id, name, updatedAt FROM users WHERE id = 1",
            ).use { cursor ->
                assertThat(cursor.moveToFirst()).isTrue()
                assertThat(cursor.getLong(0)).isEqualTo(1L)
                assertThat(cursor.getString(1)).isEqualTo("Ada")
                assertThat(cursor.getLong(2)).isEqualTo(0L)
            }

            // 索引必须真实存在，不能只依赖 Entity 声明
            db.query("PRAGMA index_list('users')").use { cursor ->
                val names = buildList {
                    while (cursor.moveToNext()) add(cursor.getString(1))
                }
                assertThat(names).contains("index_users_name")
            }

            // 新表可写，且外键列与索引已建立
            db.execSQL(
                "INSERT INTO posts(id, userId, title) VALUES(10, 1, 'Room')",
            )
            db.query("SELECT COUNT(*) FROM posts").use { cursor ->
                cursor.moveToFirst()
                assertThat(cursor.getInt(0)).isEqualTo(1)
            }
        }
    }
}`,
    solutionExplanation: "迁移先给非空 updatedAt 提供旧数据可用的默认值，再创建 name 索引、posts 表及外键索引。@Transaction 保证 Room 读取父对象及关系集合时看到同一快照；MigrationTestHelper 同时验证 Schema、旧行保留、默认值、索引和新表可写。",
    solutionChecks: ["v2 Entity、关系对象与事务 DAO 完整", "Migration(1,2) 保留旧数据并创建列、表、外键和索引", "迁移测试验证旧行、默认值、索引与新表"],
  },

  datastore: {
    solution: `private object SettingsKeys {
    val theme = stringPreferencesKey("theme")
    val dynamicColor = booleanPreferencesKey("dynamic_color")
}

enum class ThemeMode { SYSTEM, LIGHT, DARK }

data class AppSettings(
    val theme: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = true,
)

val Context.settingsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "settings",
    produceMigrations = { context ->
        listOf(
            SharedPreferencesMigration(
                context = context,
                sharedPreferencesName = "legacy_settings",
                keysToMigrate = setOf("theme", "dynamic_color"),
            ),
        )
    },
)

interface SettingsRepository {
    val settings: Flow<AppSettings>
    suspend fun setTheme(theme: ThemeMode)
    suspend fun setDynamicColor(enabled: Boolean)
}

class DataStoreSettingsRepository(
    private val dataStore: DataStore<Preferences>,
) : SettingsRepository {
    override val settings: Flow<AppSettings> = dataStore.data
        .catch { failure ->
            // 只把可恢复的读取损坏收口为默认值，取消异常继续传播
            if (failure is IOException) emit(emptyPreferences()) else throw failure
        }
        .map { preferences ->
            AppSettings(
                theme = preferences[SettingsKeys.theme]
                    ?.let { runCatching { ThemeMode.valueOf(it) }.getOrNull() }
                    ?: ThemeMode.SYSTEM,
                dynamicColor = preferences[SettingsKeys.dynamicColor] ?: true,
            )
        }

    override suspend fun setTheme(theme: ThemeMode) {
        dataStore.edit { preferences ->
            preferences[SettingsKeys.theme] = theme.name
        }
    }

    override suspend fun setDynamicColor(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[SettingsKeys.dynamicColor] = enabled
        }
    }
}

data class SettingsUiState(
    val theme: ThemeMode = ThemeMode.SYSTEM,
    val dynamicColor: Boolean = true,
)

class SettingsViewModel(
    repository: SettingsRepository,
) : ViewModel() {
    val uiState = repository.settings
        .map { settings ->
            SettingsUiState(settings.theme, settings.dynamicColor)
        }
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            SettingsUiState(),
        )

    fun setTheme(theme: ThemeMode) {
        viewModelScope.launch { repository.setTheme(theme) }
    }
}

class SettingsRepositoryTest {
    private val scope = TestScope()
    private val dataStore = PreferenceDataStoreFactory.create(
        scope = scope,
        produceFile = { temporaryFolder.newFile("settings.preferences_pb") },
    )
    private val repository = DataStoreSettingsRepository(dataStore)

    @Test
    fun emptyStore_emitsDefaults() = scope.runTest {
        assertThat(repository.settings.first()).isEqualTo(AppSettings())
    }

    @Test
    fun setTheme_emitsNewValue() = scope.runTest {
        repository.setTheme(ThemeMode.DARK)
        assertThat(repository.settings.first().theme).isEqualTo(ThemeMode.DARK)
    }

    @Test
    fun recreatedRepository_readsPersistedValue() = scope.runTest {
        repository.setDynamicColor(false)
        // 新实例读取同一个 DataStore 文件，模拟进程重建后的恢复来源
        val recreated = DataStoreSettingsRepository(dataStore)
        assertThat(recreated.settings.first().dynamicColor).isFalse()
    }
}`,
    solutionExplanation: "Theme 与 dynamicColor 属于持久设置，由 DataStore 持有；Repository 把 Preferences 键转换成稳定领域模型，ViewModel 只转成 UI 状态。SharedPreferencesMigration 只执行一次，测试分别证明默认值、更新发射和重新创建 Repository 后仍可读取。",
    solutionChecks: ["DataStore 键、迁移、Repository 与 ViewModel StateFlow 完整", "读取错误只处理 IOException，写入使用原子 edit", "默认值、修改发射和重建读取三类测试齐全"],
  },

  workmanager: {
    solution: `@Entity(tableName = "pending_favorites")
data class PendingFavoriteEntity(
    @PrimaryKey val operationId: String,
    val userId: Long,
    val articleId: Long,
    val favorite: Boolean,
)

@Dao
interface PendingFavoriteDao {
    @Query("SELECT * FROM pending_favorites WHERE userId = :userId")
    suspend fun pendingFor(userId: Long): List<PendingFavoriteEntity>

    @Query("DELETE FROM pending_favorites WHERE operationId = :operationId")
    suspend fun delete(operationId: String)
}

@HiltWorker
class FavoriteSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val dao: PendingFavoriteDao,
    private val api: FavoriteApi,
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val userId = inputData.getLong(KEY_USER_ID, -1L)
        if (userId <= 0L) return Result.failure()

        val operations = dao.pendingFor(userId)
        if (operations.isEmpty()) return Result.success()

        return try {
            operations.forEachIndexed { index, operation ->
                setProgress(
                    workDataOf(
                        KEY_DONE to index,
                        KEY_TOTAL to operations.size,
                    ),
                )
                // operationId 同时作为服务端幂等键
                api.setFavorite(
                    operationId = operation.operationId,
                    articleId = operation.articleId,
                    favorite = operation.favorite,
                )
                dao.delete(operation.operationId)
            }
            Result.success()
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (failure: HttpException) {
            when (failure.code()) {
                401 -> Result.failure(workDataOf(KEY_ERROR to "请重新登录"))
                in 500..599 -> Result.retry()
                else -> Result.failure(workDataOf(KEY_ERROR to "请求不可重试"))
            }
        } catch (failure: IOException) {
            Result.retry()
        }
    }

    companion object {
        const val KEY_USER_ID = "user_id"
        const val KEY_DONE = "done"
        const val KEY_TOTAL = "total"
        const val KEY_ERROR = "error"
    }
}

class FavoriteSyncScheduler(
    private val workManager: WorkManager,
) {
    fun enqueue(userId: Long) {
        val request = OneTimeWorkRequestBuilder<FavoriteSyncWorker>()
            .setInputData(workDataOf(FavoriteSyncWorker.KEY_USER_ID to userId))
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build(),
            )
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                10,
                TimeUnit.SECONDS,
            )
            .addTag("favorite-sync-" + userId)
            .build()

        // 同一用户已有任务时保留原任务，不重复入队
        workManager.enqueueUniqueWork(
            "favorite-sync-" + userId,
            ExistingWorkPolicy.KEEP,
            request,
        )
    }

    fun observe(userId: Long): Flow<WorkInfo?> =
        workManager.getWorkInfosForUniqueWorkFlow("favorite-sync-" + userId)
            .map { infos -> infos.firstOrNull() }
}

// 写收藏主链：Room 事务内更新收藏并写 pending 操作，再调用 scheduler.enqueue(userId)。
// UI 观察 Room 获得即时结果，同时观察 WorkInfo 展示同步进度。

// 三条关键测试：
// 1. WorkerTest：Fake API 抛 IOException，断言 Result.retry() 且 pending 行仍存在。
// 2. WorkerTest：Fake API 抛 401，断言 Result.failure()，不会形成无限退避。
// 3. WorkManagerTestInitHelper：连续 enqueue 两次，断言 unique work 只有一个；
//    API 成功后断言 pending 删除、进度达到 total，Room 收藏值不被回滚。`,
    solutionExplanation: "收藏先写 Room 与 pending 队列，页面立即从本地事实源更新；Worker 只在联网时读取队列并以 operationId 幂等提交。唯一工作名 + KEEP 防止同一用户重复排队，IO/5xx 重试且指数退避，401 明确失败，WorkInfo Flow 暴露进度。",
    solutionChecks: ["CoroutineWorker、联网约束、唯一入队和指数退避完整", "pending 队列与服务端幂等键保证最终一致且可恢复", "覆盖网络重试、401 失败和重复入队三条关键测试"],
  },

  "paging-3": {
    solution: `@Dao
interface UserDao {
    @Query(
        """
        SELECT * FROM users
        WHERE name LIKE '%' || :query || '%'
        ORDER BY name, id
        """,
    )
    fun pagingSource(query: String): PagingSource<Int, UserEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(users: List<UserEntity>)

    @Query("DELETE FROM users WHERE lastQuery = :query")
    suspend fun clearQuery(query: String)
}

@Entity(tableName = "remote_keys")
data class RemoteKey(
    @PrimaryKey val query: String,
    val nextPage: Int?,
)

class UserRemoteMediator(
    private val query: String,
    private val database: AppDatabase,
    private val api: UserApi,
) : RemoteMediator<Int, UserEntity>() {
    override suspend fun load(
        loadType: LoadType,
        state: PagingState<Int, UserEntity>,
    ): MediatorResult {
        val keyDao = database.remoteKeyDao()
        val page = when (loadType) {
            LoadType.REFRESH -> 1
            LoadType.PREPEND -> return MediatorResult.Success(true)
            LoadType.APPEND -> {
                val next = keyDao.key(query)?.nextPage
                if (next == null) return MediatorResult.Success(true)
                next
            }
        }

        return try {
            val response = api.searchUsers(query = query, page = page)
            database.withTransaction {
                if (loadType == LoadType.REFRESH) {
                    // 只清理当前查询的数据，不破坏其他离线缓存
                    database.userDao().clearQuery(query)
                }
                database.userDao().upsertAll(
                    response.items.map { dto -> dto.toEntity(query) },
                )
                keyDao.upsert(
                    RemoteKey(
                        query = query,
                        nextPage = response.nextPage,
                    ),
                )
            }
            MediatorResult.Success(
                endOfPaginationReached = response.nextPage == null,
            )
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (failure: IOException) {
            // Room 中已有页面仍会继续显示
            MediatorResult.Error(failure)
        } catch (failure: HttpException) {
            MediatorResult.Error(failure)
        }
    }
}

class UserRepository(
    private val database: AppDatabase,
    private val api: UserApi,
) {
    fun search(query: String): Flow<PagingData<User>> = Pager(
        config = PagingConfig(
            pageSize = 30,
            prefetchDistance = 5,
            enablePlaceholders = false,
        ),
        remoteMediator = UserRemoteMediator(query, database, api),
        pagingSourceFactory = { database.userDao().pagingSource(query) },
    ).flow.map { data ->
        data.map(UserEntity::toDomain)
    }
}

class SearchViewModel(
    savedStateHandle: SavedStateHandle,
    repository: UserRepository,
) : ViewModel() {
    val query = savedStateHandle.getStateFlow("query", "")

    val users: Flow<PagingData<User>> = query
        .map(String::trim)
        .debounce(300)
        .distinctUntilChanged()
        .flatMapLatest(repository::search)
        // 旋转后的新 UI 收集同一代 PagingData，不重新创建 Pager
        .cachedIn(viewModelScope)

    fun setQuery(value: String) {
        savedStateHandle["query"] = value
    }
}

@Composable
fun UserListRoute(viewModel: SearchViewModel = hiltViewModel()) {
    val users = viewModel.users.collectAsLazyPagingItems()
    val refresh = users.loadState.refresh
    val append = users.loadState.append

    when {
        refresh is LoadState.Loading && users.itemCount == 0 ->
            FullScreenLoading()
        refresh is LoadState.Error && users.itemCount == 0 ->
            FullScreenError(onRetry = users::retry)
        refresh is LoadState.NotLoading && users.itemCount == 0 ->
            EmptyState()
        else -> LazyColumn {
            items(
                count = users.itemCount,
                key = users.itemKey { user -> user.id },
            ) { index ->
                users[index]?.let { UserRow(it) }
            }
            item {
                when (append) {
                    is LoadState.Loading -> AppendLoading()
                    is LoadState.Error -> AppendError(onRetry = users::retry)
                    else -> Unit
                }
            }
        }
    }
}

// View 体系对应使用 PagingDataAdapter + LoadStateAdapter：
// adapter.withLoadStateFooter(FooterAdapter(adapter::retry))。`,
    solutionExplanation: "Room PagingSource 是唯一列表输出；RemoteMediator 的职责只是按 REFRESH/APPEND 拉远端并事务写库。ViewModel 使用 cachedIn 跨旋转保留分页代，离线时 Mediator 返回 Error 但数据库缓存仍显示；UI 分开处理 refresh 与 append，因此追加失败只在尾部提示并可单独 retry。",
    solutionChecks: ["DAO、Pager、RemoteMediator REFRESH/APPEND 主逻辑完整", "cachedIn 跨旋转，Room 缓存支持离线显示", "首次、空态、刷新和追加错误均有独立 UI 与重试"],
  },

  navigation: {
    solution: `@Serializable data object Users
@Serializable data class UserDetail(val userId: Long)
@Serializable data class EditUser(val userId: Long)
@Serializable data object Login

@Composable
fun AppNavHost(
    navController: NavHostController,
    startDestination: Any = Users,
) {
    NavHost(navController, startDestination = startDestination) {
        composable<Users> {
            UsersScreen(
                onOpenUser = { id ->
                    navController.navigate(UserDetail(id))
                },
            )
        }

        composable<UserDetail>(
            deepLinks = listOf(
                navDeepLink<UserDetail>(
                    basePath = "https://example.com/users",
                ),
            ),
        ) { entry ->
            val route = entry.toRoute<UserDetail>()
            require(route.userId > 0) { "userId 必须大于 0" }

            // savedStateHandle 只读一次性返回结果，读取后立即移除
            val saved = entry.savedStateHandle
                .getStateFlow<Boolean?>("saved", null)
                .collectAsStateWithLifecycle()
            LaunchedEffect(saved.value) {
                if (saved.value == true) {
                    showSavedMessage()
                    entry.savedStateHandle.remove<Boolean>("saved")
                }
            }

            UserDetailScreen(
                userId = route.userId,
                onBack = navController::popBackStack,
                onEdit = { navController.navigate(EditUser(route.userId)) },
            )
        }

        composable<EditUser> { entry ->
            val route = entry.toRoute<EditUser>()
            EditUserScreen(
                userId = route.userId,
                onSaved = {
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set("saved", true)
                    navController.popBackStack()
                },
                onBack = navController::popBackStack,
            )
        }

        composable<Login> {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Users) {
                        // 登录页退出返回栈，返回键不会再次打开 Login
                        popUpTo<Login> { inclusive = true }
                        launchSingleTop = true
                    }
                },
            )
        }
    }
}

@RunWith(AndroidJUnit4::class)
class AppNavigationTest {
    @get:Rule val composeRule = createComposeRule()
    private lateinit var navController: TestNavHostController

    @Before
    fun setUp() {
        composeRule.setContent {
            navController = TestNavHostController(LocalContext.current).apply {
                navigatorProvider.addNavigator(ComposeNavigator())
            }
            AppNavHost(navController)
        }
    }

    @Test
    fun clickUser_opensTypedDetailAndBackReturns() {
        composeRule.onNodeWithText("Ada").performClick()
        assertThat(
            navController.currentBackStackEntry?.toRoute<UserDetail>()?.userId,
        ).isEqualTo(1L)

        composeRule.runOnIdle { navController.popBackStack() }
        assertThat(navController.currentDestination?.hasRoute<Users>()).isTrue()
    }

    @Test
    fun editSaved_returnsResultToDetail() {
        composeRule.runOnIdle {
            navController.navigate(UserDetail(1))
            navController.navigate(EditUser(1))
            navController.previousBackStackEntry
                ?.savedStateHandle
                ?.set("saved", true)
            navController.popBackStack()
        }
        composeRule.onNodeWithText("已保存").assertIsDisplayed()
    }
}

// Deep Link 集成测试还应使用 ActivityScenario + Intent：
// ACTION_VIEW, Uri.parse("https://example.com/users/42")，
// 断言当前 route.userId == 42；非法或缺失 id 显示安全错误页。`,
    solutionExplanation: "Route 是可序列化类型，参数不再手拼字符串；只有 AppNavHost 持有 NavController，Screen 接收语义回调。HTTPS Deep Link 进入详情后先验证 id，编辑结果通过前一个 BackStackEntry 的 SavedStateHandle 返回并消费，登录成功用 inclusive popUpTo 移除 Login。",
    solutionChecks: ["Users、Detail、Edit、Login 类型路由与 NavHost 完整", "Deep Link、saved 结果和登录栈清理均有实现", "测试覆盖参数、返回栈、结果与 Deep Link 验证策略"],
  },

  "android-testing": {
    solution: `// 测试矩阵：每层只证明自己的职责，不在所有层重复同一断言。

// 1【Room 集成测试】UserDao：SQL 与 Flow 重新发射
@Test
fun upsert_updatesObservedUser() = runTest {
    val values = mutableListOf<UserEntity?>()
    backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
        dao.observe(1).take(2).toList(values)
    }
    dao.upsert(UserEntity(1, "缓存", 1))
    dao.upsert(UserEntity(1, "新值", 2))
    assertThat(values.last()?.name).isEqualTo("新值")
}

// 2【Repository 单元测试】缓存先显示，网络失败绝不清空
@Test
fun refreshFailure_keepsCachedUser() = runTest {
    dao.seed(UserEntity(1, "离线缓存", 1))
    api.failure = IOException("offline")

    assertFailsWith<IOException> { repository.refresh(1) }

    assertThat(repository.observe(1).first()?.name)
        .isEqualTo("离线缓存")
    assertThat(dao.deleteCalls).isEqualTo(0)
}

// 3【ViewModel 单元测试】失败后 retry 成功，初始化只刷新一次
@Test
fun retry_updatesStateWithoutSecondInitialization() = runTest {
    api.enqueueFailure(IOException("offline"))
    api.enqueueUser(User(1, "Ada"))
    val viewModel = createViewModel(savedStateHandle = SavedStateHandle(
        mapOf("userId" to 1L),
    ))

    viewModel.uiState.test {
        awaitItem()
        assertThat(awaitErrorState().user?.name).isEqualTo("缓存")
        viewModel.retry()
        assertThat(awaitContent("Ada").error).isNull()
    }
    assertThat(api.calls).isEqualTo(2)
}

// 4【WorkManager/Worker 测试】进程可恢复的 pending 队列
@Test
fun worker_retriesThenConsumesPendingOperation() = runTest {
    pendingDao.insert(operation)
    api.failure = IOException("offline")
    assertThat(runWorker()).isEqualTo(ListenableWorker.Result.retry())
    assertThat(pendingDao.count()).isEqualTo(1)

    api.failure = null
    assertThat(runWorker()).isEqualTo(ListenableWorker.Result.success())
    assertThat(pendingDao.count()).isEqualTo(0)
}

// 5【Fragment/Compose 旅程测试】旋转不重复请求，进程恢复仍显示缓存
@Test
fun recreate_keepsContentAndDoesNotRefreshAgain() {
    val scenario = launchFragmentInHiltContainer<UserFragment>(
        fragmentArgs = bundleOf("userId" to 1L),
    )
    onView(withText("离线缓存")).check(matches(isDisplayed()))

    scenario.recreate()

    onView(withText("离线缓存")).check(matches(isDisplayed()))
    assertThat(fakeApi.calls).isEqualTo(1)
}

@Test
fun processRestore_usesSavedIdAndRoomCache() {
    // 真实进程死亡用 Macrobenchmark/UIAutomator 或测试专用重启流程验证；
    // 组件层先证明 SavedStateHandle 恢复 id，Room 文件重开后仍能读取。
    val restored = SavedStateHandle(mapOf("userId" to 1L))
    val viewModel = createViewModel(restored)
    assertThat(viewModel.uiState.value.user?.name).isEqualTo("离线缓存")
}

// 对应关系：
// DAO → SQL/Flow；Repository → 缓存策略；ViewModel → 状态组合/重试；
// Worker → 持久任务和退避；UI → 生命周期、旋转和完整用户行为。`,
    solutionExplanation: "答案把五个关键行为分配给最接近事实的测试层：Room 证明 SQL 与发射，Repository 证明失败不清缓存，ViewModel 证明重试状态，Worker 证明 pending 可恢复，UI 证明旋转与旅程。进程死亡不能只用 Activity.recreate 冒充，因此额外说明了 SavedStateHandle + 重开 Room 的组件验证和真进程测试边界。",
    solutionChecks: ["UserDao、Repository、ViewModel、Worker、UI 各有关键测试", "覆盖缓存先显示、失败不清空、重试成功与旋转不重复请求", "明确区分配置变化与进程死亡，并给出恢复验证"],
  },

  "compose-mental-model": {
    solution: `@Immutable
data class CounterHistory(
    val id: Long,
    val value: Int,
)

class CounterViewModel : ViewModel() {
    private val _value = MutableStateFlow(0)
    private val _history = MutableStateFlow<List<CounterHistory>>(emptyList())

    val value: StateFlow<Int> = _value.asStateFlow()
    val history: StateFlow<List<CounterHistory>> = _history.asStateFlow()

    fun increment() {
        val next = _value.value + 1
        _value.value = next
        _history.update { old ->
            old + CounterHistory(
                id = SystemClock.elapsedRealtimeNanos(),
                value = next,
            )
        }
    }

    fun reset() {
        _value.value = 0
        _history.value = emptyList()
    }
}

@Composable
fun CounterRoute(
    viewModel: CounterViewModel = viewModel(),
) {
    val value by viewModel.value.collectAsStateWithLifecycle()
    val history by viewModel.history.collectAsStateWithLifecycle()

    CounterScreen(
        value = value,
        history = history,
        onIncrement = viewModel::increment,
        onReset = viewModel::reset,
    )
}

@Composable
fun CounterScreen(
    value: Int,
    history: List<CounterHistory>,
    onIncrement: () -> Unit,
    onReset: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = value.toString(),
            style = MaterialTheme.typography.displayLarge,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Button(onClick = onIncrement) { Text("增加") }
            OutlinedButton(onClick = onReset) { Text("重置") }
        }
        LazyColumn {
            items(
                items = history,
                // id 不随列表插入和删除变化，remember/Effect 不会串到别的行
                key = CounterHistory::id,
            ) { item ->
                Text("曾到达 " + item.value)
            }
        }
    }
}

@Preview(name = "初始值", showBackground = true)
@Composable
private fun CounterZeroPreview() {
    AppTheme {
        CounterScreen(
            value = 0,
            history = emptyList(),
            onIncrement = {},
            onReset = {},
        )
    }
}

@Preview(name = "值为 10", showBackground = true)
@Composable
private fun CounterTenPreview() {
    AppTheme {
        CounterScreen(
            value = 10,
            history = listOf(
                CounterHistory(1, 8),
                CounterHistory(2, 9),
                CounterHistory(3, 10),
            ),
            onIncrement = {},
            onReset = {},
        )
    }
}

// value 改变时，CounterRoute 因收集到新 State 而重组。
// CounterScreen 会被重新调用；Compose 可跳过参数未变且稳定的子范围。
// Text(value) 必须更新，按钮内容与回调若稳定可被跳过；
// LazyColumn 会重新计算所需内容，但稳定 key 保住各行身份。
// 这不是“整页重新绘制”：重组、重新布局和重绘是三个不同阶段。`,
    solutionExplanation: "Route 持有 ViewModel 并收集状态，Screen 是无副作用的纯 UI，所有修改通过回调上报。历史记录使用独立 id，而不是列表下标；两个 Preview 传固定状态，不启动真实依赖。答案还区分了函数可能重组与像素实际重绘。",
    solutionChecks: ["Route/Screen 状态提升和增加、重置回调完整", "历史列表使用稳定 key，UI 函数不执行业务副作用", "提供 0、10 两个 Preview 并解释重组范围"],
  },

  "compose-layout-material": {
    solution: `@Composable
fun UserCard(
    name: String,
    description: String,
    avatarUrl: String?,
    favorite: Boolean,
    onClick: () -> Unit,
    onFavoriteChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    trailing: (@Composable RowScope.() -> Unit)? = null,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        color = MaterialTheme.colorScheme.surfaceContainer,
        contentColor = MaterialTheme.colorScheme.onSurface,
        tonalElevation = 1.dp,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = null, // 名字已经提供等价语义，头像为装饰
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop,
            )

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = name,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            trailing?.invoke(this)

            IconToggleButton(
                checked = favorite,
                onCheckedChange = onFavoriteChange,
                modifier = Modifier
                    .minimumInteractiveComponentSize()
                    .semantics {
                        stateDescription = if (favorite) "已收藏" else "未收藏"
                    },
            ) {
                Icon(
                    imageVector = if (favorite) Icons.Filled.Favorite
                    else Icons.Outlined.FavoriteBorder,
                    contentDescription = if (favorite) "取消收藏" else "收藏",
                )
            }
        }
    }
}

@Preview(name = "窄屏长文本", widthDp = 280, showBackground = true)
@Composable
private fun UserCardNarrowPreview() {
    AppTheme {
        UserCard(
            name = "Ada Lovelace",
            description = "这是一段用于验证窄屏省略和两行布局的很长描述。",
            avatarUrl = null,
            favorite = false,
            onClick = {},
            onFavoriteChange = {},
        )
    }
}

@Preview(
    name = "暗色与尾部插槽",
    widthDp = 360,
    uiMode = Configuration.UI_MODE_NIGHT_YES,
    showBackground = true,
)
@Composable
private fun UserCardDarkPreview() {
    AppTheme(darkTheme = true) {
        UserCard(
            name = "Lin",
            description = "Android 工程师",
            avatarUrl = null,
            favorite = true,
            onClick = {},
            onFavoriteChange = {},
            trailing = { AssistChip(onClick = {}, label = { Text("在线") }) },
        )
    }
}

// Modifier 顺序会改变结果：
// modifier.fillMaxWidth() 先接受调用方 testTag/padding，再补组件默认尺寸；
// clip().clickable() 让点击涟漪受形状裁剪，反过来则可能溢出；
// padding().background() 只给内容区背景，background().padding() 包含外层背景。
// Surface 的点击与 IconToggleButton 各自消费点击，收藏不会同时触发整卡 onClick。`,
    solutionExplanation: "最外层 Surface 接受外部 modifier，内部 Row 处理长文本与可选尾部插槽；MaterialTheme 色彩自动适配深浅主题。IconToggleButton 自带独立语义并通过 minimumInteractiveComponentSize 保证 48dp 目标，点击不会冒泡到整卡。",
    solutionChecks: ["头像、文本、整卡点击、收藏与尾部插槽全部实现", "支持外部 Modifier、长文本、48dp、深浅主题和语义", "提供窄屏/暗色 Preview 并解释 Modifier 顺序"],
  },

  "compose-state": {
    solution: `// 状态归属：
// query：SavedStateHandle + ViewModel StateFlow（业务输入，进程重建需恢复）
// selectedFilters：SavedStateHandle + ViewModel（影响服务器结果）
// serverResults：ViewModel 从 Repository Flow/PagingData 产生，不保存进 Bundle
// filtersExpanded：rememberSaveable（轻量 UI 元素状态，旋转后恢复）
// scroll position：rememberLazyListState（内部 Saver 恢复可见位置）

@Composable
fun SearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onSearch: () -> Unit,
    modifier: Modifier = Modifier,
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = modifier.fillMaxWidth(),
        singleLine = true,
        label = { Text("搜索用户") },
        leadingIcon = {
            Icon(Icons.Default.Search, contentDescription = null)
        },
        keyboardOptions = KeyboardOptions(
            imeAction = ImeAction.Search,
        ),
        keyboardActions = KeyboardActions(
            onSearch = { onSearch() },
        ),
    )
}

class SearchViewModel(
    private val savedStateHandle: SavedStateHandle,
    repository: SearchRepository,
) : ViewModel() {
    val query = savedStateHandle.getStateFlow("query", "")
    val selectedFilters =
        savedStateHandle.getStateFlow<Set<String>>("filters", emptySet())

    val results: StateFlow<SearchResultState> = combine(
        query.debounce(300).distinctUntilChanged(),
        selectedFilters,
    ) { text, filters -> SearchRequest(text.trim(), filters) }
        .flatMapLatest(repository::search)
        .stateIn(
            viewModelScope,
            SharingStarted.WhileSubscribed(5_000),
            SearchResultState.Idle,
        )

    fun onQueryChange(value: String) {
        savedStateHandle["query"] = value
    }

    fun toggleFilter(filter: String) {
        savedStateHandle["filters"] =
            selectedFilters.value.toMutableSet().apply {
                if (!add(filter)) remove(filter)
            }
    }
}

@Composable
fun SearchRoute(viewModel: SearchViewModel = hiltViewModel()) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    val results by viewModel.results.collectAsStateWithLifecycle()
    var filtersExpanded by rememberSaveable { mutableStateOf(false) }
    val listState = rememberLazyListState()

    // 只在 firstVisibleItemIndex 变化时更新布尔派生值
    val showScrollToTop by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > 0 ||
                listState.firstVisibleItemScrollOffset > 200
        }
    }
    val scope = rememberCoroutineScope()

    SearchScreen(
        query = query,
        results = results,
        filtersExpanded = filtersExpanded,
        listState = listState,
        showScrollToTop = showScrollToTop,
        onQueryChange = viewModel::onQueryChange,
        onToggleFilters = { filtersExpanded = !filtersExpanded },
        onScrollToTop = {
            scope.launch { listState.animateScrollToItem(0) }
        },
    )
}

// 不把服务器结果塞进 rememberSaveable：体积可能超出 Bundle，
// 且它已有 Room/Repository 事实源；恢复 query 后应重新观察缓存。`,
    solutionExplanation: "答案按寿命划分五类状态：局部 UI 状态留在 Composition，可恢复业务输入进入 SavedStateHandle，服务器结果从 Repository 重建。SearchBar 完全无状态；derivedStateOf 把高频滚动状态压缩成按钮可见性，避免每个像素变化都驱动无关 UI。",
    solutionChecks: ["query、筛选、展开、滚动和结果的状态所有者逐项明确", "无状态 SearchBar 与 SavedStateHandle ViewModel 实现完整", "derivedStateOf 正确控制回顶按钮且不保存大结果"],
  },

  "compose-viewmodel-udf": {
    solution: `data class UserUiState(
    val user: User? = null,
    val refreshing: Boolean = false,
    val error: String? = null,
)

sealed interface UserAction {
    data object Retry : UserAction
    data object ToggleFavorite : UserAction
}

@Composable
fun UserRoute(
    onBack: () -> Unit,
    onOpenArticle: (Long) -> Unit,
    viewModel: UserViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    UserScreen(
        state = state,
        onBack = onBack,
        onOpenArticle = onOpenArticle,
        onRetry = { viewModel.onAction(UserAction.Retry) },
        onToggleFavorite = {
            viewModel.onAction(UserAction.ToggleFavorite)
        },
    )
}

@Composable
fun UserScreen(
    state: UserUiState,
    onBack: () -> Unit,
    onOpenArticle: (Long) -> Unit,
    onRetry: () -> Unit,
    onToggleFavorite: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text(state.user?.name ?: "用户详情") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Default.ArrowBack, "返回")
                    }
                },
            )
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when {
                state.user == null && state.refreshing -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
                state.user == null && state.error != null -> {
                    ErrorPanel(
                        message = state.error,
                        onRetry = onRetry,
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
                state.user != null -> {
                    LazyColumn {
                        item {
                            UserHeader(
                                user = state.user,
                                onToggleFavorite = onToggleFavorite,
                            )
                        }
                        items(
                            items = state.user.articles,
                            key = Article::id,
                        ) { article ->
                            ArticleRow(
                                article = article,
                                onClick = { onOpenArticle(article.id) },
                            )
                        }
                    }

                    if (state.refreshing) {
                        LinearProgressIndicator(
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            // 有缓存时错误与内容同时存在，只显示非阻塞提示
            if (state.user != null && state.error != null) {
                RetrySnackbarLikePanel(
                    message = state.error,
                    onRetry = onRetry,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp),
                )
            }
        }
    }
}

@Preview(name = "加载")
@Composable
private fun UserLoadingPreview() {
    AppTheme {
        UserScreen(
            state = UserUiState(refreshing = true),
            onBack = {},
            onOpenArticle = {},
            onRetry = {},
            onToggleFavorite = {},
        )
    }
}

@Preview(name = "缓存与刷新错误")
@Composable
private fun UserContentErrorPreview() {
    AppTheme {
        UserScreen(
            state = UserUiState(
                user = previewUser,
                error = "网络不可用，正在显示缓存",
            ),
            onBack = {},
            onOpenArticle = {},
            onRetry = {},
            onToggleFavorite = {},
        )
    }
}

// 导航由 NavHost 传入回调；Screen 不导入 Hilt、NavController、Repository。
// collectAsStateWithLifecycle 在页面低于 STARTED 时停止收集，恢复后拿到最新 StateFlow。`,
    solutionExplanation: "Route 是依赖与生命周期边界，Screen 只接受值和回调，因此能 Preview 和纯组件测试。缓存内容、refreshing 和 error 是正交字段：有缓存时网络错误不会替换整页；重试和收藏统一回到 ViewModel，返回及文章跳转交给上层导航。",
    solutionChecks: ["Route 生命周期安全收集且 Screen 无 Hilt/NavController/Repository", "加载、缓存内容、刷新进度和并存错误均完整渲染", "重试/收藏进入 ViewModel，导航走回调并有两个 Preview"],
  },

  "compose-effects": {
    solution: `@Composable
fun MessageRoute(
    userId: Long,
    event: Flow<UserEvent>,
    lifecycleOwner: LifecycleOwner = LocalLifecycleOwner.current,
    onTimeout: () -> Unit,
    viewModel: MessageViewModel = hiltViewModel(),
) {
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // 1. userId 改变时取消旧收集并订阅新用户；离开组合时自动取消
    LaunchedEffect(userId) {
        viewModel.observeMessages(userId).collect { messages ->
            viewModel.onMessages(messages)
        }
    }

    // 一次性事件也按 Flow 身份建 key；事件收集随页面存在
    LaunchedEffect(event) {
        event.collect { value ->
            if (value is UserEvent.Saved) {
                snackbarHostState.showSnackbar("保存成功")
            }
        }
    }

    // 2. 点击启动的 Snackbar 属于用户动作，不应靠状态重组重复触发
    MessageScreen(
        snackbarHostState = snackbarHostState,
        onSaveClick = {
            scope.launch {
                val result = snackbarHostState.showSnackbar(
                    message = "确认保存？",
                    actionLabel = "保存",
                )
                if (result == SnackbarResult.ActionPerformed) {
                    viewModel.save()
                }
            }
        },
    )

    // 3. owner 变化时先移除旧 Observer，再给新 owner 注册
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, lifecycleEvent ->
            when (lifecycleEvent) {
                Lifecycle.Event.ON_START -> viewModel.onVisible()
                Lifecycle.Event.ON_STOP -> viewModel.onHidden()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // 4. 倒计时不因父层传入了新 Lambda 而重启，但结束时调用最新回调
    val latestOnTimeout by rememberUpdatedState(onTimeout)
    LaunchedEffect(userId) {
        delay(30.seconds)
        latestOnTimeout()
    }
}

// 取消边界：
// LaunchedEffect(userId)：userId 变化或页面离开时取消；
// rememberCoroutineScope：Composition 离开时取消所有点击任务；
// DisposableEffect(owner)：key 变化/离开时同步清理 Observer；
// rememberUpdatedState：自身不启动任务，只更新 Effect 最终读取的回调。`,
    solutionExplanation: "四类 API 分别匹配四种寿命：状态驱动协程、用户事件协程、需要显式注册/释放的外部资源、长任务里的最新回调。答案明确 key 和取消时机，避免把所有逻辑塞进 LaunchedEffect(Unit) 而产生旧 userId、重复 Snackbar 或泄漏 Observer。",
    solutionChecks: ["四个需求分别使用指定 Effect/Scope API", "userId、Flow、LifecycleOwner 的 key 与清理边界正确", "30 秒任务不重启且能调用最新 onTimeout"],
  },

  "compose-lists-forms-paging": {
    solution: `class UserSearchViewModel(
    savedStateHandle: SavedStateHandle,
    repository: UserRepository,
) : ViewModel() {
    val query = savedStateHandle.getStateFlow("query", "")
    val email = savedStateHandle.getStateFlow("email", "")

    val users: Flow<PagingData<User>> = query
        .map(String::trim)
        .debounce(300)
        .distinctUntilChanged()
        .flatMapLatest { value ->
            if (value.length < 2) flowOf(PagingData.empty())
            else repository.search(value)
        }
        .cachedIn(viewModelScope)

    fun setQuery(value: String) {
        savedStateHandle["query"] = value
    }

    fun setEmail(value: String) {
        savedStateHandle["email"] = value
    }
}

@Composable
fun UserSearchRoute(
    viewModel: UserSearchViewModel = hiltViewModel(),
    onOpenUser: (Long) -> Unit,
) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    val email by viewModel.email.collectAsStateWithLifecycle()
    val users = viewModel.users.collectAsLazyPagingItems()

    UserSearchScreen(
        query = query,
        email = email,
        users = users,
        onQueryChange = viewModel::setQuery,
        onEmailChange = viewModel::setEmail,
        onOpenUser = onOpenUser,
    )
}

@Composable
fun UserSearchScreen(
    query: String,
    email: String,
    users: LazyPagingItems<User>,
    onQueryChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onOpenUser: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    val listState = rememberLazyListState()
    val focusManager = LocalFocusManager.current
    val refresh = users.loadState.refresh

    Column(modifier = modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            label = { Text("搜索") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                imeAction = ImeAction.Next,
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
        )
        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            label = { Text("通知邮箱") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Search,
            ),
            keyboardActions = KeyboardActions(
                onSearch = { focusManager.clearFocus() },
            ),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
        )

        Box(modifier = Modifier.weight(1f)) {
            when {
                refresh is LoadState.Loading && users.itemCount == 0 -> {
                    CircularProgressIndicator(
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
                refresh is LoadState.Error && users.itemCount == 0 -> {
                    FullError(
                        message = refresh.error.message ?: "加载失败",
                        onRetry = users::retry,
                    )
                }
                refresh is LoadState.NotLoading && users.itemCount == 0 -> {
                    EmptySearchResult(query)
                }
                else -> {
                    LazyColumn(
                        state = listState,
                        contentPadding = PaddingValues(vertical = 8.dp),
                    ) {
                        items(
                            count = users.itemCount,
                            key = users.itemKey(User::id),
                            contentType = users.itemContentType {
                                "user-row"
                            },
                        ) { index ->
                            users[index]?.let { user ->
                                UserRow(
                                    user = user,
                                    onClick = { onOpenUser(user.id) },
                                )
                            }
                        }

                        item(key = "append-state") {
                            when (val append = users.loadState.append) {
                                is LoadState.Loading -> AppendLoading()
                                is LoadState.Error -> AppendError(
                                    message = append.error.message ?: "加载更多失败",
                                    onRetry = users::retry,
                                )
                                else -> Unit
                            }
                        }
                    }

                    // 已有缓存时 refresh 错误不遮住列表
                    if (refresh is LoadState.Error) {
                        RefreshErrorBanner(
                            onRetry = users::retry,
                            modifier = Modifier.align(Alignment.TopCenter),
                        )
                    }
                }
            }
        }
    }
}

// rememberLazyListState 通过 Saver 跨配置变化恢复位置。
// 新 query 创建新 PagingData；同 query 的 PagingData 因 cachedIn 跨旋转复用。
// refresh 负责首次/刷新/空态，append 只负责尾部加载，二者不能混为一条错误页。`,
    solutionExplanation: "防抖、查询切换和 cachedIn 都在 ViewModel；Composable 只收集 PagingData，不访问 Repository。LazyColumn 使用实体 id 和 contentType 保持身份，列表状态可恢复；邮箱输入使用 Email 键盘与 Search IME。首次、空态、已有内容刷新失败和追加失败各有独立处理。",
    solutionChecks: ["300ms 防抖、flatMapLatest、cachedIn 与 Route 收集完整", "稳定 key、滚动位置、Email IME 和列表点击均实现", "首次/刷新/空态/追加状态分开，所有错误均可 retry"],
  },

  "navigation-compose": {
    solution: `@Serializable data object Home
@Serializable data object Search
@Serializable data class User(val id: Long)
@Serializable data object Settings
@Serializable data object AuthGraph
@Serializable data object Login
@Serializable data object Register

@Composable
fun LearningNavHost(
    navController: NavHostController,
    authenticated: Boolean,
) {
    NavHost(
        navController = navController,
        startDestination = if (authenticated) Home else AuthGraph,
    ) {
        composable<Home> {
            HomeScreen(
                onSearch = { navController.navigate(Search) },
                onOpenUser = { id -> navController.navigate(User(id)) },
            )
        }
        composable<Search> {
            SearchScreen(
                onBack = navController::popBackStack,
                onOpenUser = { id -> navController.navigate(User(id)) },
            )
        }
        composable<User>(
            deepLinks = listOf(
                navDeepLink<User>(
                    basePath = "https://example.com/users",
                ),
            ),
        ) { entry ->
            val route = entry.toRoute<User>()
            UserScreen(
                userId = route.id,
                onBack = navController::popBackStack,
            )
        }
        composable<Settings> {
            SettingsScreen(onBack = navController::popBackStack)
        }

        navigation<AuthGraph>(startDestination = Login) {
            composable<Login> {
                LoginScreen(
                    onRegister = { navController.navigate(Register) },
                    onSuccess = {
                        navController.navigate(Home) {
                            // 登录完成后整个 AuthGraph 不再可返回
                            popUpTo<AuthGraph> { inclusive = true }
                        }
                    },
                )
            }
            composable<Register> {
                RegisterScreen(onBack = navController::popBackStack)
            }
        }
    }
}

@Composable
fun AppBottomBar(navController: NavHostController) {
    val destinations = listOf(Home, Search, Settings)
    NavigationBar {
        destinations.forEach { destination ->
            NavigationBarItem(
                selected = navController.currentDestination
                    ?.hasRoute(destination::class) == true,
                onClick = {
                    navController.navigate(destination) {
                        // 恢复每个底部页签自己的返回栈和滚动状态
                        popUpTo(navController.graph.findStartDestination().id) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { DestinationIcon(destination) },
                label = { Text(destination.label) },
            )
        }
    }
}

@RunWith(AndroidJUnit4::class)
class LearningNavigationTest {
    @get:Rule val rule = createComposeRule()
    private lateinit var controller: TestNavHostController

    @Before
    fun setUp() {
        rule.setContent {
            controller = TestNavHostController(LocalContext.current).apply {
                navigatorProvider.addNavigator(ComposeNavigator())
            }
            LearningNavHost(controller, authenticated = true)
        }
    }

    @Test
    fun userClick_passesTypedIdAndBackReturnsHome() {
        rule.onNodeWithText("Ada").performClick()
        rule.runOnIdle {
            assertThat(controller.currentBackStackEntry?.toRoute<User>()?.id)
                .isEqualTo(42L)
            assertThat(controller.popBackStack()).isTrue()
            assertThat(controller.currentDestination?.hasRoute<Home>()).isTrue()
        }
    }

    @Test
    fun loginSuccess_removesAuthGraph() {
        rule.runOnIdle {
            controller.navigate(AuthGraph) {
                popUpTo<Home> { inclusive = true }
            }
        }
        rule.onNodeWithText("登录").performClick()
        rule.runOnIdle {
            assertThat(controller.currentDestination?.hasRoute<Home>()).isTrue()
            assertThat(controller.popBackStack()).isFalse()
        }
    }
}

// Deep Link 测试使用 ACTION_VIEW + https://example.com/users/42，
// 断言 toRoute<User>().id == 42；Screen 测试只断言回调参数，不创建 NavController。`,
    solutionExplanation: "目的地集中为类型，不再拼接 route 字符串。NavHost 把 Screen 回调翻译成导航；User 声明 HTTPS Deep Link；底部导航使用 saveState/restoreState 保留各栈；登录成功 inclusive 清除 AuthGraph。测试同时覆盖类型参数、返回和认证栈。",
    solutionChecks: ["四个主目的地与 Auth 嵌套图、Deep Link 完整", "Screen 不接收 NavController，底部导航保存与恢复状态", "点击参数、返回栈、登录清栈和 Deep Link 测试策略齐全"],
  },

  "compose-motion-interoperability": {
    solution: `@AndroidEntryPoint
class UserDetailFragment : Fragment() {
    private val viewModel: UserViewModel by viewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View = ComposeView(requireContext()).apply {
        // Fragment 的 View 销毁时立即释放 Composition，避免持有旧 ViewTree
        setViewCompositionStrategy(
            ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed,
        )
        setContent {
            AppTheme {
                UserDetailRoute(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun UserDetailScreen(
    state: UserUiState,
    onFavoriteChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val favoriteScale by animateFloatAsState(
        targetValue = if (state.favorite) 1.18f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
        ),
        label = "favorite-scale",
    )

    Scaffold(
        modifier = modifier.fillMaxSize(),
        contentWindowInsets = WindowInsets.safeDrawing,
        bottomBar = {
            FavoriteBar(
                favorite = state.favorite,
                onFavoriteChange = onFavoriteChange,
                iconModifier = Modifier.graphicsLayer {
                    scaleX = favoriteScale
                    scaleY = favoriteScale
                },
                modifier = Modifier
                    .navigationBarsPadding()
                    .imePadding(),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .consumeWindowInsets(padding),
        ) {
            Text(state.name, style = MaterialTheme.typography.headlineMedium)

            AndroidView(
                factory = { context ->
                    LegacyMapView(context).apply {
                        // 只在创建时注册一次不依赖状态的基础设置
                        setZoomControlsEnabled(false)
                    }
                },
                update = { mapView ->
                    // 每次相关状态变化时，只把最新渲染值同步给旧 View
                    mapView.showLocation(
                        latitude = state.latitude,
                        longitude = state.longitude,
                    )
                    mapView.isEnabled = !state.loading
                },
                onRelease = { mapView ->
                    mapView.setOnMarkerClickListener(null)
                    mapView.destroy()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp),
            )

            AnimatedVisibility(
                visible = state.error != null,
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically(),
            ) {
                state.error?.let { ErrorBanner(it) }
            }
        }
    }
}

// 若 LegacyMapView 需要 onStart/onStop：
@Composable
fun LifecycleAwareMapEffect(mapView: LegacyMapView) {
    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner, mapView) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_START -> mapView.onStart()
                Lifecycle.Event.ON_STOP -> mapView.onStop()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
            mapView.onStop()
        }
    }
}

// 唯一状态源是 UserViewModel：
// Compose 与 LegacyMapView 都只读取同一个 UserUiState；
// 旧 View 的回调也必须上报 ViewModel，不能维护第二份 favorite/location。`,
    solutionExplanation: "Fragment 用 DisposeOnViewTreeLifecycleDestroyed 让 Composition 跟随 viewLifecycleOwner；AndroidView 的 factory 只创建，update 同步最新 UiState，onRelease 清理监听和资源。动画仅表达收藏状态变化，safeDrawing、navigationBarsPadding 和 imePadding 处理系统栏与键盘。业务状态始终只由 ViewModel 持有。",
    solutionChecks: ["ComposeView 生命周期策略与 AndroidView 三阶段完整", "收藏动画、错误动画、IME 和系统栏 Insets 均处理", "明确 ViewModel 为唯一状态源并给出旧 View 生命周期清理"],
  },

  "compose-adaptive-accessibility": {
    solution: `class UserListViewModel(
    private val savedStateHandle: SavedStateHandle,
) : ViewModel() {
    val selectedUserId =
        savedStateHandle.getStateFlow<Long?>("selectedUserId", null)

    fun selectUser(id: Long?) {
        savedStateHandle["selectedUserId"] = id
    }
}

@Composable
fun AdaptiveUsersRoute(
    viewModel: UserListViewModel = hiltViewModel(),
) {
    val selectedId by viewModel.selectedUserId.collectAsStateWithLifecycle()
    val adaptiveInfo = currentWindowAdaptiveInfo()
    val expanded = adaptiveInfo.windowSizeClass
        .windowWidthSizeClass >= WindowWidthSizeClass.EXPANDED

    // expanded 是当前窗口的派生状态，不写回 ViewModel
    AdaptiveUsersScreen(
        expanded = expanded,
        users = viewModel.users,
        selectedUserId = selectedId,
        onSelectUser = viewModel::selectUser,
        onBackFromDetail = { viewModel.selectUser(null) },
    )
}

@Composable
fun AdaptiveUsersScreen(
    expanded: Boolean,
    users: List<User>,
    selectedUserId: Long?,
    onSelectUser: (Long) -> Unit,
    onBackFromDetail: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (expanded) {
        Row(modifier = modifier.fillMaxSize()) {
            UserList(
                users = users,
                selectedUserId = selectedUserId,
                onSelectUser = onSelectUser,
                modifier = Modifier.weight(0.4f),
            )
            VerticalDivider()
            UserDetailPane(
                userId = selectedUserId,
                onBack = null, // 双栏不显示返回按钮
                modifier = Modifier.weight(0.6f),
            )
        }
    } else if (selectedUserId == null) {
        UserList(
            users = users,
            selectedUserId = null,
            onSelectUser = onSelectUser,
            modifier = modifier,
        )
    } else {
        UserDetailPane(
            userId = selectedUserId,
            onBack = onBackFromDetail,
            modifier = modifier,
        )
    }
}

@Composable
fun AccessibleUserRow(
    user: User,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .minimumInteractiveComponentSize()
            .selectable(
                selected = selected,
                onClick = onClick,
                role = Role.Button,
            )
            .semantics(mergeDescendants = true) {
                contentDescription = user.name + "，" + user.role
                stateDescription = if (selected) "已选择" else "未选择"
            }
            .focusable()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        UserAvatar(user, contentDescription = null)
        Column(Modifier.padding(start = 12.dp)) {
            Text(user.name)
            Text(user.role)
        }
    }
}

class AdaptiveUsersTest {
    @get:Rule val rule = createComposeRule()

    @Test
    fun compact_clickReplacesListWithDetail_andBackRestoresList() {
        rule.setContent {
            AdaptiveUsersScreen(
                expanded = false,
                users = sampleUsers,
                selectedUserId = selectedState.value,
                onSelectUser = { selectedState.value = it },
                onBackFromDetail = { selectedState.value = null },
            )
        }
        rule.onNodeWithText("Ada").performClick()
        rule.onNodeWithTag("user-detail").assertIsDisplayed()
        rule.onNodeWithContentDescription("返回").performClick()
        rule.onNodeWithTag("user-list").assertIsDisplayed()
    }

    @Test
    fun expanded_showsBothPanesAndSelectionSemantics() {
        rule.setContent {
            AdaptiveUsersScreen(
                expanded = true,
                users = sampleUsers,
                selectedUserId = 1,
                onSelectUser = {},
                onBackFromDetail = {},
            )
        }
        rule.onNodeWithTag("user-list").assertIsDisplayed()
        rule.onNodeWithTag("user-detail").assertIsDisplayed()
        rule.onNodeWithContentDescription("Ada，工程师")
            .assert(SemanticsMatcher.expectValue(
                SemanticsProperties.StateDescription,
                "已选择",
            ))
            .assertHasClickAction()
    }
}`,
    solutionExplanation: "窗口尺寸只决定当前布局分支，是可随分屏实时变化的派生状态；selectedUserId 才是业务选择，并通过 SavedStateHandle 恢复。紧凑模式在列表与详情间切换，宽屏同时渲染两栏。行组件合并语义、声明选择状态、支持焦点并保证至少 48dp。",
    solutionChecks: ["紧凑/宽屏布局分支与实时窗口变化逻辑完整", "selectedUserId 可恢复而布局模式不进入 ViewModel", "TalkBack、键盘、触控目标及两种布局测试断言齐全"],
  },

  "compose-testing-performance": {
    solution: `// 一、纯 Screen 行为测试：只证明状态到 UI 与用户回调
class UserListScreenTest {
    @get:Rule val rule = createComposeRule()

    @Test
    fun loading_showsProgress() {
        rule.setContent {
            UserListScreen(
                state = UserListUiState(loading = true),
                onRetry = {},
                onFavorite = {},
            )
        }
        rule.onNodeWithTag("loading").assertIsDisplayed()
    }

    @Test
    fun error_clickRetry_invokesCallback() {
        var retryCalls = 0
        rule.setContent {
            UserListScreen(
                state = UserListUiState(error = "离线"),
                onRetry = { retryCalls++ },
                onFavorite = {},
            )
        }
        rule.onNodeWithText("重试").performClick()
        rule.runOnIdle { assertThat(retryCalls).isEqualTo(1) }
    }
}

// 二、Semantics：证明收藏状态、描述和可操作性
@Test
fun favorite_exposesStateAndTouchAction() {
    rule.setContent {
        FavoriteButton(
            favorite = true,
            onFavoriteChange = {},
            modifier = Modifier.testTag("favorite"),
        )
    }
    rule.onNodeWithTag("favorite")
        .assertHasClickAction()
        .assertContentDescriptionEquals("取消收藏")
        .assert(
            SemanticsMatcher.expectValue(
                SemanticsProperties.StateDescription,
                "已收藏",
            ),
        )
}

// 触控尺寸用布局断言或截图/无障碍检查验证至少 48dp；
// 不用实现类名或私有状态作为选择器。

// 三、Macrobenchmark：在独立 benchmark 模块测真实发布制品
@RunWith(AndroidJUnit4::class)
class StartupAndScrollBenchmark {
    @get:Rule val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun coldStartup() = benchmarkRule.measureRepeated(
        packageName = "com.example.learning",
        metrics = listOf(
            StartupTimingMetric(),
            FrameTimingMetric(),
        ),
        iterations = 10,
        startupMode = StartupMode.COLD,
        setupBlock = { pressHome() },
    ) {
        startActivityAndWait()
    }

    @Test
    fun userListScroll() = benchmarkRule.measureRepeated(
        packageName = "com.example.learning",
        metrics = listOf(
            FrameTimingMetric(),
            MemoryUsageMetric(MemoryUsageMetric.Mode.Last),
        ),
        iterations = 10,
        setupBlock = {
            startActivityAndWait()
            device.findObject(By.text("用户")).click()
            device.waitForIdle()
        },
    ) {
        val list = device.findObject(By.res("user-list"))
        repeat(5) { list.fling(Direction.DOWN) }
    }
}

// 四、Baseline Profile：记录启动与核心滚动路径
@RunWith(AndroidJUnit4::class)
class BaselineProfileGenerator {
    @get:Rule val rule = BaselineProfileRule()

    @Test
    fun generate() = rule.collect(
        packageName = "com.example.learning",
        includeInStartupProfile = true,
    ) {
        pressHome()
        startActivityAndWait()
        device.findObject(By.text("用户")).click()
        device.findObject(By.res("user-list")).fling(Direction.DOWN)
    }
}

// 五、重组观测与指标表
// 1. Layout Inspector / Compose recomposition counts：定位高频重组范围。
// 2. compiler stability report：检查不稳定参数，不凭感觉乱加 @Stable。
// 3. Macrobenchmark 前后都跑相同设备、相同 release 变体、相同数据。
//
// | 指标 | 优化前 | 目标/优化后 |
// | 冷启动 timeToFullDisplay P50/P90 | 实测 | P90 不回退 |
// | 滚动 frameDuration P50/P95 | 实测 | P95 下降 |
// | jank 百分比 | 实测 | 低于团队门槛 |
// | UserRow 每次交互重组次数 | 实测 | 只更新受影响行 |
//
// 先用稳定 key、不可变 UiState、缩小状态读取范围修复；
// remember/derivedStateOf 只用于已测得的热点，优化后重新测量。`,
    solutionExplanation: "质量门禁按职责拆成三类：Compose 测试验证可见行为和语义，Macrobenchmark 在发布制品上测启动/帧，Baseline Profile 记录真实关键路径。重组计数只是定位线索，最终是否优化成功由同条件基准指标证明。",
    solutionChecks: ["行为测试覆盖加载、错误、重试，语义测试覆盖收藏和可点击性", "Macrobenchmark 覆盖冷启动与列表滚动，Baseline Profile 路径完整", "列出重组观测工具、前后指标和基于证据的优化顺序"],
  },

  "compose-offline-capstone": {
    solution: `// 目标：每个提交都能编译、运行，并由一条最关键测试证明新增边界。
// Room 始终是 UI 的唯一数据源；网络结果只写库，不直接喂给 Compose。

// Commit 1 — model: 领域模型与契约
data class User(
    val id: Long,
    val name: String,
    val favorite: Boolean,
    val updatedAt: Instant,
)

interface UserRepository {
    fun observe(id: Long): Flow<User?>
    fun search(query: String): Flow<PagingData<User>>
    suspend fun refresh(id: Long)
    suspend fun setFavorite(id: Long, favorite: Boolean)
}

// 测试：UserDto/UserEntity 到 User 的 mapper 覆盖 null、时间与默认值。
// 验证：./gradlew :core:model:test

// Commit 2 — room: Entity、DAO 与唯一事实源
@Entity(tableName = "users", indices = [Index("name")])
data class UserEntity(
    @PrimaryKey val id: Long,
    val name: String,
    val favorite: Boolean,
    val updatedAtEpochMillis: Long,
    val query: String,
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id")
    fun observe(id: Long): Flow<UserEntity?>

    @Query(
        "SELECT * FROM users WHERE name LIKE '%' || :query || '%' ORDER BY name, id",
    )
    fun pagingSource(query: String): PagingSource<Int, UserEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(users: List<UserEntity>)

    @Query("UPDATE users SET favorite = :favorite WHERE id = :id")
    suspend fun setFavorite(id: Long, favorite: Boolean)
}

// 测试：插入后 Flow 发射；更新收藏不会丢失其他列；分页排序稳定。
// 验证：./gradlew :core:database:connectedDebugAndroidTest

// Commit 3 — migration: v1 → v2 保留真实旧数据
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            "ALTER TABLE users ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0",
        )
        db.execSQL(
            "ALTER TABLE users ADD COLUMN updatedAtEpochMillis INTEGER NOT NULL DEFAULT 0",
        )
        db.execSQL(
            "ALTER TABLE users ADD COLUMN query TEXT NOT NULL DEFAULT ''",
        )
        db.execSQL("CREATE INDEX IF NOT EXISTS index_users_name ON users(name)")
    }
}

// 测试：MigrationTestHelper 先写 v1 用户，再升级并断言姓名保留、
// 新列默认值正确、索引存在。严禁 destructive migration。

// Commit 4 — retrofit: DTO、认证、错误分类
interface UserApi {
    @GET("users/{id}")
    suspend fun user(@Path("id") id: Long): UserDto

    @GET("users")
    suspend fun users(
        @Query("q") query: String,
        @Query("page") page: Int,
    ): UserPageDto

    @PUT("users/{id}/favorite")
    suspend fun setFavorite(
        @Path("id") id: Long,
        @Header("Idempotency-Key") operationId: String,
        @Body body: FavoriteBody,
    )
}

// 测试：MockWebServer 验证路径、分页参数、幂等 Header 和 DTO 解析；
// 401、429、500、损坏 JSON 分别映射为明确领域失败。

// Commit 5 — repository: observe + refresh 离线详情闭环
class OfflineFirstUserRepository(
    private val database: AppDatabase,
    private val api: UserApi,
    private val syncScheduler: FavoriteSyncScheduler,
) : UserRepository {
    override fun observe(id: Long): Flow<User?> =
        database.userDao().observe(id).map { it?.toDomain() }

    override suspend fun refresh(id: Long) {
        val dto = api.user(id)
        database.userDao().upsertAll(listOf(dto.toEntity(query = "")))
    }

    override suspend fun setFavorite(id: Long, favorite: Boolean) {
        val operation = PendingFavoriteEntity(
            operationId = UUID.randomUUID().toString(),
            userId = id,
            favorite = favorite,
        )
        database.withTransaction {
            database.userDao().setFavorite(id, favorite)
            database.pendingFavoriteDao().insert(operation)
        }
        syncScheduler.enqueue(id)
    }

    override fun search(query: String): Flow<PagingData<User>> =
        createPager(query).flow.map { paging -> paging.map(UserEntity::toDomain) }
}

// 测试：已有缓存 + API 失败时 observe 仍发缓存，DAO 不执行 delete；
// refresh 成功后 API 数据先入库，再由 observe 发射。

// Commit 6 — remote-mediator: 搜索分页只更新 Room
class UserRemoteMediator(
    private val query: String,
    private val database: AppDatabase,
    private val api: UserApi,
) : RemoteMediator<Int, UserEntity>() {
    override suspend fun load(
        loadType: LoadType,
        state: PagingState<Int, UserEntity>,
    ): MediatorResult {
        val page = when (loadType) {
            LoadType.REFRESH -> 1
            LoadType.PREPEND -> return MediatorResult.Success(true)
            LoadType.APPEND -> database.remoteKeyDao().next(query)
                ?: return MediatorResult.Success(true)
        }
        return try {
            val response = api.users(query, page)
            database.withTransaction {
                if (loadType == LoadType.REFRESH) {
                    database.userDao().clearQuery(query)
                }
                database.userDao().upsertAll(
                    response.items.map { it.toEntity(query) },
                )
                database.remoteKeyDao().upsert(query, response.nextPage)
            }
            MediatorResult.Success(response.nextPage == null)
        } catch (failure: IOException) {
            MediatorResult.Error(failure)
        } catch (failure: HttpException) {
            MediatorResult.Error(failure)
        }
    }
}

// 测试：REFRESH 清当前 query 并写 key；APPEND 用 nextPage；
// 断网返回 Error 但缓存行仍存在；末页不再请求。

// Commit 7 — worker: 收藏最终同步
@HiltWorker
class FavoriteWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val database: AppDatabase,
    private val api: UserApi,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = try {
        database.pendingFavoriteDao().all().forEach { operation ->
            api.setFavorite(
                id = operation.userId,
                operationId = operation.operationId,
                body = FavoriteBody(operation.favorite),
            )
            database.pendingFavoriteDao().delete(operation.operationId)
        }
        Result.success()
    } catch (failure: IOException) {
        Result.retry()
    } catch (failure: HttpException) {
        if (failure.code() == 401) Result.failure() else Result.retry()
    }
}

// 唯一 Work + CONNECTED + EXPONENTIAL；测试 IO 重试、401 失败、成功删 pending。

// Commit 8 — viewmodel: 可恢复输入与正交 UiState
data class UserUiState(
    val user: User? = null,
    val refreshing: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class UserViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val repository: UserRepository,
) : ViewModel() {
    private val id: Long = checkNotNull(savedStateHandle["id"])
    private val refresh = MutableStateFlow<RefreshState>(RefreshState.Idle)
    private var refreshJob: Job? = null

    val uiState = combine(repository.observe(id), refresh) { user, state ->
        UserUiState(
            user = user,
            refreshing = state is RefreshState.Loading,
            error = (state as? RefreshState.Failed)?.message,
        )
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        UserUiState(refreshing = true),
    )

    init { refresh() }

    fun refresh() {
        if (refreshJob?.isActive == true) return
        refreshJob = viewModelScope.launch {
            refresh.value = RefreshState.Loading
            refresh.value = try {
                repository.refresh(id)
                RefreshState.Idle
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Throwable) {
                RefreshState.Failed(failure.message ?: "刷新失败")
            }
        }
    }

    fun toggleFavorite() {
        val user = uiState.value.user ?: return
        viewModelScope.launch {
            repository.setFavorite(id, !user.favorite)
        }
    }
}

// 测试：缓存与错误并存、retry 清错误、快速重复 refresh 只调用一次；
// 重建 ViewModel 时由 SavedStateHandle id + Room 文件恢复内容。

// Commit 9 — compose: 类型安全导航与自适应 UI
@Serializable data object SearchRoute
@Serializable data class UserRoute(val id: Long)

@Composable
fun LearningApp() {
    val navController = rememberNavController()
    NavHost(navController, startDestination = SearchRoute) {
        composable<SearchRoute> {
            SearchScreen(
                onUserClick = { id -> navController.navigate(UserRoute(id)) },
            )
        }
        composable<UserRoute>(
            deepLinks = listOf(
                navDeepLink<UserRoute>(
                    basePath = "https://example.com/users",
                ),
            ),
        ) {
            UserDetailRoute(onBack = navController::popBackStack)
        }
    }
}

// Compact：列表 → 详情；Expanded：ListDetailPaneScaffold 同屏。
// selectedUserId 进入 SavedStateHandle；窗口尺寸只作派生布局状态。
// 测试：Loading、Content+Error、retry、收藏语义、两种窗口布局与 Deep Link。

// Commit 10 — end-to-end: 故障旅程与发布门禁
// 测试任务：
// ./gradlew testDebugUnitTest lintDebug
// ./gradlew connectedDebugAndroidTest
// ./gradlew :benchmark:connectedCheck
//
// 必须保存的验收证据：
// 1. 离线：先在线打开用户，杀进程/断网/重开，Room 缓存立即可见；
//    refresh 错误只显示提示，点击 retry 后恢复。
// 2. 旋转：ActivityScenario.recreate 后 UiState 内容和滚动位置相同，
//    Fake API 调用数不增加，正在进行的 ViewModel Job 不重建。
// 3. 进程重建：DontKeepActivities/测试重启后路由 id 从 SavedStateHandle 恢复，
//    Room 内容仍显示；pending 收藏由 WorkManager 继续同步。
// 4. Deep Link：ACTION_VIEW 打开 /users/42，直接到详情并读到 id=42。
// 5. 分页：APPEND 失败只显示尾部重试，已有行不消失；重试从正确 key 继续。
// 6. 数据升级：用 v1 预置数据库安装，再覆盖安装 v2，旧用户仍存在。
//
// 只有以上六条都有自动化断言或可复现录像/日志，综合项目才算完成。`,
    solutionExplanation: "答案把大项目拆成十个单向、可验证提交：契约→本地事实源→迁移→网络→Repository→分页→后台同步→状态→Compose→端到端。每步都写明最小实现、关键测试和验证命令，最终用离线、旋转、进程死亡、深链、分页重试和数据库升级六类故障证明闭环。",
    solutionChecks: ["十个提交依次覆盖题目要求且每步有编译/测试门槛", "Room 唯一事实源、Paging、WorkManager、ViewModel 与 Compose 主链完整", "最终证据覆盖离线、旋转、进程恢复、Deep Link、重试和 Migration"],
  },

  "android-modularization-build": {
    solution: `// 一、最小无环模块图
//
// :app
// ├─ implementation(:feature:user:impl)
// ├─ implementation(:feature:order:impl)
// ├─ implementation(:core:data)
// └─ implementation(:core:designsystem)
//
// :feature:user:impl  → :feature:user:api, :core:model, :core:designsystem
// :feature:order:impl → :feature:order:api, :core:model, :core:designsystem
// :core:data          → :core:database, :core:network, :core:model
// :core:database      → :core:model
// :core:network       → :core:model
// :core:testing       → :core:model（仅 testImplementation）
//
// api 模块只放 Route/Entry 接口和必要领域契约；impl 放 ViewModel、UI、实现。
// user:impl 与 order:impl 互不依赖，共享类型下沉到 core:model。

// feature:user:api
interface UserFeatureEntry {
    @Composable
    fun UserRoute(
        userId: Long,
        onBack: () -> Unit,
        onOpenOrder: (Long) -> Unit,
    )
}

// feature:user:impl
class DefaultUserFeatureEntry @Inject constructor() : UserFeatureEntry {
    @Composable
    override fun UserRoute(
        userId: Long,
        onBack: () -> Unit,
        onOpenOrder: (Long) -> Unit,
    ) {
        UserRouteInternal(userId, onBack, onOpenOrder)
    }
}

// app 只通过 api 接口编排导航；Hilt 把 impl 绑定为入口。
// 修改 UserCard.kt 只重新编译 user:impl 及必要聚合/打包任务，
// order:impl 不在依赖路径中，因此不会重新编译。

// 二、build-logic/convention AndroidFeatureConventionPlugin.kt
class AndroidFeatureConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply("com.android.library")
        pluginManager.apply("org.jetbrains.kotlin.android")
        pluginManager.apply("org.jetbrains.kotlin.plugin.compose")

        extensions.configure<LibraryExtension> {
            compileSdk = 35
            defaultConfig {
                minSdk = 24
                testInstrumentationRunner =
                    "androidx.test.runner.AndroidJUnitRunner"
                consumerProguardFiles("consumer-rules.pro")
            }
            buildFeatures {
                compose = true
                buildConfig = false
            }
            testOptions {
                unitTests.isIncludeAndroidResources = true
            }
            lint {
                warningsAsErrors = true
                abortOnError = true
            }
        }

        extensions.configure<KotlinAndroidProjectExtension> {
            compilerOptions {
                jvmTarget.set(JvmTarget.JVM_17)
                allWarningsAsErrors.set(true)
                freeCompilerArgs.add("-Xcontext-parameters")
            }
        }

        dependencies {
            add("implementation", platform(libs.findLibrary(
                "androidx-compose-bom",
            ).get()))
            add("implementation", libs.findLibrary(
                "androidx-lifecycle-runtime-compose",
            ).get())
            add("testImplementation", libs.findLibrary("junit").get())
            add("androidTestImplementation", platform(libs.findLibrary(
                "androidx-compose-bom",
            ).get()))
            add("androidTestImplementation", libs.findLibrary(
                "androidx-compose-ui-test-junit4",
            ).get())
        }
    }
}

// feature 模块 build.gradle.kts
plugins {
    id("learning.android.feature")
    alias(libs.plugins.ksp)
}
dependencies {
    implementation(projects.feature.user.api)
    implementation(projects.core.model)
    implementation(projects.core.designsystem)
}

// 三、gradle/libs.versions.toml
[versions]
agp = "8.9.2"
kotlin = "2.1.21"
ksp = "2.1.21-2.0.1"
compose-bom = "2025.05.01"
lifecycle = "2.9.0"

[libraries]
androidx-compose-bom = {
  module = "androidx.compose:compose-bom",
  version.ref = "compose-bom"
}
androidx-lifecycle-runtime-compose = {
  module = "androidx.lifecycle:lifecycle-runtime-compose",
  version.ref = "lifecycle"
}
junit = { module = "junit:junit", version = "4.13.2" }

[plugins]
android-application = {
  id = "com.android.application",
  version.ref = "agp"
}
android-library = {
  id = "com.android.library",
  version.ref = "agp"
}
kotlin-android = {
  id = "org.jetbrains.kotlin.android",
  version.ref = "kotlin"
}
kotlin-compose = {
  id = "org.jetbrains.kotlin.plugin.compose",
  version.ref = "kotlin"
}
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }

// 版本值是示例锁定值；升级时必须核对官方兼容矩阵和当前稳定版。

// 四、CI 四阶段
// Stage 1 — verify（每次 PR，10 分钟目标）
// ./gradlew spotlessCheck lintDebug testDebugUnitTest --configuration-cache
//
// Stage 2 — affected integration（按模块变更并行）
// ./gradlew :core:database:connectedDebugAndroidTest
// ./gradlew :feature:user:impl:connectedDebugAndroidTest
// ./gradlew :feature:order:impl:connectedDebugAndroidTest
//
// Stage 3 — release artifact（主分支）
// ./gradlew :app:bundleRelease :app:assembleRelease
// 归档 AAB、mapping.txt、native symbols、签名/依赖清单并跑 bundletool 校验。
//
// Stage 4 — performance/security（夜间与发版）
// ./gradlew :benchmark:connectedCheck :baselineprofile:generateBaselineProfile
// dependency verification、license、secret scan、R8 smoke test。
//
// CI 缓存只保存 Gradle User Home 与 build cache；不缓存签名密钥。
// 使用 --scan 或 build report 记录 task graph：
// 修改 user UI 后断言 :feature:order:impl:compile* 为 UP-TO-DATE/未执行。`,
    solutionExplanation: "模块按业务能力与稳定共享边界拆分，user/order 实现没有依赖边，因此修改用户 UI 不会触发订单实现编译。api 只公开必要入口，implementation 防止传递泄漏；Convention Plugin 统一 Android/Kotlin/Compose/Lint 测试配置，Version Catalog 统一坐标，CI 从快速验证逐步走到制品与性能安全。",
    solutionChecks: ["无环模块图、api/implementation 边界与编译隔离说明完整", "Convention Plugin 和 Version Catalog 提供可落地片段", "CI 四阶段含命令、产物、缓存与编译避让验证"],
  },

  "android-production-quality": {
    solution: `// Android 1.0 生产发布单
// 每一项都写“负责人信号 / 验证 / 失败处理”，不能只勾一个完成框。

// 阶段 1：构建前 — 数据、服务端与权限边界
// [权限降级] Owner: Android / Signal: 相机拒绝率、头像完成率
// 实现：相机权限只在点击“拍照”时请求；拒绝后保留系统 Photo Picker、
// 文件选择与默认头像；永久拒绝时说明原因并提供系统设置入口。
// 验证：首次拒绝、二次拒绝、不再询问、无相机设备、进程重建五条 UI 测试。
// 失败：关闭相机入口 Feature Flag，不影响登录与资料页。
//
// [Room Migration] Owner: Data / Signal: migration crash、DB open latency
// 实现：导出每版 schema，显式 Migration，不使用 fallbackToDestructiveMigration。
// 验证：从所有仍在线版本的真实预置 DB 升到 1.0，断言行数/关键字段/索引；
// 大库上测升级耗时和磁盘余量，升级操作可重复但不重复改写。
// 失败：停止灰度；若版本已发，优先发向前兼容修复，绝不回滚到不认识新 schema 的 APK。
//
// [服务端兼容] Owner: Backend / Signal: 4xx、解析失败
// 验证：旧客户端 + 新服务端、新客户端 + 旧/新服务端契约测试；
// 新字段可选、枚举有 unknown、分页与幂等键向后兼容。
// 失败：服务端 Feature Flag 回退响应，不强迫 APK 紧急回滚。

// 阶段 2：制品 — 登录、网络安全、R8 与性能
// [Token 刷新] Owner: Identity / Signal: 401、refresh 成功率、重复登录率
// 实现：Authenticator 用 Mutex/单飞刷新；刷新请求使用不带 Authenticator 的 client，
// 防止递归；只重放可安全重试或有幂等键的请求；refresh token 进入 Keystore 支持存储。
// 验证：20 个并发 401 只触发一次 refresh；refresh 401 清除凭据并回登录；
// 超时不清本地账号；日志不包含 Authorization。
// 失败：远程关闭自动重放，降级为重新登录并保留未提交本地草稿。
//
// [Network Security] Owner: Security / Signal: TLS/cleartext violation
// 实现：release usesCleartextTraffic=false；network_security_config 只给 debug
// 本地代理例外；信任系统 CA，不把证书/Token 写入资源；如使用 Pinning，必须有备份 pin
// 和远程应急方案，并先证明业务确实需要。
// 验证：HTTP 请求在 release 失败，TLS 过期/主机名错误失败，代理抓包无敏感字段。
// 失败：停发；pin 事故用预置备份 pin/服务端证书轮换，不发布放开明文的热修。
//
// [R8] Owner: Build / Signal: release-only crash、APK/AAB size
// 实现：minifyEnabled/shrinkResources=true；只保留反射、序列化、JNI 必需规则；
// 库规则放 consumer-rules.pro；mapping.txt 与 native symbols 按 versionCode 归档。
// 验证：签名 release smoke test 覆盖登录、Room、Compose 列表、Worker、相机上传；
// retrace 一个人工混淆堆栈并核对可还原源码行。
// 失败：先补最小 keep rule；不能用 -keep class ** { *; } 全局关闭优化。
//
// [Baseline Profile] Owner: Performance / Signal: cold start P50/P90、jank
// 实现：Profile 覆盖启动→登录态恢复→列表首屏→滚动→详情。
// 验证：同型号真机 release Macrobenchmark 10 次，比较有/无 Profile；
// 检查 APK 中 Profile 已合并，P90 和 jank 不回退。
// 失败：不以 Debug 体感替代数据；移除错误路径并重新生成、重新基准。

// 阶段 3：内部测试 — 功能与恢复矩阵
// [Compose 列表] Owner: Feature / Signal: 空白页、ANR、jank
// 验证：Loading/Empty/Content/Error、refresh/append、稳定 key、旋转/分屏、
// TalkBack、字体 200%、暗色、高对比、RTL、键盘导航；断网保留 Room 缓存并可 retry。
// 失败：关闭新 Compose 列表 Flag，回旧列表；数据库与 API 契约保持双向兼容。
//
// [后台同步] Owner: Sync / Signal: pending 数、Work failure/retry、耗电
// 验证：CONNECTED 约束、unique work、指数退避、401 failure、5xx retry、
// 设备重启后 pending 继续、重复 operationId 服务端幂等。
// 失败：远程暂停调度但保留 pending；修复后继续消费，不删除用户操作。
//
// [相机头像] Owner: Profile / Signal: upload 成功率、OOM
// 验证：FileProvider URI、MIME/大小校验、EXIF 旋转、下采样、临时文件清理；
// 上传前移除不必要 EXIF，不记录本地绝对路径。
// 失败：降级 Photo Picker/默认头像，服务端保留旧头像。

// 阶段 4：灰度 — 1% → 5% → 20% → 50%
// [监控] Owner: Release captain / Signal:
// crash-free users、ANR、启动 P90、登录成功率、Migration 失败率、
// API 4xx/5xx、列表空白率、Worker pending P95、头像成功率、Play vitals。
// 每档至少覆盖一个业务高峰；按 app version、设备、OS、国家和网络切片。
// 告警必须带 versionCode、build SHA、route、非敏感 requestId；禁止上报 Token/邮箱全文。
// 失败阈值示例：crash-free 比基线下降 0.2pp、Migration 任一数据丢失、
// 登录成功率下降 1pp 或 ANR 超门槛，自动停止继续放量。

// 阶段 5：全量
// [签署] Android、Backend、QA、Security、Data、Support 与 Release captain 确认；
// Play Console 制品 SHA、签名证书、versionCode、mapping、symbols、SBOM 均归档。
// 保留服务器旧字段/端点至少一个客户端强更周期；继续看 24h/72h 指标。

// 阶段 6：回滚与向前修复
// 1. 首选停止 rollout + 服务端/Feature Flag 关闭新功能。
// 2. APK 回滚必须确认旧版本能读取新 Room schema、理解服务端响应；
//    否则发布 versionCode 更高的向前修复包，不能把数据库降级。
// 3. 登录事故：关闭自动 refresh，保留本地非敏感状态，引导重新认证。
// 4. 同步事故：停 Worker 入队但保留 pending；服务恢复后幂等补偿。
// 5. 记录时间线、影响版本、指标、决策人和恢复证据；24～72 小时内复盘。

// 发版完成的硬证据：
// release AAB + mapping/symbols/SBOM；全迁移测试报告；R8 release smoke；
// Macrobenchmark/Baseline 报告；权限与无障碍矩阵；灰度 Dashboard 截图；
// 回滚演练记录。缺任一高风险项，不进入下一档。`,
    solutionExplanation: "发布单按构建前、制品、内部测试、灰度、全量、回滚六阶段组织，并让八个题目要求都具备负责人信号、验证方法和失败处理。它特别处理了数据库不可随 APK 简单降级、Token 刷新单飞、同步 pending 不丢、R8 可还原、灰度指标分层和 Feature Flag/向前修复。",
    solutionChecks: ["权限、Token、网络、R8、Profile、监控、灰度和回滚八项齐全", "每项均有验证、负责人信号和失败处理", "覆盖 Room/服务端兼容、制品归档、阈值停发与向前修复"],
  },
};
