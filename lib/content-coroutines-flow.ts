import type { CompleteChapterContent } from "./content-types";

export const coroutinesFlowContent: Record<string, CompleteChapterContent> = {
  "coroutine-mental-model": {
    sections: [
      {
        id: "thread-vs-coroutine",
        eyebrow: "01 · 心智模型",
        title: "协程是可暂停的任务，线程是执行它的资源",
        paragraphs: [
          "线程由操作系统调度，创建和切换成本相对高；协程由 Kotlin 协程库调度，可以在等待时暂停，把线程还给其他任务。一个线程能先后推进大量协程，一条协程也可能在不同线程上继续执行。",
          "挂起不等于后台执行。suspend 只表示函数可能暂停而不阻塞当前线程，具体在哪个线程执行由 CoroutineContext 与实现决定。直接在 Main 调用一个内部执行阻塞 I/O 的 suspend 函数，界面仍会卡顿。",
        ],
        code: {
          title: "等待期间是否占住线程",
          java: `Thread.sleep(1_000); // 线程被占住
showResult();`,
          kotlin: `delay(1_000) // 协程挂起，线程可执行其他任务
showResult()

// suspend 不是自动切线程
suspend fun badLoad() = blockingClient.execute()`,
        },
      },
      {
        id: "suspend-continuation",
        eyebrow: "02 · suspend 与 Continuation",
        title: "编译器把挂起点后的工作装进续体",
        paragraphs: [
          "从概念上看，suspend fun load(): User 会多接收一个 Continuation<User>，正常立即完成时返回结果，真正挂起时返回特殊标记。异步操作完成后通过 continuation.resume 恢复后续计算。你通常不手写这个参数，但理解它能解释调用限制。",
          "suspend 函数只能从另一个 suspend 函数或协程构建器调用，因为调用方必须提供续体。它并不创建协程；launch、async、runBlocking 等构建器才创建并启动协程。",
        ],
        kotlinCode: `suspend fun loadProfile(id: Long): Profile {
    val user = userApi.load(id)      // 挂起点 1
    val badges = badgeApi.load(id)   // 挂起点 2
    return Profile(user, badges)
}

// 概念性签名：
// fun loadProfile(id: Long, continuation: Continuation<Profile>): Any?`,
        note: "不要在业务代码里直接依赖编译器生成的 Continuation 签名；它用于建立心智模型和排查反编译结果。",
      },
      {
        id: "state-machine",
        eyebrow: "03 · 状态机",
        title: "局部变量和下一步位置会跨挂起点保存",
        paragraphs: [
          "编译器把函数切成若干状态，用 label 记录恢复后从哪里继续，并把挂起点后还要使用的局部变量保存到续体对象。恢复时不是从函数开头重跑，而是跳到对应状态。",
          "try/finally、异常和返回值也会被纳入状态机。大量短命协程并非零成本，但通常远轻于同等数量线程；性能判断应关注任务粒度、分配和调度，而不是把协程理解成魔法线程。",
        ],
        kotlinCode: `// 概念化状态机，不是实际源码
when (continuation.label) {
    0 -> {
        continuation.label = 1
        userApi.load(id, continuation)
    }
    1 -> {
        val user = continuation.savedUser
        continuation.label = 2
        badgeApi.load(id, continuation)
    }
    2 -> Profile(continuation.savedUser, resumedBadges)
}`,
      },
      {
        id: "main-safety",
        eyebrow: "04 · Android 主线程安全",
        title: "调用方应能放心从 Main 调用挂起 API",
        paragraphs: [
          "Android ViewModel 通常从 Main 启动协程。Repository 的 suspend API 应做到 main-safe：如果内部必须执行阻塞文件或旧式网络调用，由实现使用 withContext(Dispatchers.IO) 切换，而不是要求每个调用方记住线程规则。",
          "现代挂起式网络 API 往往自身异步，不需要额外包一层 IO；Room 的 suspend 查询也由库安排执行。是否切换要看底层操作是否阻塞，不能机械地给所有 suspend 函数加 withContext(IO)。",
        ],
        kotlinCode: `class FileUserStore(
    private val io: CoroutineDispatcher = Dispatchers.IO,
) {
    suspend fun read(id: Long): User = withContext(io) {
        fileFor(id).inputStream().use(::decodeUser)
    }
}

viewModelScope.launch {
    val user = store.read(id) // Main 可安全调用
    _uiState.value = user.toUiState()
}`,
      },
    ],
    exercise: {
      title: "画出一个挂起函数的三段状态",
      prompt: "函数先读取缓存，再请求网络，最后保存数据库。标出每个挂起点、需要跨点保存的局部变量，以及恢复后执行位置；同时指出哪些步骤可能需要 IO 调度器。",
      hint: "把函数按挂起调用切段；只有挂起后仍被使用的值需要保存。阻塞文件 API 需要 IO，真正异步的挂起网络调用通常不需要额外切换。",
    },
  },

  "coroutine-context": {
    sections: [
      {
        id: "scope-context",
        eyebrow: "01 · Scope 与 Context",
        title: "Scope 提供生命周期边界，Context 携带执行规则",
        paragraphs: [
          "CoroutineScope 主要持有 coroutineContext；Context 是 Job、Dispatcher、CoroutineName、异常处理器等元素的集合。launch 会继承作用域上下文，并用调用处传入元素覆盖同 key 的元素。",
          "Scope 不只是方便调用 launch 的对象，它应对应真实拥有者的生命周期。创建 CoroutineScope(SupervisorJob() + dispatcher) 后，拥有者必须在结束时 cancel，否则子协程会继续持有资源。",
        ],
        kotlinCode: `class SyncManager(
    dispatcher: CoroutineDispatcher,
) : Closeable {
    private val scope = CoroutineScope(
        SupervisorJob() + dispatcher + CoroutineName("sync")
    )

    fun start() = scope.launch { syncLoop() }

    override fun close() = scope.cancel()
}`,
      },
      {
        id: "job-tree",
        eyebrow: "02 · Job",
        title: "Job 把协程组织成可等待、可取消的父子树",
        paragraphs: [
          "launch 返回 Job，async 返回 Deferred<T>，后者在 Job 基础上增加 await 结果。默认情况下，父协程会等待所有子协程完成；取消父会递归取消子，普通子协程失败也会取消父及兄弟。",
          "把一个新的独立 Job 直接塞进子协程 context 会切断原父子关系，常导致泄漏。若只想给任务命名或切换调度器，覆盖对应元素即可；监督需求使用 supervisorScope 或 SupervisorJob。",
        ],
        kotlinCode: `val parent = viewModelScope.launch(CoroutineName("profile")) {
    val avatar = launch { cacheAvatar() }
    val details = async { repository.loadDetails() }
    render(details.await())
    avatar.join()
}

parent.cancel() // 子任务一起收到取消`,
      },
      {
        id: "dispatchers",
        eyebrow: "03 · Dispatcher",
        title: "按阻塞特征和线程约束选择调度器",
        paragraphs: [
          "Dispatchers.Main 用于 Android UI 与生命周期交互；Default 面向 CPU 密集计算；IO 面向阻塞 I/O，并通过弹性线程池容纳等待。Unconfined 不保证线程，通常只在特定底层实现或测试场景使用。",
          "切得越多不一定越快。withContext 有调度成本，应把一段完整的阻塞或计算工作放入合适上下文，而不是每行切一次。通过构造函数注入 Dispatcher 能让测试替换为 TestDispatcher。",
        ],
        bullets: [
          "Main：更新 View、LiveData 与主线程限定 API",
          "Default：排序、解析、图像或复杂纯计算",
          "IO：阻塞文件、JDBC、旧式同步网络调用",
          "注入调度器：测试可控，线程契约可见",
        ],
      },
      {
        id: "builders",
        eyebrow: "04 · 构建器与切换",
        title: "launch 做任务，async 产结果，withContext 切上下文并返回值",
        paragraphs: [
          "launch 返回 Job，适合结果通过状态、副作用或后续事件体现的任务。async 返回 Deferred，只有确实需要与其他工作并发并 await 结果时使用；顺序代码不要为了“异步”包 async。",
          "withContext 会挂起当前协程，执行代码块并直接返回结果，适合主线程安全封装。runBlocking 会阻塞当前线程直到子协程结束，Android 生产代码几乎不应使用，它主要服务 main 函数和少数测试边界。",
        ],
        code: {
          title: "并发与线程切换",
          java: `executor.submit(() -> {
    User user = api.load();
    mainHandler.post(() -> render(user));
});`,
          kotlin: `viewModelScope.launch {
    val parsed = withContext(defaultDispatcher) {
        parser.parse(rawPayload)
    }
    _uiState.value = UiState.Content(parsed)
}`,
        },
      },
    ],
    exercise: {
      title: "为四类工作选择上下文",
      prompt: "分别为更新 TextView、同步读取大文件、计算 10 万条数据排名、调用 Retrofit suspend API 选择调度方式，并解释是否由调用方切换。",
      hint: "UI 用 Main，阻塞文件用 IO，CPU 排名用 Default；真正异步的 Retrofit suspend 调用通常直接调用，让 Repository 保证整体 main-safe。",
    },
  },

  "structured-concurrency": {
    sections: [
      {
        id: "structure",
        eyebrow: "01 · 结构化并发",
        title: "并发任务必须属于一个可见的生命周期",
        paragraphs: [
          "结构化并发要求新协程成为某个作用域的子任务，让调用者可以等待完成、传播取消并集中处理失败。函数返回时，内部启动的工作不应悄悄游离在外。",
          "GlobalScope 没有业务所有者，页面销毁、请求替换或测试结束都无法自然取消。长期应用级任务也应放入由 Application 或专门组件拥有并能关闭的 scope。",
        ],
        code: {
          title: "让工作跟随 ViewModel",
          java: `executor.execute(() -> repository.refresh());
// 页面结束后任务仍可能继续，调用方没有 Job`,
          kotlin: `fun refresh() {
    viewModelScope.launch {
        repository.refresh()
    }
} // onCleared 时自动取消`,
        },
      },
      {
        id: "parallel-composition",
        eyebrow: "02 · 并发组合",
        title: "在 coroutineScope 中先启动，再统一等待",
        paragraphs: [
          "coroutineScope 创建子作用域并挂起到所有子任务完成，但不会阻塞线程。多个互不依赖的请求可以 async 后 await；若先 await 第一个再创建第二个，仍然是顺序执行。",
          "一个子任务失败会取消作用域中的其他子任务，并把异常抛给调用者。这正适合“两个结果缺一不可”的组合，因为系统不会浪费资源继续一个已无意义的请求。",
        ],
        kotlinCode: `suspend fun loadDashboard(): Dashboard = coroutineScope {
    val profile = async { userApi.profile() }
    val messages = async { messageApi.unread() }

    Dashboard(
        profile = profile.await(),
        unread = messages.await(),
    )
}`,
      },
      {
        id: "supervision",
        eyebrow: "03 · 监督关系",
        title: "supervisorScope 让兄弟失败彼此隔离",
        paragraphs: [
          "supervisorScope 中某个子协程失败不会自动取消其他子协程，适合首页多个独立卡片、可选预取等“部分失败仍有价值”的场景。它不会吞掉异常：每个 launch 仍需处理自己的失败，async 的失败仍在 await 时抛出。",
          "SupervisorJob 适合长期 Scope 的顶层监督；supervisorScope 适合一个挂起函数内部的临时结构。不要为了避免崩溃把所有作用域都改成监督模式，那会掩盖本应整体失败的不一致状态。",
        ],
        kotlinCode: `suspend fun refreshWidgets() = supervisorScope {
    launch {
        runCatching { weather.refresh() }
            .onFailure(logger::warn)
    }
    launch {
        runCatching { news.refresh() }
            .onFailure(logger::warn)
    }
}`,
      },
      {
        id: "android-scopes",
        eyebrow: "04 · Android Scope",
        title: "选择与工作真正寿命一致的作用域",
        paragraphs: [
          "viewModelScope 适合页面业务与跨配置变化状态；lifecycleScope 适合与 LifecycleOwner 同寿命的 UI 工作；repeatOnLifecycle 用于只在可见状态收集流。需要应用退出后仍保证执行的持久任务，应使用 WorkManager，而不是无限延长协程 Scope。",
          "Repository 若只是提供挂起 API，通常不应自行 launch，而让调用者决定生命周期。只有缓存预热、进程级同步等明确由 Repository 拥有的工作，才注入外部 Scope，并在架构上写清所有权。",
        ],
        kotlinCode: `class UserRepository(
    private val appScope: CoroutineScope,
    private val io: CoroutineDispatcher,
) {
    fun warmCache() {
        appScope.launch(io) { cache.preload() }
    }

    suspend fun load(id: Long): User = api.load(id)
}`,
      },
    ],
    exercise: {
      title: "并发加载一个可部分降级的首页",
      prompt: "用户信息是必需数据，推荐与公告可以独立失败。设计作用域结构：用户失败时整体失败，推荐失败不影响公告，并说明每个异常在哪里处理。",
      hint: "外层 coroutineScope 加载必需数据；可选区域放入 supervisorScope，每个子任务用 runCatching 或 try/catch 转换成明确的局部状态。",
    },
  },

  "cancellation-and-errors": {
    sections: [
      {
        id: "cooperative-cancellation",
        eyebrow: "01 · 协作式取消",
        title: "cancel 发出请求，协程要到可取消点才真正停下",
        paragraphs: [
          "大多数 kotlinx.coroutines 挂起函数会检查 Job 状态并抛 CancellationException，所以 delay、receive、Flow collect 等能及时响应取消。纯 CPU 循环若没有挂起点，就需要定期调用 ensureActive 或 yield。",
          "取消不是强杀线程。阻塞库是否能被中断取决于它自身；包装旧 API 时应使用可取消适配、关闭底层调用，或至少把阻塞工作限制在 IO。",
        ],
        kotlinCode: `suspend fun hashAll(items: List<ByteArray>): List<Hash> =
    withContext(Dispatchers.Default) {
        items.map { bytes ->
            ensureActive()
            sha256(bytes)
        }
    }`,
        note: "不要用 catch (e: Exception) 后直接忽略；CancellationException 也是异常。若必须捕获宽类型，要重新抛出取消。",
      },
      {
        id: "timeout-cleanup",
        eyebrow: "02 · 超时与清理",
        title: "finally 在取消时仍会执行，但里面默认也处于已取消状态",
        paragraphs: [
          "withTimeout 超时会取消代码块并抛 TimeoutCancellationException；withTimeoutOrNull 则返回 null。选择哪一个取决于超时是异常还是普通分支。超时只能约束可取消工作，无法保证不可中断的阻塞调用立刻停止。",
          "use 或 try/finally 用于释放文件、锁和注册。finally 中普通非挂起清理可直接执行；若清理本身必须挂起，可用 withContext(NonCancellable) 包住最小必要范围，避免把大量新工作变成不可取消。",
        ],
        kotlinCode: `val result = withTimeoutOrNull(3_000) {
    repository.refresh()
} ?: return RefreshResult.Timeout

try {
    session.open()
    session.run()
} finally {
    withContext(NonCancellable) {
        session.closeSuspending()
    }
}`,
      },
      {
        id: "exception-propagation",
        eyebrow: "03 · 异常传播",
        title: "launch 立即传播失败，async 在 await 时交付失败",
        paragraphs: [
          "根作用域的 launch 异常类似未捕获异常，会沿父链传播；async 把异常保存在 Deferred 中，在 await 时重新抛出。但作为普通父子结构中的子协程时，async 失败仍会取消父协程，不能靠“不 await”隐藏。",
          "try/catch 应包住真正抛异常的挂起调用或 await，而不是只包 launch 外壳。业务层最好把可预期失败转换为 Result 或领域错误；编程错误与不变量破坏不应一律伪装成“网络失败”。",
        ],
        kotlinCode: `viewModelScope.launch {
    _uiState.value = try {
        UiState.Content(repository.load())
    } catch (cancelled: CancellationException) {
        throw cancelled
    } catch (error: IOException) {
        UiState.Failed("网络不可用")
    }
}`,
      },
      {
        id: "exception-handler",
        eyebrow: "04 · 异常处理器",
        title: "CoroutineExceptionHandler 是根协程最后防线，不是通用 try/catch",
        paragraphs: [
          "CoroutineExceptionHandler 只处理未被消费的根 launch 异常；对子协程，异常先交给父；对 async，异常由 await 观察。它适合记录和兜底上报，不适合恢复每个业务请求。",
          "Android ViewModel 常在 launch 内就近把可恢复错误映射成 UI State。需要兄弟任务隔离时配合监督结构；只添加 Handler 而不改变父子失败关系，其他子任务仍可能被取消。",
        ],
        kotlinCode: `private val handler = CoroutineExceptionHandler { context, error ->
    crashReporter.record(
        coroutineName = context[CoroutineName]?.name,
        error = error,
    )
}

private val appScope = CoroutineScope(
    SupervisorJob() + Dispatchers.Default + handler
)`,
      },
    ],
    exercise: {
      title: "修复一个无法取消的搜索",
      prompt: "现有搜索在 Default 中遍历百万条记录，并用 catch(Exception) 返回空列表。让新查询能及时取消旧查询，同时不把取消误报成空结果。",
      hint: "循环中调用 ensureActive；对 CancellationException 重新抛出，只把预期业务异常转换成错误状态。Flow 章节还会用 flatMapLatest 自动取消旧搜索。",
    },
  },

  "channels-and-testing": {
    sections: [
      {
        id: "channel-basics",
        eyebrow: "01 · Channel",
        title: "Channel 是协程之间传递元素的并发队列",
        paragraphs: [
          "send 把值交给接收者，receive 取值；无缓冲 Channel 会让发送与接收会合。缓冲 Channel 允许发送方暂时领先，容量耗尽后再挂起，从而形成背压。",
          "Channel 是热的：创建后独立存在，元素通常由一个接收者消费，不会像冷 Flow 那样为每个 collect 重新执行。生产者完成后应 close，接收方可用 for 循环直到通道关闭。",
        ],
        kotlinCode: `val jobs = Channel<SyncJob>(capacity = Channel.BUFFERED)

val worker = scope.launch {
    for (job in jobs) {
        sync(job)
    }
}

jobs.send(SyncJob(userId))
jobs.close()
worker.join()`,
      },
      {
        id: "buffer-select",
        eyebrow: "02 · 缓冲与 select",
        title: "容量和溢出策略决定压力落在哪里",
        paragraphs: [
          "RENDEZVOUS 强制发送接收同步，BUFFERED 使用默认容量，CONFLATED 只保留最新值。自定义容量可配合 BufferOverflow.SUSPEND、DROP_OLDEST 或 DROP_LATEST；只有丢失可接受的数据才应选择丢弃。",
          "select 可以等待多个挂起操作中最先就绪的一个，例如结果或超时信号。它适合底层协调，但业务流组合通常优先 Flow 操作符，代码意图更直观。",
        ],
        kotlinCode: `val result = select<WorkerResult> {
    primary.onReceive { WorkerResult.Primary(it) }
    fallback.onReceive { WorkerResult.Fallback(it) }
    onTimeout(2_000) { WorkerResult.TimedOut }
}`,
        note: "无限容量把背压变成内存增长。若生产速度长期高于消费速度，必须限流、合并、丢弃或扩展消费者，而不是只增大容量。",
      },
      {
        id: "shared-state",
        eyebrow: "03 · 共享可变状态",
        title: "协程轻量，但 count++ 仍不是原子操作",
        paragraphs: [
          "多个协程可能并行运行在线程池上，共享变量会遇到与线程相同的数据竞争。简单计数可用 AtomicInteger；多个相关字段需要原子更新时可用 Mutex.withLock；也可以把所有状态修改限制到单一协程。",
          "Mutex 是挂起锁，不会像 synchronized 那样阻塞等待线程，但临界区仍应短小且避免不可控 I/O。StateFlow.update 使用原子方式根据旧值计算新值，适合不可变状态快照。",
        ],
        kotlinCode: `private val mutex = Mutex()
private var cache: Map<Long, User> = emptyMap()

suspend fun put(user: User) {
    mutex.withLock {
        cache = cache + (user.id to user)
    }
}

private val _state = MutableStateFlow(UiState())
fun select(id: Long) = _state.update { it.copy(selectedId = id) }`,
      },
      {
        id: "coroutine-testing",
        eyebrow: "04 · 虚拟时间测试",
        title: "runTest 让 delay 可控，并等待测试作用域内的子协程",
        paragraphs: [
          "kotlinx-coroutines-test 的 runTest 使用测试调度器，delay 不必真的等待。advanceTimeBy 推进时间，runCurrent 执行当前时刻任务，advanceUntilIdle 运行到没有待处理任务。测试代码应注入 Dispatcher 或 Scope，避免硬编码 Dispatchers.IO。",
          "StandardTestDispatcher 默认不会立刻执行新协程，适合精确控制；UnconfinedTestDispatcher 更接近立即进入协程体，但调度顺序保证更少。多个 TestDispatcher 应共享 runTest 提供的 testScheduler。",
        ],
        kotlinCode: `@Test
fun refresh_emits_content_after_delay() = runTest {
    val repository = FakeRepository(delayMs = 1_000)
    val viewModel = UserViewModel(repository, StandardTestDispatcher(testScheduler))

    viewModel.refresh()
    assertEquals(UiState.Loading, viewModel.uiState.value)

    advanceUntilIdle()
    assertTrue(viewModel.uiState.value is UiState.Content)
}`,
      },
    ],
    exercise: {
      title: "测试带防抖的保存动作",
      prompt: "实现输入后延迟 500ms 保存；新输入到来时取消旧任务。用 runTest 证明 499ms 时未保存、500ms 时只保存最后一次输入。",
      hint: "保存 Job 保存在类中，新输入先 cancel 再 launch；测试中使用 advanceTimeBy、runCurrent，并注入共享 testScheduler 的调度器。",
    },
  },

  "flow-basics": {
    sections: [
      {
        id: "cold-flow",
        eyebrow: "01 · 冷流",
        title: "普通 Flow 在每次 collect 时重新执行上游",
        paragraphs: [
          "flow { } 只描述异步数据管道，创建时不会运行。每个收集者调用 collect 后，上游代码从头执行，因此两个收集者可能触发两次网络请求或数据库监听。需要共享一次上游时，再使用 shareIn/stateIn 转成热流。",
          "Flow 按顺序发射多个值，挂起函数通常返回一个值。选择 Flow 的前提是数据会随时间变化或需要操作符组合；一次性请求没必要为追求统一而强行包装。",
        ],
        code: {
          title: "从回调思维转向数据流",
          java: `repository.observeUsers(new Callback<List<User>>() {
    public void onChanged(List<User> users) {
        render(users);
    }
});`,
          kotlin: `val users: Flow<List<User>> = repository.observeUsers()

lifecycleScope.launch {
    users.collect { value -> render(value) }
}`,
        },
      },
      {
        id: "builders",
        eyebrow: "02 · 构建与收集",
        title: "emit 受挂起和上下文约束，collect 是终止操作",
        paragraphs: [
          "flow 构建器中的 emit 按顺序把值交给下游；下游慢时，上游默认一起等待，天然形成背压。flowOf、asFlow 适合已有值，callbackFlow 用于安全桥接多次回调。",
          "Flow 的上下文保持原则要求 flow { } 不从任意新协程直接 emit。需要改变上游执行上下文用 flowOn；需要并发回调使用 callbackFlow 与 trySend，并在 awaitClose 中解除监听。",
        ],
        kotlinCode: `fun observeTicker(): Flow<Int> = flow {
    var value = 0
    while (currentCoroutineContext().isActive) {
        emit(value++)
        delay(1_000)
    }
}

observeTicker().collect { tick -> println(tick) }`,
      },
      {
        id: "operators",
        eyebrow: "03 · 中间操作符",
        title: "操作符在收集链上按需执行，并保留取消能力",
        paragraphs: [
          "map 转换值，filter 丢弃值，onEach 执行附加动作，distinctUntilChanged 抑制相同连续值，debounce 等待输入稳定。中间操作符仍返回 Flow，不会在声明时启动。",
          "first、single、toList、collect 等终止操作才开始执行。first 获得首值后会取消上游；launchIn(scope) 相当于在指定 Scope 中启动收集，并返回 Job。",
        ],
        kotlinCode: `val results: Flow<List<UserRow>> = queryFlow
    .map(String::trim)
    .debounce(300)
    .distinctUntilChanged()
    .filter { it.length >= 2 }
    .map { query -> repository.search(query) }
    .map { users -> users.map(::toRow) }`,
      },
      {
        id: "combining",
        eyebrow: "04 · 组合与展平",
        title: "combine 看最新组合，zip 一一配对，flatMapLatest 切换上游",
        paragraphs: [
          "combine 在任一上游产生新值时，用各自最新值计算；zip 等待两边各一个值并成对消费，任一流结束后结束。页面筛选条件通常用 combine，严格配对的数据序列才用 zip。",
          "flatMapConcat 顺序收集内部流，flatMapMerge 并发合并，flatMapLatest 在新值到来时取消旧内部流。搜索建议用 flatMapLatest，使旧查询不会晚到覆盖新结果。",
        ],
        kotlinCode: `val uiState = combine(
    repository.observeUsers(),
    selectedFilter,
) { users, filter ->
    users.filter(filter::accepts).map(::toRow)
}

val searchResults = query
    .debounce(300)
    .flatMapLatest(repository::searchFlow)`,
      },
    ],
    exercise: {
      title: "实现可取消的搜索 Flow",
      prompt: "从 query: Flow<String> 出发，去空格、过滤少于 2 字符、300ms 防抖、忽略连续相同查询，再调用 repository.searchFlow；新查询必须取消旧搜索。",
      hint: "操作符顺序为 map、filter、debounce、distinctUntilChanged、flatMapLatest；空查询是否发射空列表要按产品需求单独建模。",
    },
  },

  "flow-context": {
    sections: [
      {
        id: "sequential-model",
        eyebrow: "01 · 顺序模型",
        title: "默认情况下，上游与下游在同一协程顺序协作",
        paragraphs: [
          "一个 emit 要等下游操作与 collect 处理完成后才继续，因此慢收集者会自然减慢生产者。这个顺序模型让普通局部状态无需额外锁，也让异常和取消沿同一调用链传播。",
          "若上游和下游都耗时，默认总耗时接近两者相加。buffer 会引入通道，让上游与下游并行推进；它优化吞吐但改变内存占用与时间关系，应基于业务选择。",
        ],
        kotlinCode: `flow {
    repeat(3) { value ->
        delay(100)   // 生产耗时
        emit(value)
    }
}.collect { value ->
    delay(200)       // 消费耗时
    render(value)
}`, 
      },
      {
        id: "flow-on",
        eyebrow: "02 · flowOn",
        title: "flowOn 只改变它上方的上游上下文",
        paragraphs: [
          "Flow 遵循上下文保持：collect 在哪个 Context，未切换部分就在哪执行。flowOn(dispatcher) 把它上方的生产与操作符移动到指定上下文，并在边界处建立并发通道；下方与收集者保持原上下文。",
          "多个 flowOn 只影响各自上方相邻区域。catch 的位置也会决定能捕获哪些异常，因此读 Flow 链时应从 collect 向上标出上下文与错误边界。",
        ],
        kotlinCode: `repository.observeRaw()
    .map(parser::parse)                // Default
    .flowOn(defaultDispatcher)
    .map(uiMapper::toRows)             // Main（收集者上下文）
    .catch { emit(emptyList()) }
    .collect(binding::render)`,
        note: "不要在 flow { } 里用 withContext 后 emit。耗时上游使用 flowOn；若只有某个转换需要切换，也可把它封装为 main-safe suspend 函数。",
      },
      {
        id: "backpressure",
        eyebrow: "03 · 背压策略",
        title: "buffer 保留每个值，conflate 与 collectLatest 接受丢弃工作",
        paragraphs: [
          "buffer 允许生产和消费重叠，但仍按顺序交付每个元素。conflate 在消费慢时只保留最新尚未处理的值，适合进度、位置等中间值不重要的状态。",
          "collectLatest 收到新值时取消前一个收集代码块，适合可取消的重渲染或搜索；它丢的是旧值对应的处理工作。选择前先问：每个值必须处理，还是只关心最新状态？",
        ],
        kotlinCode: `downloadProgress
    .conflate()
    .collect { latest -> renderProgress(latest) }

queryResults.collectLatest { rows ->
    adapter.submitRowsWithAnimation(rows) // 新列表到来时取消旧动画准备
}`,
      },
      {
        id: "errors-retry",
        eyebrow: "04 · 异常与重试",
        title: "catch 只看上游异常，透明地重新发射替代值",
        paragraphs: [
          "catch 捕获它上方操作符的异常，不捕获下游 collect 代码抛出的异常，也默认不处理取消。可以 emit 缓存或错误状态，也可以重新 throw。onCompletion 能观察正常、失败或取消完成，但不等同于 catch。",
          "retry/retryWhen 在满足条件时重新订阅上游。应限制次数、只重试瞬时错误并加入退避；认证失败、解析错误等确定性问题盲目重试只会浪费资源。",
        ],
        kotlinCode: `repository.observeFeed()
    .retryWhen { cause, attempt ->
        val retryable = cause is IOException && attempt < 3
        if (retryable) delay(500L * (attempt + 1))
        retryable
    }
    .map<Feed, FeedUiState>(FeedUiState::Content)
    .catch { error -> emit(FeedUiState.Failed(error.toMessage())) }
    .onCompletion { cause -> logger.debug("done: $cause") }`,
      },
    ],
    exercise: {
      title: "为传感器数据选择背压策略",
      prompt: "传感器每 10ms 发一次坐标，UI 每 50ms 才能绘制；记录文件又要求一个值不丢。分别设计 UI 与记录两条 Flow 链，说明 buffer/conflate/collectLatest 的选择。",
      hint: "UI 通常只关心最新位置，可 conflate 或 collectLatest；记录链要求完整交付，应使用有界 buffer 并让生产端感受到背压。",
    },
  },

  "hot-flows": {
    sections: [
      {
        id: "state-flow",
        eyebrow: "01 · StateFlow",
        title: "StateFlow 始终有当前值，并向新订阅者立即发送",
        paragraphs: [
          "MutableStateFlow 创建时必须提供 initialValue，value 可同步读取。更新会基于 equals 合并连续相同状态，慢收集者只保证看到最新值，因此它适合可恢复、可覆盖的状态，而不是每一次事件。",
          "对 data class 状态使用 update 原子地基于旧值生成新值，并向外只暴露 asStateFlow。不要就地修改状态内部 MutableList 后再塞回同一对象，否则 equals 与观察者都可能看不到变化。",
        ],
        kotlinCode: `private val _uiState = MutableStateFlow(SearchUiState())
val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

fun setQuery(query: String) {
    _uiState.update { old -> old.copy(query = query) }
}`,
      },
      {
        id: "shared-flow",
        eyebrow: "02 · SharedFlow",
        title: "SharedFlow 广播值，并由 replay 与缓冲定义订阅体验",
        paragraphs: [
          "MutableSharedFlow 没有必需初始值，可以向所有活跃收集者广播。replay 决定新收集者先收到多少个历史值；extraBufferCapacity 和 onBufferOverflow 决定慢订阅者造成压力时的行为。",
          "replay=0 的事件在没有订阅者时可能直接丢失；replay=1 又可能在配置变化后重复消费导航。一次性事件没有万能容器，应先判断它能否提升为状态，例如“显示确认弹窗”其实可成为可恢复 UI 状态。",
        ],
        kotlinCode: `private val _events = MutableSharedFlow<UiEvent>(
    replay = 0,
    extraBufferCapacity = 1,
    onBufferOverflow = BufferOverflow.DROP_OLDEST,
)
val events: SharedFlow<UiEvent> = _events.asSharedFlow()

fun reportSaved() {
    _events.tryEmit(UiEvent.ShowMessage("已保存"))
}`,
      },
      {
        id: "state-in-share-in",
        eyebrow: "03 · 共享冷流",
        title: "stateIn 与 shareIn 在指定 Scope 中运行一个上游实例",
        paragraphs: [
          "stateIn 把冷流转换为有当前值的 StateFlow；shareIn 转为可配置 replay 的 SharedFlow。二者都需要 Scope 和 SharingStarted，意味着上游寿命由这个 Scope 与启动策略共同决定。",
          "SharingStarted.WhileSubscribed(stopTimeoutMillis) 常用于 ViewModel：有订阅者时运行，短暂配置变化期间不立即停，长时间后台则释放上游。Eagerly 立即启动，Lazily 在首个订阅者出现后启动并持续到 Scope 结束。",
        ],
        kotlinCode: `val uiState: StateFlow<FeedUiState> = repository.observeFeed()
    .map<Feed, FeedUiState>(FeedUiState::Content)
    .catch { emit(FeedUiState.Failed) }
    .stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = FeedUiState.Loading,
    )`,
      },
      {
        id: "state-or-event",
        eyebrow: "04 · 选择模型",
        title: "能被新界面恢复的是状态，只消费一次的是事件",
        paragraphs: [
          "页面旋转后仍应显示的内容、加载阶段、选中项和待确认弹窗属于状态，优先 StateFlow。瞬时日志、遥测或“播放一次震动”更接近事件，可用 SharedFlow/Channel，但要接受无收集者、重复与缓冲策略带来的语义。",
          "Channel 是点对点队列，每个元素通常只被一个接收者拿走；SharedFlow 是广播，所有活跃收集者都能看到。若事件代表业务事实，最可靠做法往往是持久化事实，再由 UI 根据状态决定呈现，而不是依赖内存瞬时信号。",
        ],
        bullets: [
          "页面内容与选择：StateFlow",
          "多观察者广播通知：SharedFlow",
          "单消费者工作队列：Channel",
          "不可丢业务事实：持久化状态/记录",
        ],
      },
    ],
    exercise: {
      title: "给六种数据选择热流模型",
      prompt: "为登录状态、搜索结果、Toast、导航到详情、下载任务队列、全局主题选择 StateFlow、SharedFlow、Channel 或持久化状态，并解释旋转与进程重建后的预期。",
      hint: "先问新订阅者是否需要当前值、多个订阅者是否都要收到、是否允许丢失；不能丢的数据不要只留在内存流里。",
    },
  },

  "flow-lifecycle": {
    sections: [
      {
        id: "repeat-on-lifecycle",
        eyebrow: "01 · 生命周期收集",
        title: "repeatOnLifecycle 在可见时启动，离开时取消收集",
        paragraphs: [
          "在 Fragment 中使用 viewLifecycleOwner.lifecycleScope，并在 repeatOnLifecycle(STARTED) 内 collect。进入 STARTED 会启动子协程，降到更低状态会取消，下一次进入再重新收集；外层 launch 直到视图生命周期销毁才结束。",
          "直接 lifecycleScope.launch { flow.collect } 会在 STOPPED 后继续收集并可能更新不可见 UI。Fragment 若错误使用自身 lifecycleOwner，还可能访问已经销毁的 View。",
        ],
        kotlinCode: `override fun onViewCreated(view: View, state: Bundle?) {
    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            viewModel.uiState.collect { uiState ->
                binding.render(uiState)
            }
        }
    }
}`,
      },
      {
        id: "parallel-collection",
        eyebrow: "02 · 多条 Flow",
        title: "repeatOnLifecycle 内顺序 collect 会让第二条永远无法开始",
        paragraphs: [
          "collect 通常持续到取消，因此两次 collect 不能直接顺序写。需要同时收集多条流时，在 repeatOnLifecycle 块内为每条流 launch 子协程；生命周期离开 STARTED 时，这些子协程会一起取消。",
          "flowWithLifecycle 适合把单条 Flow 变成生命周期感知流，再继续操作；多流场景 repeatOnLifecycle 的结构更清楚。Compose UI 使用 collectAsStateWithLifecycle 将 Flow 转成生命周期安全的 State。",
        ],
        kotlinCode: `viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        launch { viewModel.uiState.collect(binding::render) }
        launch { viewModel.events.collect(::handleEvent) }
    }
}`,
      },
      {
        id: "viewmodel-state",
        eyebrow: "03 · ViewModel 状态链",
        title: "输入在 ViewModel 合流，UI 只负责渲染与上报意图",
        paragraphs: [
          "ViewModel 把 SavedStateHandle、Repository Flow 与用户筛选组合成 StateFlow。UI 调用 onQueryChanged、retry 等明确事件函数，不直接修改 MutableStateFlow，从而保持单向数据流。",
          "SavedStateHandle 适合保存体积小、可序列化、进程重建后需要恢复的输入，例如查询词与 id；大列表仍从数据库或网络重建。getStateFlow 可把保存值直接接入 combine。",
        ],
        kotlinCode: `private val query = savedStateHandle.getStateFlow("query", "")

val uiState = combine(
    repository.observeUsers(),
    query,
) { users, text ->
    SearchUiState.Content(users.filter { text in it.name })
}.stateIn(
    viewModelScope,
    SharingStarted.WhileSubscribed(5_000),
    SearchUiState.Loading,
)

fun onQueryChanged(value: String) {
    savedStateHandle["query"] = value
}`,
      },
      {
        id: "events",
        eyebrow: "04 · 一次性效果",
        title: "先把可恢复需求建模为状态，再处理真正瞬时效果",
        paragraphs: [
          "导航、Snackbar 等效果在配置变化边界容易丢失或重复。若效果必须保证，可把 pendingAction 放进状态，并让 UI 处理后回报 consumed；若允许页面不可见时丢失，replay=0 的 SharedFlow 更简单。",
          "收集事件同样要进入生命周期安全区域。事件处理应幂等，导航前检查当前 destination，重要操作由数据层记录完成事实。不要用 Event 包装器把复杂生命周期语义藏起来。",
        ],
        kotlinCode: `sealed interface UiEffect {
    data class ShowMessage(val text: String) : UiEffect
    data class OpenUser(val id: Long) : UiEffect
}

private val _effects = MutableSharedFlow<UiEffect>(extraBufferCapacity = 1)
val effects = _effects.asSharedFlow()

fun onUserClicked(id: Long) {
    _effects.tryEmit(UiEffect.OpenUser(id))
}`,
      },
    ],
    exercise: {
      title: "修复 Fragment 的三条 Flow 收集",
      prompt: "现有代码在 lifecycleScope 中顺序 collect 状态、事件和加载进度，并在返回栈后重复导航。改成视图生命周期安全的并行收集，并给导航定义可接受的丢失/重复策略。",
      hint: "使用 viewLifecycleOwner.repeatOnLifecycle；每条 Flow 单独 launch。导航若不能丢，应提升为可确认状态，而不只是增加 replay。",
    },
  },
};
