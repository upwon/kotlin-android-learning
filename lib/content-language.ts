import type { CompleteChapterContent } from "./content-types";

export const languageContent: Record<string, CompleteChapterContent> = {
  classes: {
    sections: [
      {
        id: "constructors",
        eyebrow: "01 · 构造模型",
        title: "主构造函数先描述对象成立所需的数据",
        paragraphs: [
          "Kotlin 把最常用的构造参数放在类名后。参数前写 val 或 var，它才同时成为属性；不写时只是在初始化期间可用的参数。init 会按源码顺序与属性初始化器交错执行，因此不要把依赖尚未初始化属性的逻辑放得太早。",
          "次构造函数适合兼容框架或少数特殊入口，并且最终必须委托给主构造函数。业务类如果出现许多次构造函数，通常更适合默认参数、具名工厂函数或 Builder。",
        ],
        code: {
          title: "定义用户模型",
          java: `public final class User {
    private final long id;
    private final String name;

    public User(long id, String name) {
        this.id = id;
        this.name = name.trim();
    }
}`,
          kotlin: `class User(
    val id: Long,
    name: String,
) {
    val name = name.trim()

    init {
        require(id > 0) { "id 必须为正数" }
    }
}`,
        },
        note: "构造参数 name 没有 val/var，所以类外不能以 user.name 访问它；真正公开的是类体里的只读属性。",
      },
      {
        id: "inheritance",
        eyebrow: "02 · 继承与接口",
        title: "类和成员默认不可继承",
        paragraphs: [
          "Kotlin 的类与成员默认 final，只有明确标记 open 才能被覆盖。这个默认值减少脆弱基类问题：调用方不会在你没准备好时改变行为。覆盖成员必须写 override，编译器也会阻止意外同名。",
          "接口可以声明抽象成员和默认实现，但不能保存实例状态。Android 业务代码通常优先用接口描述能力、用组合注入实现；只有稳定的 is-a 关系才考虑继承。",
        ],
        kotlinCode: `interface UserSource {
    suspend fun load(id: Long): User
}

class CachedUserSource(
    private val remote: UserSource,
    private val cache: UserCache,
) : UserSource {
    override suspend fun load(id: Long): User =
        cache[id] ?: remote.load(id).also { cache[id] = it }
}`,
      },
      {
        id: "nested",
        eyebrow: "03 · 嵌套与可见性",
        title: "嵌套类默认不持有外部类",
        paragraphs: [
          "Kotlin 的嵌套类相当于 Java static nested class，不会隐式保存外部实例。只有写 inner 后才能通过 this@Outer 访问外部对象；在 Activity 或 Fragment 中滥用 inner 容易把页面生命周期意外延长。",
          "public、internal、protected、private 控制源码可见性。internal 表示同一编译模块可见，适合隐藏模块实现；它不是 JVM 字节码层面的安全边界，也不能替代真正的访问控制。",
        ],
        kotlinCode: `class SearchController {
    data class Query(val text: String) // 不持有 SearchController

    inner class Listener {
        fun clear() = this@SearchController.cancelPending()
    }

    private fun cancelPending() { /* 取消尚未完成的任务 */ }
}`,
      },
      {
        id: "android-class-design",
        eyebrow: "04 · Android 设计",
        title: "让依赖从构造函数进入，让生命周期从外部托管",
        paragraphs: [
          "Repository、UseCase、Mapper 等普通 Kotlin 类最适合构造注入：对象一创建就具备完整依赖，测试也能传入替身。Activity、Fragment 等由框架创建的类型则遵循框架入口，把业务依赖交给 ViewModel 或依赖注入容器。",
          "避免让领域类保存 Context。确实需要资源或系统服务时，优先注入窄接口；必须持有 Context 时使用 applicationContext，并明确它的生命周期。",
        ],
        kotlinCode: `class LoadProfile(
    private val repository: UserRepository,
    private val clock: Clock,
) {
    suspend operator fun invoke(id: Long): Profile =
        repository.load(id).toProfile(now = clock.now())
}`,
      },
    ],
    exercise: {
      title: "把可变 Java Bean 改成始终有效的 Kotlin 类",
      prompt: "设计 Account：id 必须大于 0，name 创建时去除首尾空格，外部只能读取两者。再定义 AccountSource 接口，由 FakeAccountSource 实现。",
      starter: `class Account {
    long id;
    String name;
}`,
      hint: "把必要数据放入主构造函数，用 val 暴露属性，在 init 中使用 require，并用构造函数注入 FakeAccountSource 所需数据。",
    },
  },

  properties: {
    sections: [
      {
        id: "property-model",
        eyebrow: "01 · 属性模型",
        title: "属性是一组访问契约，不等于一个字段",
        paragraphs: [
          "Kotlin 属性把 getter、setter 与可能存在的存储合并为一个语言概念。读取 user.name 会编译为访问器调用；只有属性确实需要存储值时，编译器才生成幕后字段。计算属性可以只有 getter，完全不占额外字段。",
          "自定义访问器中使用 field 指代当前属性的幕后字段。若在 setter 里再次写属性名，会递归调用自己。访问器可缩小可见性，因此常用 public get + private set 暴露只读视图。",
        ],
        code: {
          title: "受控更新属性",
          java: `private int retryCount;

public int getRetryCount() { return retryCount; }
private void setRetryCount(int value) {
    retryCount = Math.max(0, value);
}`,
          kotlin: `var retryCount: Int = 0
    private set(value) {
        field = value.coerceAtLeast(0)
    }

val canRetry: Boolean
    get() = retryCount < 3`,
        },
      },
      {
        id: "backing-property",
        eyebrow: "02 · 幕后属性",
        title: "公开稳定类型，内部保留可变实现",
        paragraphs: [
          "当公开类型与内部类型不同，单个 field 不够用，就使用幕后属性。经典例子是内部 MutableStateFlow、外部 StateFlow；调用方只能观察，状态修改集中在拥有者内部。",
          "集合也遵循同样原则：不要把 MutableList 直接暴露给 UI。可以公开 List 快照，或把变化建模为不可变状态。注意只读接口不保证对象在别处绝对不可变，只限制当前引用能做什么。",
        ],
        kotlinCode: `private val _uiState = MutableStateFlow(UiState())
val uiState: StateFlow<UiState> = _uiState.asStateFlow()

fun select(id: Long) {
    _uiState.update { it.copy(selectedId = id) }
}`,
        note: "private set 适合公开与内部使用同一种类型；幕后属性适合公开更窄的接口或需要在销毁时置空的生命周期资源。",
      },
      {
        id: "constants",
        eyebrow: "03 · 常量与 JVM",
        title: "const val 只用于编译期常量",
        paragraphs: [
          "const val 必须位于顶层、object 或 companion object，类型只能是基本类型或 String，并且初始化表达式要能在编译期确定。它会被调用处内联，适合注解参数、Intent key 等真正稳定的常量。",
          "普通 val 可以保存运行时计算结果，并通过 getter 暴露。公共库修改 const val 的值时，旧调用方可能仍保留编译进字节码的旧值，因此跨模块常量需要慎重版本管理。",
        ],
        kotlinCode: `const val EXTRA_USER_ID = "extra_user_id"

val cacheDirectory: File
    get() = appContext.cacheDir

object Endpoints {
    const val API_VERSION = "v2"
}`,
      },
      {
        id: "lifecycle-properties",
        eyebrow: "04 · Android 生命周期",
        title: "属性写法必须反映资源实际存活区间",
        paragraphs: [
          "Activity 的 binding 通常可以用 lazy，因为 Activity 销毁时整个实例一起释放。Fragment 的视图生命周期短于 Fragment 实例，binding 必须在 onDestroyView 清空，所以要用可空幕后属性。",
          "lateinit 适合框架或注入流程保证稍后赋值的非空引用；读取前未初始化会抛异常。不要用 lateinit 掩盖本来就可能缺失的业务数据，那应当使用 T? 或显式状态类型。",
        ],
        kotlinCode: `private var _binding: FragmentFeedBinding? = null
private val binding: FragmentFeedBinding
    get() = requireNotNull(_binding) { "仅在视图生命周期内访问 binding" }

override fun onDestroyView() {
    _binding = null
    super.onDestroyView()
}`,
      },
    ],
    exercise: {
      title: "为 ViewModel 设计只读状态",
      prompt: "创建 MutableStateFlow<Int> 保存未读数，只允许 ViewModel 内部修改；UI 只能获得 StateFlow<Int>。提供 markAllRead() 与 increment()。",
      hint: "使用 _unreadCount 幕后属性和 unreadCount = _unreadCount.asStateFlow()，更新时优先调用 update。",
    },
  },

  "data-modeling": {
    sections: [
      {
        id: "data-class",
        eyebrow: "01 · data class",
        title: "值对象的相等性来自主构造函数",
        paragraphs: [
          "data class 会依据主构造函数中的属性生成 equals、hashCode、toString、componentN 与 copy。类体内额外声明的属性不会参与这些能力，因此决定身份的数据应放在主构造函数里。",
          "copy 是浅复制：如果属性指向 MutableList，新旧对象仍共享同一个列表。UI State 最稳妥的做法是组合不可变值，让每次 copy 都产生可预测的新快照。",
        ],
        code: {
          title: "更新页面状态",
          java: `UiState next = new UiState(
    old.getItems(),
    false,
    old.getQuery()
);`,
          kotlin: `val next = old.copy(
    isLoading = false,
    items = old.items + newItem,
)`,
        },
        note: "解构声明依赖 componentN 的位置顺序。超过两三个字段时，直接按属性名读取通常更清晰，也更耐重构。",
      },
      {
        id: "enum-sealed",
        eyebrow: "02 · 有限集合",
        title: "enum 表示固定单例，sealed 表示固定类型族",
        paragraphs: [
          "enum 的每个值都是同一类型的单例，适合方向、排序方式等无需携带不同结构数据的集合。sealed class/interface 的每个分支可以有自己的字段和行为，适合加载、成功、失败等互斥业务状态。",
          "当编译器知道 sealed 类型的所有直接子类型时，when 可以不写 else，并在新增分支时提示所有遗漏处理点。这把“别忘了处理新状态”从评审约定变成编译约束。",
        ],
        kotlinCode: `sealed interface LoadState<out T> {
    data object Loading : LoadState<Nothing>
    data class Content<T>(val value: T) : LoadState<T>
    data class Error(val cause: Throwable) : LoadState<Nothing>
}

fun label(state: LoadState<User>) = when (state) {
    LoadState.Loading -> "加载中"
    is LoadState.Content -> state.value.name
    is LoadState.Error -> state.cause.message ?: "失败"
}`,
      },
      {
        id: "object-value-class",
        eyebrow: "03 · object 与 value class",
        title: "一个表达唯一实例，一个表达受约束的轻量值",
        paragraphs: [
          "object 声明在首次访问时创建唯一实例，适合无状态策略、比较器或真正的进程级单例。data object 还提供与 data class 对称的可读输出。不要把可变全局业务状态塞进 object，否则测试隔离和生命周期都会变差。",
          "@JvmInline value class 用一个底层值包装领域概念，例如 UserId 与 OrderId。编译器会尽量消除包装分配，但在泛型、可空、接口等场景仍可能装箱；它提供类型区分，不自动完成格式验证。",
        ],
        kotlinCode: `@JvmInline
value class UserId(val value: Long) {
    init { require(value > 0) }
}

data object LoggedOut

fun loadUser(id: UserId) { /* 不会误传 OrderId */ }`,
      },
      {
        id: "ui-state",
        eyebrow: "04 · Android 状态",
        title: "页面渲染应由一个可穷举状态驱动",
        paragraphs: [
          "多个独立 Boolean 很容易形成非法组合，例如 isLoading 与 hasError 同时为 true。密封类型把互斥阶段建模为不同分支；分支内再使用 data class 保存该阶段数据。",
          "若页面需要在旧内容上显示刷新指示器，可以使用单一 data class，把 content 与 isRefreshing 作为可同时存在的维度。选 sealed 还是 data class，关键看状态是互斥阶段还是正交属性。",
        ],
        kotlinCode: `sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data class Content(
        val user: UserUi,
        val isRefreshing: Boolean = false,
    ) : ProfileUiState
    data class Failed(val message: String) : ProfileUiState
}`,
      },
    ],
    exercise: {
      title: "消灭三个互相冲突的 Boolean",
      prompt: "把 isLoading、hasData、hasError 改成 SearchUiState，并为 Idle、Loading、Content(results)、Empty、Failed(message) 写出穷举 when。",
      hint: "使用 sealed interface；没有数据的分支可用 data object，需要数据的分支使用 data class。",
    },
  },

  lambdas: {
    sections: [
      {
        id: "function-types",
        eyebrow: "01 · 函数类型",
        title: "函数可以像对象一样保存、传递和调用",
        paragraphs: [
          "(User) -> String 表示接收 User、返回 String 的函数类型；() -> Unit 表示无参数回调。高阶函数接收函数或返回函数，使过滤、映射、重试策略与 UI 回调都能作为参数组合。",
          "Lambda 的参数类型通常从上下文推断。只有一个参数时可以用 it，但嵌套或语义不明显时应显式命名。调用函数值可以写 formatter(user)，也可以写 formatter.invoke(user)。",
        ],
        code: {
          title: "把策略作为参数",
          java: `interface UserFormatter {
    String format(User user);
}

String render(User user, UserFormatter formatter) {
    return formatter.format(user);
}`,
          kotlin: `fun render(
    user: User,
    formatter: (User) -> String,
): String = formatter(user)

val label = render(user) { value -> value.name.uppercase() }`,
        },
      },
      {
        id: "lambda-syntax",
        eyebrow: "02 · Lambda 语法",
        title: "最后一个函数参数可以移到括号外",
        paragraphs: [
          "当函数类型是最后一个参数时，Lambda 可以写成尾随形式；如果它还是唯一参数，圆括号也能省略。这就是 setOnClickListener { }、collect { } 和 launch { } 看起来像语言关键字的原因。",
          "Lambda 最后一条表达式就是返回值。需要多参数时在箭头前声明；不使用的参数写下划线。保持 Lambda 短小，如果包含多层分支或被重复使用，就提取为具名函数。",
        ],
        kotlinCode: `users
    .filter { user -> user.isActive }
    .sortedBy { it.name }
    .map { user -> UserRow(id = user.id, title = user.name) }

button.setOnClickListener {
    viewModel.retry()
}`,
      },
      {
        id: "closures",
        eyebrow: "03 · 闭包",
        title: "Lambda 能捕获外部变量，也可能延长它们的生命周期",
        paragraphs: [
          "闭包允许 Lambda 读取和修改外部作用域变量。捕获的 var 通常需要额外包装对象，既影响推理也可能产生分配；并发修改时它也不会自动线程安全。优先让 Lambda 根据输入返回结果，而不是偷偷修改外部状态。",
          "长期存活的回调如果捕获 Activity、View 或 Fragment，会让这些对象无法回收。注册监听器、Handler 回调或自建 Scope 时，要明确何时解除注册与取消。",
        ],
        kotlinCode: `fun clickCounter(onChanged: (Int) -> Unit): () -> Unit {
    var count = 0
    return {
        count += 1
        onChanged(count)
    }
}`,
        note: "闭包是能力，不是共享可变状态的许可证。跨协程共享计数应使用原子变量、Mutex，或把状态集中到单一协程。",
      },
      {
        id: "references-sam",
        eyebrow: "04 · 函数引用与 SAM",
        title: "已有函数用引用传递，Java 单方法接口可直接写 Lambda",
        paragraphs: [
          "::name 创建函数引用，User::name 创建属性引用。它们适合直接复用已有行为，例如 map(::toUiModel)，但参数顺序或重载不清晰时，显式 Lambda 更容易阅读。",
          "Kotlin 会把 Lambda 转换为 Java 的单抽象方法接口；Kotlin 自己的 fun interface 也支持同样用法。普通 Kotlin interface 即使只有一个方法，也不会默认获得 SAM 转换，除非声明为 fun interface。",
        ],
        kotlinCode: `private fun openDetails(view: View) {
    navigator.open(view.id)
}

button.setOnClickListener(::openDetails)

fun interface ErrorReporter {
    fun report(error: Throwable)
}

val reporter = ErrorReporter { error -> logger.log(error) }`,
      },
    ],
    exercise: {
      title: "实现可复用的列表转换器",
      prompt: "编写 fun <T, R> transform(items: List<T>, mapper: (T) -> R): List<R>，再分别用 Lambda 与函数引用把 User 转成 UserRow。",
      hint: "函数体可以直接调用 items.map(mapper)；先定义 toUserRow(user: User) 再传入 ::toUserRow。",
    },
  },

  "scope-functions": {
    sections: [
      {
        id: "extensions",
        eyebrow: "01 · 扩展函数",
        title: "扩展提供调用语法，不会真的修改原类",
        paragraphs: [
          "扩展函数在编译后本质上是接收者作为首个参数的静态函数，因此可以为第三方类型增加易读操作，但不能访问其 private 成员。成员函数与扩展同名时，成员函数始终优先。",
          "扩展采用静态分派：调用哪个扩展由变量的编译期类型决定，而不是运行时子类型。这使扩展适合无状态转换与格式化，不适合模拟多态。",
        ],
        kotlinCode: `fun Long.toUserRoute(): String = "users/$this"

open class Shape
class Circle : Shape()

fun Shape.label() = "shape"
fun Circle.label() = "circle"

val shape: Shape = Circle()
println(shape.label()) // 输出：shape`,
      },
      {
        id: "scope-choice",
        eyebrow: "02 · 五个作用域函数",
        title: "先决定返回什么，再决定用 this 还是 it",
        paragraphs: [
          "let 与 run 返回 Lambda 结果；also 与 apply 返回接收对象；with 也返回 Lambda 结果，但以普通函数调用。let/also 通过 it 引用对象，run/apply/with 通过 this 访问成员。",
          "常见选择：可空值转换用 ?.let；对象配置用 apply；附加日志或埋点用 also；需要组合多步并返回计算结果用 run；对已有对象集中调用多个成员可用 with。名称不是规则，数据流是否清晰才是标准。",
        ],
        bullets: [
          "let：it + 返回计算结果",
          "run：this + 返回计算结果",
          "apply：this + 返回原对象",
          "also：it + 返回原对象",
          "with：传入对象 + 返回计算结果",
        ],
        kotlinCode: `val request = Request.Builder()
    .url(url)
    .apply {
        if (token != null) header("Authorization", "Bearer $token")
    }
    .build()
    .also { logger.debug("request=$it") }`,
      },
      {
        id: "take-if",
        eyebrow: "03 · 条件链",
        title: "takeIf 保留满足条件的对象，否则返回 null",
        paragraphs: [
          "takeIf 与 takeUnless 适合把一个简单条件接入可空链，例如只接受非空白查询。它不会延迟接收者表达式的执行：昂贵计算如果写在点号左侧，即便条件失败也已经发生。",
          "当条件包含多个分支、失败原因需要区分，或链条已经难以断点调试时，普通 if 和局部变量更清楚。地道 Kotlin 不是把所有逻辑压成一行。",
        ],
        kotlinCode: `val normalizedQuery = rawQuery
    .trim()
    .takeIf { it.length >= 2 }
    ?: return showQueryHint()

viewModel.search(normalizedQuery)`,
      },
      {
        id: "scope-anti-patterns",
        eyebrow: "04 · Android 边界",
        title: "避免嵌套作用域函数隐藏对象身份",
        paragraphs: [
          "连续嵌套 let、run、apply 后，it 与 this 很快失去语义，空分支也容易被悄悄吞掉。对 ViewBinding、导航参数和状态渲染，优先使用明确局部变量与具名函数。",
          "扩展函数应靠近所属领域并保持窄职责。一个 Context 扩展若同时读数据库、发网络、弹 Toast，会制造隐式依赖，也让测试和生命周期判断更困难。",
        ],
        code: {
          title: "让渲染对象明确",
          java: `if (state != null) {
    title.setText(state.getTitle());
    retry.setVisibility(state.canRetry() ? VISIBLE : GONE);
}`,
          kotlin: `val current = state ?: return
binding.title.text = current.title
binding.retry.isVisible = current.canRetry`,
        },
      },
    ],
    exercise: {
      title: "为五种作用域函数做一次有理由的选择",
      prompt: "完成三个场景：配置 Intent 并返回 Intent；对可空 User 生成名字；打印请求但继续返回请求。分别写出实现，并解释为什么选择该函数。",
      hint: "返回原对象考虑 apply/also；返回转换结果考虑 let/run。再根据成员访问是否更适合 this 或具名 it 决定。",
    },
  },

  collections: {
    sections: [
      {
        id: "collection-types",
        eyebrow: "01 · 集合类型",
        title: "只读接口限制操作，但不承诺深层不可变",
        paragraphs: [
          "List、Set、Map 只暴露读取操作，MutableList 等接口增加修改能力。声明参数为 List 能缩小调用方权限，但底层对象可能仍被其他引用修改；跨层传递状态时通常创建新集合或不可变快照。",
          "listOf、mutableListOf 等工厂让意图直接体现在类型里。Android UI 状态建议公开 List，并在更新时用旧列表 + 新项产生新值，便于 StateFlow、DiffUtil 和 Compose 判断变化。",
        ],
        code: {
          title: "限制修改范围",
          java: `List<User> users = new ArrayList<>();
users.add(user);
view.render(Collections.unmodifiableList(users));`,
          kotlin: `private val users = mutableListOf<User>()

fun snapshot(): List<User> = users.toList()

val nextState = state.copy(items = state.items + user)`,
        },
      },
      {
        id: "operators",
        eyebrow: "02 · 转换与聚合",
        title: "把集合流水线读成数据变换",
        paragraphs: [
          "map 一进一出，filter 决定保留，flatMap 展开嵌套，associateBy 建立键索引，groupBy 按键分组。firstOrNull、singleOrNull 与 getOrNull 把“可能没有结果”明确放入类型。",
          "fold 从初始值累积结果，reduce 则使用首元素作为初值并要求集合非空。业务中优先选择名称最贴近意图的操作符；不要为了炫技用一个巨大 fold 取代清晰的分组与映射。",
        ],
        kotlinCode: `val rowsBySection: Map<String, List<UserRow>> = users
    .asSequence()
    .filter(User::isActive)
    .map(::toUserRow)
    .sortedBy(UserRow::title)
    .groupBy(UserRow::section)

val total = cart.fold(0L) { sum, item ->
    sum + item.priceInCents * item.count
}`,
      },
      {
        id: "sequence",
        eyebrow: "03 · Sequence",
        title: "Sequence 惰性逐项处理，Iterable 每步通常创建结果集合",
        paragraphs: [
          "普通集合链在每个中间操作后通常产生新集合；Sequence 把操作组成流水线，终止操作发生时才逐项执行。长链、大数据、只取前几个结果时，Sequence 能减少中间分配与无用计算。",
          "小集合和简单两步转换使用 Sequence 未必更快，反而多一层迭代开销。不要凭感觉优化：先观察数据规模、调用频率和分配，再用基准测试验证。Sequence 也不等于异步流。",
        ],
        kotlinCode: `val firstThree = records
    .asSequence()
    .filter { it.isValid }
    .map(::parseRecord)
    .take(3)
    .toList() // 终止操作触发执行`,
        note: "Sequence 是同步、拉取式、惰性计算；Flow 是可挂起、异步、支持取消的流。两者解决的问题不同。",
      },
      {
        id: "android-lists",
        eyebrow: "04 · Android 列表",
        title: "把领域数据转换成稳定的 UI 列表模型",
        paragraphs: [
          "Repository 返回领域模型，ViewModel 负责过滤、排序并映射为 UI 模型，Adapter 只负责展示。给列表项稳定 id，并让 UI 模型成为 data class，DiffUtil 才能可靠判断内容变化。",
          "避免在 onBindViewHolder 中做日期解析、复杂排序或数据库查询。这些工作应在上游一次完成；绑定阶段只把已准备好的值赋给 View。",
        ],
        kotlinCode: `val rows = users
    .filter { it.isVisible }
    .sortedWith(compareByDescending<User> { it.isPinned }.thenBy { it.name })
    .map { user ->
        UserRow(
            id = user.id,
            title = user.name,
            subtitle = formatter.lastSeen(user.lastSeenAt),
        )
    }`,
      },
    ],
    exercise: {
      title: "构建联系人分组流水线",
      prompt: "从 List<Contact> 中去掉停用联系人，按姓名排序，映射成 ContactRow，再按姓名首字母分组。为没有姓名的联系人归入“#”。",
      hint: "依次考虑 filter、sortedBy、map 和 groupBy；首字母可以用 firstOrNull()?.uppercase() ?: \"#\"。",
    },
  },

  generics: {
    sections: [
      {
        id: "generic-basics",
        eyebrow: "01 · 泛型与约束",
        title: "类型参数把一组相同规则应用到不同类型",
        paragraphs: [
          "泛型让容器和算法保留具体类型信息，避免 Any 与强制转换。Kotlin 泛型默认不型变：Box<Dog> 不是 Box<Animal>，因为 Box 如果既能读又能写，把 Dog 容器当成 Animal 容器就可能写入 Cat。",
          "上界约束写作 T : SomeType；多个约束使用 where。默认上界是 Any?，写 T : Any 可以禁止可空类型实参。约束应描述算法真正需要的能力，而不是为了复用强迫类型继承庞大基类。",
        ],
        kotlinCode: `fun <T : Comparable<T>> maxOfTwo(a: T, b: T): T =
    if (a >= b) a else b

fun <T> persist(value: T)
    where T : Identifiable,
          T : Serializable {
    // 同时具备两个能力
}`,
      },
      {
        id: "variance",
        eyebrow: "02 · 声明处型变",
        title: "out 只生产，in 只消费",
        paragraphs: [
          "如果类型参数只出现在返回位置，可以声明 out T，此时 Producer<Dog> 能作为 Producer<Animal> 使用。若只出现在参数位置，可以声明 in T，此时 Consumer<Animal> 能消费 Dog。它对应 Java 的 PECS：producer extends，consumer super。",
          "型变不是记忆箭头，而是权限限制。out T 的 API 不能接收 T，避免写入不安全值；in T 的 API 读取时只能得到 Any?。List<out E> 的只读设计因此可以安全协变。",
        ],
        kotlinCode: `interface Source<out T> {
    fun next(): T
}

interface Sink<in T> {
    fun accept(value: T)
}

val animalSource: Source<Animal> = dogSource
val dogSink: Sink<Dog> = animalSink`,
      },
      {
        id: "projections",
        eyebrow: "03 · 类型投影",
        title: "无法修改类型声明时，在使用处限制权限",
        paragraphs: [
          "Array<T> 同时读写，因此保持不型变。函数只需要读取时可接收 Array<out Animal>，只需要写入时可接收 Array<in Dog>；这是使用处投影，相当于临时把可用操作缩窄。",
          "星投影 Foo<*> 表示类型参数未知但仍安全可读，不等于 Foo<Any?>。你可以读取为上界类型，却不能写入具体值。它适合类型检查和不关心元素类型的通用逻辑。",
        ],
        kotlinCode: `fun copyDogs(
    from: Array<out Dog>,
    to: Array<in Dog>,
) {
    from.forEachIndexed { index, dog -> to[index] = dog }
}

fun sizeOf(value: List<*>): Int = value.size`,
      },
      {
        id: "erasure",
        eyebrow: "04 · 类型擦除与 Java",
        title: "运行时通常只知道 List，不知道 List<User>",
        paragraphs: [
          "JVM 泛型大多在运行时擦除，所以不能检查 value is List<User>，只能检查 List<*> 后逐项判断。普通泛型函数也不能直接写 T::class 或 value is T；内联 reified 能在调用点把具体类型嵌入代码。",
          "与 Java 互操作时，Kotlin 的 in/out 会映射为通配符，但编译器会在部分位置抑制通配符。公共 API 若被 Java 调用，需要实际查看生成签名，并在确有需要时使用 @JvmSuppressWildcards 或 @JvmWildcard。",
        ],
        kotlinCode: `fun usersFrom(value: Any): List<User> {
    val list = value as? List<*> ?: return emptyList()
    return list.mapNotNull { it as? User }
}

inline fun <reified T> Any?.isA(): Boolean = this is T`,
      },
    ],
    exercise: {
      title: "为缓存接口标注正确型变",
      prompt: "分别设计 Reader<T> 只返回 T、Writer<T> 只接收 T，并验证 Reader<Dog> 能赋给 Reader<Animal>，Writer<Animal> 能赋给 Writer<Dog>。",
      hint: "生产者的类型参数写 out，消费者写 in。若接口同时读写，保持不型变并拆分只读/只写视图。",
    },
  },

  "inline-and-reified": {
    sections: [
      {
        id: "inline",
        eyebrow: "01 · inline",
        title: "内联把函数体和 Lambda 展开到调用点",
        paragraphs: [
          "高阶函数通常需要创建函数对象并进行间接调用。inline 允许编译器把函数体与可内联 Lambda 复制到调用处，减少短小高频高阶函数的分配与调用开销，但会增大生成字节码。",
          "内联 Lambda 支持非局部 return：return 可以直接退出调用它的外层函数，因为内联后代码位于同一控制流。这个能力很强，也容易让阅读者误判退出范围，公共 API 应保持语义清晰。",
        ],
        kotlinCode: `inline fun <T> Iterable<T>.forEachUntil(
    action: (T) -> Boolean,
) {
    for (item in this) if (!action(item)) return
}

fun findInvalid(users: List<User>) {
    users.forEach { user ->
        if (!user.isValid) return // 退出 findInvalid
    }
}`,
        note: "不要给没有函数类型参数、没有 reified 需求的普通大函数随意加 inline；编译器也会提示收益有限。",
      },
      {
        id: "noinline-crossinline",
        eyebrow: "02 · Lambda 限制",
        title: "noinline 允许保存，crossinline 禁止非局部返回",
        paragraphs: [
          "内联函数的 Lambda 默认只能在可直接展开的位置调用，不能随意存入字段或作为普通值传递。标记 noinline 后，它保持真实函数对象，因此可以保存和转交，但不再享受该参数的内联。",
          "如果 Lambda 会在另一个执行上下文中调用，例如包装进 Runnable，就无法支持跳出外层函数的非局部 return。crossinline 明确禁止这种 return，同时仍允许其他内联优化。",
        ],
        kotlinCode: `inline fun runOnExecutor(
    executor: Executor,
    crossinline task: () -> Unit,
) {
    executor.execute { task() }
}

inline fun register(
    key: String,
    noinline callback: () -> Unit,
) {
    callbacks[key] = callback
}`,
      },
      {
        id: "reified",
        eyebrow: "03 · reified",
        title: "实化类型参数让调用点保留具体类型",
        paragraphs: [
          "普通泛型函数在运行时看不到 T。inline reified T 会把每个调用点的具体类型带入展开代码，因此可以使用 T::class、is T，并省去显式传 Class<T>。",
          "reified 只适用于内联函数，不会突破所有擦除限制：例如 List<String> 的元素类型仍可能不可验证。对公共库、反射框架或 Java 调用边界，显式 KClass/Class 参数有时更稳定。",
        ],
        code: {
          title: "读取 Intent 参数",
          java: `User user = intent.getParcelableExtra("user", User.class);`,
          kotlin: `inline fun <reified T : Parcelable> Intent.parcelable(key: String): T? =
    IntentCompat.getParcelableExtra(this, key, T::class.java)

val user = intent.parcelable<User>("user")`,
        },
      },
      {
        id: "dsl",
        eyebrow: "04 · 类型安全构建器",
        title: "带接收者 Lambda 是轻量 DSL 的语法基础",
        paragraphs: [
          "T.() -> Unit 让 Lambda 内部把 T 当作隐式接收者，可以直接调用它的成员。apply、Gradle Kotlin DSL、Compose 以及许多测试构建器都建立在这个机制上。",
          "DSL 应减少噪声而不是隐藏控制流。嵌套多个接收者时可能误调用外层成员，可用 @DslMarker 限制作用域；涉及网络、数据库等副作用时，具名普通 API 往往更诚实。",
        ],
        kotlinCode: `@DslMarker
annotation class UiDsl

@UiDsl
class DialogBuilder {
    var title: String = ""
    var message: String = ""
}

fun dialog(block: DialogBuilder.() -> Unit): DialogBuilder =
    DialogBuilder().apply(block)

val model = dialog {
    title = "删除记录"
    message = "此操作无法撤销"
}`,
      },
    ],
    exercise: {
      title: "写一个实化类型的 JSON 入口",
      prompt: "定义 inline fun <reified T : Any> Json.decode(text: String): T，把 T::class 传给已有的 decode(text, KClass<T>)。说明它仍可能在哪些嵌套泛型场景失去元素类型。",
      hint: "reified 让函数体可以访问 T::class；List<User> 这类参数化类型需要 typeOf<T>() 或框架自己的 TypeToken 支持。",
    },
  },

  delegation: {
    sections: [
      {
        id: "class-delegation",
        eyebrow: "01 · 类委托",
        title: "by 把接口实现转发给已有对象",
        paragraphs: [
          "类委托把组合关系的样板交给编译器。Wrapper : Service by delegate 会生成接口成员转发，同时允许 Wrapper 覆盖少数行为。相比继承，它不要求 delegate 与 Wrapper 是同一层级。",
          "委托只转发接口公开成员。被委托对象内部调用自身方法时，不会神奇地回到 Wrapper 的 override；设计装饰器时要明确调用链。",
        ],
        kotlinCode: `class LoggingUserSource(
    private val delegate: UserSource,
    private val logger: Logger,
) : UserSource by delegate {
    override suspend fun load(id: Long): User {
        logger.debug("load user $id")
        return delegate.load(id)
    }
}`,
      },
      {
        id: "standard-delegates",
        eyebrow: "02 · 标准属性委托",
        title: "lazy 延迟计算，observable 观察赋值",
        paragraphs: [
          "val value by lazy { } 在第一次读取时计算并缓存结果，默认具备线程安全同步。Android 主线程专用属性可在确认线程约束后选择 LazyThreadSafetyMode.NONE，避免不必要同步。",
          "Delegates.observable 会在每次赋值后收到旧值和新值，vetoable 可拒绝赋值。它们适合局部模型与工具，不应替代面向生命周期、可取消的数据流。",
        ],
        kotlinCode: `private val adapter by lazy(LazyThreadSafetyMode.NONE) {
    UserAdapter(onClick = ::openUser)
}

var query: String by Delegates.observable("") { _, old, new ->
    logger.debug("query: $old -> $new")
}`,
      },
      {
        id: "custom-delegate",
        eyebrow: "03 · 自定义属性委托",
        title: "getValue 与 setValue 定义属性读写协议",
        paragraphs: [
          "属性委托对象通过 operator getValue/setValue 接收宿主对象和 KProperty 元数据。它适合把重复的存取、校验、缓存或日志集中到可复用组件里。",
          "委托会隐藏一次间接调用，因此命名必须揭示副作用。读取一个看似普通属性却触发网络或磁盘 I/O，会让性能和线程约束难以判断，应改用显式 suspend 函数。",
        ],
        kotlinCode: `class Trimmed(initial: String = "") {
    private var value = initial.trim()

    operator fun getValue(thisRef: Any?, property: KProperty<*>): String = value

    operator fun setValue(thisRef: Any?, property: KProperty<*>, newValue: String) {
        value = newValue.trim()
    }
}

var displayName: String by Trimmed()`,
      },
      {
        id: "android-delegates",
        eyebrow: "04 · Android 代理",
        title: "by viewModels 是框架把创建与缓存封装成委托",
        paragraphs: [
          "Activity/Fragment KTX 的 by viewModels() 返回 Lazy 风格的属性委托：首次读取时通过 ViewModelStore 与 Factory 获取实例，配置变化后复用同一作用域中的 ViewModel。by activityViewModels() 则选择 Activity 的 store。",
          "理解委托后，就能从类型与作用域判断行为，而不是把语法当魔法。任何持有 View、Context 或 Fragment 的自定义委托都要审视释放时机，避免跨越视图生命周期。",
        ],
        kotlinCode: `class UserFragment : Fragment(R.layout.user_fragment) {
    private val viewModel: UserViewModel by viewModels()
    private val sharedViewModel: HostViewModel by activityViewModels()
}`,
      },
    ],
    exercise: {
      title: "实现 SharedPreferences 字符串委托",
      prompt: "实现 StringPreference：读取时按属性名取值，写入时保存；允许传入默认值和显式 key。讨论它为什么不适合保存敏感信息。",
      hint: "实现 operator getValue 与 setValue；KProperty.name 可作为缺省 key，敏感数据应使用受保护存储并遵循安全模型。",
    },
  },

  "annotations-reflection": {
    sections: [
      {
        id: "annotations",
        eyebrow: "01 · 注解",
        title: "注解为代码附加结构化元数据",
        paragraphs: [
          "annotation class 定义注解，@Target 限定使用位置，@Retention 决定元数据保留到源码、二进制还是运行时。只给编译器或代码生成器使用的注解不必保留到运行时。",
          "Kotlin 一个属性可能对应构造参数、字段、getter 等多个 JVM 元素。use-site target 如 @field:、@get:、@param: 明确注解落点；序列化、依赖注入与校验框架经常依赖正确落点。",
        ],
        kotlinCode: `@Target(AnnotationTarget.PROPERTY, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
annotation class Redacted

data class LoginRequest(
    @field:Redacted val password: String,
    @get:JvmName("userName") val name: String,
)`,
      },
      {
        id: "references",
        eyebrow: "02 · KClass 与成员引用",
        title: "引用描述一个声明，而不是立即执行它",
        paragraphs: [
          "User::class 得到 KClass<User>，user::class 得到运行时类型。::function、Type::property 等可调用引用实现 KCallable，可作为函数值传递，也能在启用 kotlin-reflect 后读取名称、参数和注解。",
          "Java API 需要 Class 时使用 User::class.java；从 Java Class 回到 KClass 可用 .kotlin。仅做函数传递不需要完整反射库，真正枚举成员和调用构造函数才通常依赖 kotlin-reflect。",
        ],
        kotlinCode: `val sorter: (User) -> String = User::name
val sorted = users.sortedBy(sorter)

val kotlinType: KClass<User> = User::class
val javaType: Class<User> = User::class.java`,
      },
      {
        id: "reflection-cost",
        eyebrow: "03 · 反射边界",
        title: "反射换来动态能力，也失去部分编译期保证",
        paragraphs: [
          "反射能在运行时扫描成员、读取注解并调用声明，适合序列化、测试工具和框架扩展点。但查找、可访问性处理与动态调用比直接调用更慢，也让重命名和混淆配置复杂。",
          "频繁路径应缓存反射结果，不要在 RecyclerView 绑定或每帧渲染中重复扫描。Android 构建更倾向 KSP 等代码生成方案：在编译期生成直接调用，错误更早暴露，也更利于 R8 优化。",
        ],
        kotlinCode: `fun redactedProperties(type: KClass<*>): List<KProperty1<*, *>> =
    type.memberProperties.filter { property ->
        property.findAnnotation<Redacted>() != null
    }

// 在类型级缓存结果，而不是每次日志调用都扫描`,
        note: "反射处理外部输入时仍需验证类型与可见性；不要为了省几行映射代码就开放 private 成员。",
      },
      {
        id: "android-frameworks",
        eyebrow: "04 · Android 工程",
        title: "先辨认框架在运行时反射，还是在编译期生成代码",
        paragraphs: [
          "Room、Hilt、Moshi 等工具大量使用注解，但现代 Android 常在编译期通过 KSP/KAPT 生成实现。注解本身只是元数据，真正行为来自对应处理器、Gradle 插件和生成代码。",
          "遇到注解未生效时，按三层检查：使用目标是否正确、处理器是否配置、生成代码是否出现。把问题简单归因于“反射失败”往往会走错方向。",
        ],
        kotlinCode: `@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: Long,
    @ColumnInfo(name = "display_name") val name: String,
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun find(id: Long): UserEntity?
}`,
      },
    ],
    exercise: {
      title: "检查注解落点",
      prompt: "为 data class RegisterRequest(val email: String) 添加同时可用于字段校验与 getter 日志的两个注解，并明确写出 use-site target。解释运行时读取哪个 JVM 元素。",
      hint: "分别尝试 @field:ValidEmail 与 @get:Logged；查看框架文档要求扫描 Field、Method 还是构造参数。",
    },
  },

  "java-interop": {
    sections: [
      {
        id: "platform-boundary",
        eyebrow: "01 · 空值边界",
        title: "平台类型要求你替没有注解的 Java API 做决定",
        paragraphs: [
          "Java 声明缺少空值注解时，Kotlin 将返回值视为平台类型 T!，既允许赋给 T，也允许赋给 T?。选择非空不会改变 Java 的真实行为；若运行时返回 null，异常会在边界或后续解引用处出现。",
          "混合项目应在 Java 公共 API 上补齐受 Kotlin 识别的 @Nullable/@NonNull，并在 Kotlin 边界立即转换为明确类型。不要让平台类型穿过多层业务代码。",
        ],
        code: {
          title: "收紧 Java 返回值",
          java: `// 未标注时 Kotlin 无法判断
User findUser(long id);`,
          kotlin: `val user: User? = javaRepository.findUser(id)
    ?: return Result.failure(MissingUser(id))

// 从这里开始，业务层只处理明确非空的 user`,
        },
      },
      {
        id: "jvm-annotations",
        eyebrow: "02 · JVM 注解",
        title: "只在确有 Java 调用方时塑造字节码 API",
        paragraphs: [
          "@JvmStatic 为 object/companion 成员生成静态桥接，@JvmField 暴露字段而不是访问器，@JvmOverloads 按默认参数生成多个重载，@JvmName 改变 JVM 方法名。它们服务二进制互操作，不会让 Kotlin 源码本身更地道。",
          "默认参数可能组合很多，@JvmOverloads 只从末尾连续生成重载，无法替代经过设计的 Java API。公共库应写一个小型 Java 调用示例或编译测试，确认最终签名确实易用。",
        ],
        kotlinCode: `class AvatarLoader @JvmOverloads constructor(
    private val sizePx: Int,
    private val circle: Boolean = true,
)

companion object {
    @JvmStatic fun createDefault(): AvatarLoader = AvatarLoader(96)
}

@JvmField val DEFAULT_TIMEOUT_MS = 5_000L`,
      },
      {
        id: "sam-exceptions-generics",
        eyebrow: "03 · SAM、异常与泛型",
        title: "两种语言的类型习惯并不完全对称",
        paragraphs: [
          "Kotlin 可用 Lambda 调用 Java SAM 接口，也能通过 fun interface 向 Java 暴露单方法协议。Kotlin 没有受检异常规则；若 Java 调用方需要看到 throws 声明，可用 @Throws 生成对应字节码信息。",
          "Java 通配符与 Kotlin 型变映射会受声明位置影响。集合参数若在 Java 侧出现难用的 ? extends，可在确认类型安全后用 @JvmSuppressWildcards 调整，但不要靠注解掩盖错误的 in/out 设计。",
        ],
        kotlinCode: `@Throws(IOException::class)
fun readConfig(file: File): Config =
    file.inputStream().use(parser::parse)

fun interface CompletionListener {
    fun onComplete(result: Result<User>)
}`, 
      },
      {
        id: "migration",
        eyebrow: "04 · 混合迁移",
        title: "按边界渐进迁移，不做一次性翻译工程",
        paragraphs: [
          "Java 与 Kotlin 可以在同一模块双向调用。优先迁移测试覆盖较好、职责独立、能立刻受益于空安全或数据类的文件；保持提交小，并让 Java 测试继续验证行为。IDE 转换器提供起点，不负责 API 设计。",
          "每迁移一层就收紧边界：补空值注解、减少可变 getter、用明确 Result/状态替代异常约定。避免在 Java 和 Kotlin 之间来回复制 Utils；把共享协议稳定下来，再逐步替换实现。",
        ],
        bullets: [
          "先测试与纯模型，再 Mapper/UseCase，最后生命周期组件",
          "逐个消除平台类型和 !!",
          "检查 Java 调用签名与生成字节码",
          "每次迁移保持可编译、可回滚",
        ],
      },
    ],
    exercise: {
      title: "设计一个 Java 友好的 Kotlin API",
      prompt: "创建 ImageRequest：必填 url，可选 width、height；Java 可以用 1～3 个参数构造。提供静态 createDefault(url)，并声明 load() 可能抛 IOException。",
      hint: "组合 @JvmOverloads、companion object + @JvmStatic、@Throws；最后写出 Java 调用代码验证签名。",
    },
  },
};
