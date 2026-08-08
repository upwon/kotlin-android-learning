import type { CompleteChapterContent } from "./content-types";

export const productionAndroidContent: Record<string, CompleteChapterContent> = {
  "compose-offline-capstone": {
    sections: [
      {
        id: "product-contract",
        eyebrow: "01 · 需求与验收",
        title: "先把离线、刷新、恢复和冲突写成可测试契约",
        paragraphs: [
          "最终项目实现一个用户目录：搜索结果分页、详情缓存、收藏离线写入、后台同步、错误重试和类型安全导航。每项能力都要说明无网、旋转、进程死亡、重复点击和服务器失败时的预期。",
          "验收不是“页面能打开”。列表缓存应立即出现；网络刷新不能清空旧内容；新查询取消旧链路；收藏先本地生效并最终同步；重启应用后查询词、收藏事实和待同步操作仍能恢复。",
        ],
        bullets: [
          "Room 是列表、详情和收藏的本地事实源",
          "RemoteMediator 只更新数据库",
          "DataStore 保存主题与非业务设置",
          "WorkManager 同步待提交操作",
          "Compose 只渲染 UiState 并上报 Action",
        ],
      },
      {
        id: "feature-boundaries",
        eyebrow: "02 · 项目结构",
        title: "按功能和依赖方向拆边界，不按技术名堆包",
        paragraphs: [
          "app 负责导航和应用入口；feature:users 负责列表与详情 UI；core:model 定义稳定领域模型；core:database、core:network 实现数据源；core:data 组合 Repository；core:designsystem 提供主题与组件。",
          "功能模块只依赖公开接口与模型，不直接跨模块读取其他功能的 DAO。依赖方向从 UI 指向抽象，再由应用组装实现，避免所有模块互相 implementation。",
        ],
        kotlinCode: `// 依赖方向
// app
//  ├─ feature:users
//  ├─ core:data
//  └─ core:designsystem
// feature:users -> core:model + repository API
// core:data -> core:database + core:network + core:model

interface UserRepository {
    fun user(id: Long): Flow<User?>
    fun search(query: String): Flow<PagingData<User>>
    suspend fun setFavorite(id: Long, favorite: Boolean)
}`,
      },
      {
        id: "offline-data-chain",
        eyebrow: "03 · 数据链路",
        title: "读只从 Room 出，远端结果和同步状态都写回 Room",
        paragraphs: [
          "搜索 Pager 使用 DAO PagingSource 与 UserRemoteMediator；详情 observeUser 读取 Entity；refresh 请求 API 后在事务中 upsert。收藏点击先更新本地 favorite 和 PendingMutation，再入队唯一 Work。",
          "服务器成功后删除 PendingMutation；可重试错误保留队列并退避；认证或数据冲突进入明确失败状态。客户端生成 operationId，让重复 Worker 调用保持幂等。",
        ],
        kotlinCode: `override suspend fun setFavorite(
    id: Long,
    favorite: Boolean,
) {
    database.withTransaction {
        userDao.setFavorite(id, favorite)
        pendingMutationDao.upsert(
            PendingMutationEntity.favorite(
                userId = id,
                favorite = favorite,
            ),
        )
    }
    syncScheduler.enqueue()
}`,
      },
      {
        id: "viewmodel-state",
        eyebrow: "04 · ViewModel",
        title: "查询、分页、详情和操作状态各自拥有清晰寿命",
        paragraphs: [
          "SearchViewModel 把 SavedStateHandle 查询词规范化、防抖并 flatMapLatest 到 Pager.flow.cachedIn。UserViewModel 根据路由 id 观察 Room，并把刷新和收藏操作状态组合进 UiState。",
          "一次操作不应覆盖整个页面内容。缓存 User、refreshing、favoritePending 和 errorMessage 可以同时存在；重试方法针对失败动作，而不是重新创建 ViewModel。",
        ],
        kotlinCode: `val users = savedStateHandle
    .getStateFlow("query", "")
    .map(String::trim)
    .debounce(300)
    .distinctUntilChanged()
    .flatMapLatest(repository::search)
    .cachedIn(viewModelScope)

fun onAction(action: UserAction) {
    when (action) {
        UserAction.Retry -> refresh()
        is UserAction.FavoriteChanged ->
            updateFavorite(action.favorite)
    }
}`,
      },
      {
        id: "compose-experience",
        eyebrow: "05 · Compose UI",
        title: "同一状态在手机、平板、加载和离线场景下都有完整表达",
        paragraphs: [
          "根 NavHost 持有 NavController；SearchScreen 使用 Paging Compose；UserScreen 渲染缓存、刷新、错误和收藏同步状态。宽屏使用列表详情布局，但选中 userId 与数据状态不因布局变化而复制。",
          "Material 3 主题来自 DataStore；所有图标操作有语义描述；系统栏、IME、文字缩放与深色主题都进入验收。Preview 使用固定状态覆盖 Loading、Empty、Content、Cached+Error。",
        ],
        kotlinCode: `@Composable
fun UserScreen(
    state: UserScreenState,
    onAction: (UserAction) -> Unit,
    onBack: () -> Unit,
) {
    when {
        state.initialLoading -> FullScreenLoading()
        state.user == null -> ErrorPane(
            message = state.errorMessage.orEmpty(),
            onRetry = { onAction(UserAction.Retry) },
        )
        else -> UserContent(
            user = state.user,
            refreshing = state.refreshing,
            errorMessage = state.errorMessage,
            onFavorite = { value ->
                onAction(UserAction.FavoriteChanged(value))
            },
        )
    }
}`,
      },
      {
        id: "end-to-end-tests",
        eyebrow: "06 · 端到端验证",
        title: "用故障场景证明架构，而不是只走成功路径",
        paragraphs: [
          "DAO 测 Migration 与分页查询，RemoteMediator 测 REFRESH/APPEND 事务，Repository 测失败不清缓存，ViewModel 测防抖取消和状态组合，Compose 测试用户行为，Macrobenchmark 测启动与滚动。",
          "端到端场景包括：首次在线、已有缓存离线、刷新超时、追加失败、旋转、进程重建、收藏同步重试、Deep Link 冷启动和数据库升级。每个场景都记录请求次数与最终持久数据。",
        ],
        kotlinCode: `@Test
fun cached_user_survives_offline_rotation_and_retry() {
    seedCachedUser()
    api.failNext(IOException("offline"))
    launchUserDeepLink()

    assertUserVisible()
    recreateActivity()
    assertUserVisible()
    assertEquals(1, api.requestCount)

    api.succeedNext(updatedUser)
    clickRetry()
    assertUpdatedUserVisible()
}`,
        note: "完成本章的标准是：删除网络后应用仍可浏览缓存、修改收藏并在恢复网络后自动收敛。",
      },
    ],
    exercise: {
      title: "按十个可验证提交完成 Compose 离线应用",
      prompt: "依次完成模型、Room、Migration、Retrofit、Repository、RemoteMediator、WorkManager 收藏同步、ViewModel、Compose 自适应 UI、端到端测试。每个提交必须编译并附一条关键测试；最后证明离线、旋转、进程重建、深链和重试。",
      hint: "先建立 Room 事实源，再接网络；先完成单屏状态，再接导航；最后用故障场景串联，而不是一次写完整应用。",
    },
  },

  "android-modularization-build": {
    sections: [
      {
        id: "module-why",
        eyebrow: "01 · 模块边界",
        title: "模块化用于控制依赖和构建范围，不是制造更多文件夹",
        paragraphs: [
          "多模块可以限制可见性、缩短增量构建影响范围、支持并行团队和独立测试。但小项目过早拆成几十个模块会增加配置与依赖管理成本。先根据稳定业务边界拆 feature 与 core。",
          "模块应有清楚公共 API。实现细节保持 internal，其他模块不能跨越 Repository 直接访问 DAO。使用依赖图检查循环和意外 api 暴露。",
        ],
        kotlinCode: `// 推荐起点
// :app
// :feature:users:api
// :feature:users:impl
// :core:model
// :core:data
// :core:database
// :core:network
// :core:designsystem
// :core:testing`,
      },
      {
        id: "dependency-rules",
        eyebrow: "02 · 依赖规则",
        title: "api 会传递暴露，implementation 保持边界",
        paragraphs: [
          "implementation 依赖不进入消费者编译类路径，有利于隔离变化；只有公共签名确实包含依赖类型时才使用 api。功能之间通过 api 模块或导航契约协作，避免实现模块互相引用。",
          "动态功能、KMP 或大型团队可进一步拆分，但课程先掌握单向依赖、无循环和最小公共表面。",
        ],
        kotlinCode: `dependencies {
    implementation(projects.core.model)
    implementation(projects.core.data)
    implementation(projects.core.designsystem)

    // 只有公开 API 真正暴露该类型时才使用 api
    testImplementation(projects.core.testing)
}`,
      },
      {
        id: "catalog-convention",
        eyebrow: "03 · 构建逻辑",
        title: "Version Catalog 管版本，Convention Plugin 管共同配置",
        paragraphs: [
          "libs.versions.toml 统一插件和依赖坐标，type-safe accessor 减少字符串错误。Convention Plugin 把 compileSdk、Kotlin、Compose、Lint 和测试选项应用到模块，避免复制几十份 build.gradle.kts。",
          "版本目录不负责兼容性判断；升级 Kotlin、AGP、Compose、KSP 时仍要查官方矩阵，并让每个版本跨越保持可回滚。",
        ],
        kotlinCode: `// build-logic 中的约定插件
class AndroidFeatureConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply("com.android.library")
        pluginManager.apply("org.jetbrains.kotlin.android")
        pluginManager.apply("org.jetbrains.kotlin.plugin.compose")

        extensions.configure<LibraryExtension> {
            compileSdk = 36
            buildFeatures.compose = true
        }
    }
}`,
      },
      {
        id: "build-performance",
        eyebrow: "04 · 构建性能",
        title: "先用 Build Analyzer 和 Profile 找瓶颈",
        paragraphs: [
          "构建慢可能来自注解处理、不可缓存任务、过宽 api 依赖、配置阶段脚本和频繁 clean。先比较 clean 与增量构建，再观察任务关键路径；不要把 clean build 当日常性能指标。",
          "优先使用 KSP、配置缓存、构建缓存和可增量处理器。模块化只有在依赖边界合理时才缩小重编译范围，错误拆分反而增加配置开销。",
        ],
        kotlinCode: `# 本地与 CI 使用同一 JDK 和 Gradle 参数
./gradlew :app:assembleDebug --profile
./gradlew testDebugUnitTest lintDebug

# 修改一个 feature Kotlin 文件后再次构建，
# 比较实际执行任务与缓存命中。`,
      },
      {
        id: "ci-quality",
        eyebrow: "05 · CI",
        title: "CI 复现本地构建，并把质量检查分层并行",
        paragraphs: [
          "快速阶段运行格式、静态检查和单元测试；构建阶段产出 APK/AAB；设备阶段运行关键 instrumentation 与 Macrobenchmark；发布阶段签名、上传并保留制品和 mapping。",
          "缓存键包含 Gradle、锁文件和 JDK 信息，敏感签名与服务凭据只放受保护 Secret。失败日志和报告要作为构建制品保存，不能只留一个红叉。",
        ],
        kotlinCode: `// CI 门禁示意
// 1. ./gradlew spotlessCheck lintDebug testDebugUnitTest
// 2. ./gradlew assembleRelease
// 3. managed device / Firebase Test Lab
// 4. baseline profile + macrobenchmark
// 5. bundleRelease + signing + staged rollout`,
        note: "能在新机器上一条命令得到同样产物，才算构建工程可维护。",
      },
    ],
    exercise: {
      title: "把单模块应用演进为可维护模块图",
      prompt: "现有 app 同时包含用户、订单、Room、Retrofit、主题和测试工具。设计不循环的模块图，标出 api/implementation；写一个 AndroidFeature Convention Plugin、Version Catalog 片段和 CI 四阶段。要求修改用户 UI 不重编译订单实现。",
      hint: "先按 feature 与 core 拆最少模块，再通过公共模型/接口连接；不要直接把每个包变成模块。",
    },
  },

  "android-production-quality": {
    sections: [
      {
        id: "permissions-privacy",
        eyebrow: "01 · 权限与隐私",
        title: "只在功能需要时请求最小权限，并允许用户拒绝",
        paragraphs: [
          "先使用无需权限的系统 Picker 或受限 API，再申请运行时权限。请求前解释用途，拒绝后提供降级路径；只有用户明确触发功能时才弹权限，不在启动页连环请求。",
          "数据收集、日志与分析遵循最小化原则。不要记录令牌、密码、完整定位或用户内容；隐私清单与商店声明要和真实 SDK 行为一致。",
        ],
        kotlinCode: `val permissionLauncher = rememberLauncherForActivityResult(
    ActivityResultContracts.RequestPermission(),
) { granted ->
    if (granted) openCamera() else showCameraFallback()
}

Button(onClick = {
    permissionLauncher.launch(Manifest.permission.CAMERA)
}) {
    Text("拍摄头像")
}`,
      },
      {
        id: "network-secrets",
        eyebrow: "02 · 网络与密钥",
        title: "客户端不能保守秘密，认证与传输都要按不可信环境设计",
        paragraphs: [
          "服务端密钥不能放进 APK、BuildConfig 或 native 库；客户端只持有可撤销的用户凭据。Token 刷新要串行，401 重试有上限，退出登录必须清理内存与受保护存储。",
          "使用 HTTPS、合理超时和证书信任策略。Network Security Config 禁止意外明文流量；证书固定只在团队能维护轮换与应急更新时使用。",
        ],
        kotlinCode: `class Authenticator @Inject constructor(
    private val tokenRepository: TokenRepository,
) : okhttp3.Authenticator {
    override fun authenticate(
        route: Route?,
        response: Response,
    ): Request? {
        if (responseCount(response) >= 2) return null
        val token = tokenRepository.refreshBlocking() ?: return null
        return response.request.newBuilder()
            .header("Authorization", "Bearer " + token)
            .build()
    }
}`,
      },
      {
        id: "r8-release-build",
        eyebrow: "03 · R8 与制品",
        title: "Release 构建必须真实运行，保留规则要最小且可验证",
        paragraphs: [
          "R8 移除、优化和混淆代码，反射、序列化和 JNI 边界可能需要 keep 规则。优先使用库自带 consumer rules 与生成代码，不要用 -keep class ** 关闭全部优化。",
          "每次发布保存 mapping、native symbols、AAB 和依赖清单。至少在 minified release 上运行关键 UI 和网络序列化测试，避免 Debug 正常而线上崩溃。",
        ],
        kotlinCode: `android {
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}`,
      },
      {
        id: "performance-reliability",
        eyebrow: "04 · 性能与可靠性",
        title: "围绕启动、帧、ANR、内存和电量建立指标",
        paragraphs: [
          "Macrobenchmark 测启动和关键交互，Baseline Profile 优化首次运行；JankStats、系统 Trace 和内存分析定位慢帧与泄漏。不要只在高端开发机观察平均值。",
          "ANR 重点检查主线程 I/O、锁竞争、Binder 和启动初始化；后台工作遵守系统限制并使用 WorkManager。性能修复必须记录设备、构建类型、数据量和前后分位数。",
        ],
        kotlinCode: `data class QualityBaseline(
    val coldStartP50Ms: Long,
    val coldStartP95Ms: Long,
    val slowFramePercent: Double,
    val anrRate: Double,
    val crashFreeUsers: Double,
)`,
      },
      {
        id: "observability",
        eyebrow: "05 · 可观测性",
        title: "日志、崩溃、指标和业务事件使用同一版本上下文",
        paragraphs: [
          "结构化日志包含版本、页面、请求 id 和不敏感错误分类；Crash 工具上传 mapping 后才能还原混淆堆栈；关键链路用 trace 连接 UI、网络和数据库耗时。",
          "监控要能回答新版本是否造成崩溃、ANR、启动和业务成功率回退。采样与脱敏在客户端和服务端同时执行，Debug 日志不能原样进入生产。",
        ],
        kotlinCode: `analytics.track(
    event = "user_refresh_failed",
    properties = mapOf(
        "source" to "detail",
        "cached" to hasCachedUser,
        "category" to error.toCategory(),
    ),
)
// 不上传 URL 查询参数、token 或用户输入原文。`,
      },
      {
        id: "rollout-rollback",
        eyebrow: "06 · 发布与回滚",
        title: "发布是渐进验证过程，不是上传 AAB 的最后一步",
        paragraphs: [
          "发布前固定版本、运行 release 门禁、验证数据库 Migration 与后端兼容，再进行内部、灰度和分阶段放量。远端配置和功能开关要有默认值与失效策略。",
          "回滚计划包含旧客户端与新服务端是否兼容、数据库能否降级、开关如何关闭和负责人。数据库破坏性迁移通常不能靠回滚 APK 恢复，因此上线前必须备份和验证。",
        ],
        bullets: [
          "Release 单元/UI/Migration 测试全部通过",
          "Baseline 与 Macrobenchmark 无未解释回退",
          "mapping、symbols、AAB、SBOM 已归档",
          "灰度监控 Crash、ANR、启动和核心业务成功率",
          "明确停止放量、关闭开关和服务端回退条件",
        ],
        note: "真正的完成定义是：上线后能发现问题、限制影响并安全恢复。",
      },
    ],
    exercise: {
      title: "为 1.0 版本编写生产发布单",
      prompt: "项目包含登录、Room Migration、Compose 列表、后台同步和相机头像。给出权限降级、Token 刷新、Network Security、R8、Baseline Profile、崩溃监控、灰度指标和回滚方案。每项写明验证方式、负责人信号和失败处理。",
      hint: "按构建前、制品、内部测试、灰度、全量、回滚六阶段组织；数据库和服务端兼容必须单独检查。",
    },
  },
};
