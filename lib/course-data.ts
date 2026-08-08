import { completeChapterContent } from "./complete-chapter-content";
import { exerciseSolutions } from "./exercise-solutions";

export type CodePair = {
  title: string;
  java: string;
  kotlin: string;
};

export type ChapterSection = {
  id: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  code?: CodePair;
  kotlinCode?: string;
  note?: string;
};

export type Chapter = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  duration: number;
  level: "入门" | "进阶" | "高级";
  status: "ready" | "outline";
  lessons: string[];
  objectives: string[];
  sections?: ChapterSection[];
  exercise?: {
    title: string;
    prompt: string;
    starter?: string;
    hint: string;
    solution?: string;
    solutionExplanation?: string;
    solutionChecks?: string[];
    solutionRoles?: {
      component: string;
      responsibility: string;
      boundary: string;
    }[];
  };
};

export type CourseUnit = {
  id: string;
  label: string;
  title: string;
  description: string;
  accent: string;
  chapters: Chapter[];
};

const chapter = (
  number: number,
  slug: string,
  title: string,
  summary: string,
  duration: number,
  level: Chapter["level"],
  lessons: string[],
  objectives: string[],
  extras: Partial<Pick<Chapter, "status" | "sections" | "exercise">> = {},
): Chapter => {
  const completeContent = completeChapterContent[slug];
  const exercise = extras.exercise ?? completeContent?.exercise;
  const solution = exerciseSolutions[slug];

  return {
    number,
    slug,
    title,
    summary,
    duration,
    level,
    lessons,
    objectives,
    status: extras.status ?? (completeContent ? "ready" : "outline"),
    sections: extras.sections ?? completeContent?.sections,
    exercise: exercise ? { ...exercise, ...solution } : undefined,
  };
};

export const courseUnits: CourseUnit[] = [
  {
    id: "foundation",
    label: "第一部分",
    title: "Java → Kotlin 思维迁移",
    description: "先建立 Kotlin 的语言模型，再把熟悉的 Java Android 写法迁移过来。",
    accent: "violet",
    chapters: [
      chapter(
        1,
        "meet-kotlin",
        "认识 Kotlin",
        "从 Java 开发者最熟悉的代码出发，理解 Kotlin 到底改变了什么。",
        32,
        "入门",
        ["Kotlin 与 Java 的核心差异", "文件、包与顶层声明", "val、var 与类型推断", "没有 new 和传统 static", "JVM 编译过程", "混合项目迁移"],
        ["能够解释 Kotlin 不只是“更短的 Java”", "掌握 val、var 和类型推断", "看懂最常见的 Kotlin Android 文件结构"],
        {
          status: "ready",
          sections: [
            {
              id: "mindset",
              eyebrow: "01 · 语言模型",
              title: "真正需要迁移的是思维，而不是分号",
              paragraphs: [
                "Kotlin 仍然运行在 JVM 上，也能调用几乎所有 Java 与 Android API。但它把空安全、函数、属性和表达式放到了语言核心里。对 Java 开发者来说，难点通常不是看不懂语法，而是继续用 Java 的方式组织 Kotlin。",
                "学习时先问“这段代码表达的约束是什么”，不要只问“Java 对应写法是什么”。val 表达不可重新赋值，String? 表达可能为空，sealed class 表达有限状态集合——这些约束会被编译器持续检查。",
              ],
              bullets: ["空值进入类型系统", "函数可以作为值传递", "属性代替裸字段", "if、when、try 都能返回结果"],
            },
            {
              id: "variables",
              eyebrow: "02 · 变量",
              title: "val 固定引用，var 允许重新赋值",
              paragraphs: [
                "val 最接近 Java 的 final：变量只能赋值一次，但它指向的对象仍然可能是可变的。Kotlin 鼓励默认使用 val，让状态变化变得显式。",
                "类型明显时可以交给编译器推断；公共 API、复杂泛型和容易误解的数值类型，则建议写明类型。",
              ],
              code: {
                title: "变量声明",
                java: "final String name = \"Ada\";\nint retryCount = 0;\nfinal List<String> tags = new ArrayList<>();\ntags.add(\"Android\");",
                kotlin: "val name = \"Ada\"\nvar retryCount = 0\nval tags = mutableListOf<String>()\ntags += \"Android\"",
              },
              note: "val 不等于深层不可变。上面的 tags 不能指向另一个列表，但列表内容仍然可以变化。",
            },
            {
              id: "top-level",
              eyebrow: "03 · 文件结构",
              title: "工具函数不再需要塞进 Util 类",
              paragraphs: [
                "Kotlin 允许在文件顶层声明函数、属性和常量。编译到 JVM 后，编译器会生成承载这些成员的类；源码层面无需制造一个只有 static 方法的工具类。",
                "Android 项目常把格式化、单位转换、扩展函数以及路由常量放在语义明确的 Kotlin 文件中。文件名描述职责，比 EverythingUtils 更易维护。",
              ],
              kotlinCode: "package com.example.user\n\nconst val EXTRA_USER_ID = \"extra_user_id\"\n\nfun Long.asUserId(): String = \"user-$this\"",
            },
            {
              id: "android",
              eyebrow: "04 · Android 场景",
              title: "一段常见 Activity 代码的变化",
              paragraphs: [
                "Kotlin 创建对象不写 new，属性访问会映射到 Java getter/setter，字符串模板可以直接嵌入表达式。代码更短只是结果，重点是信息密度更高。",
              ],
              code: {
                title: "读取 Intent 参数",
                java: "String id = getIntent().getStringExtra(\"user_id\");\nif (id == null) {\n    finish();\n    return;\n}\ntitleView.setText(\"用户 \" + id);",
                kotlin: "val id = intent.getStringExtra(\"user_id\")\n    ?: return finish()\n\ntitleView.text = \"用户 $id\"",
              },
            },
          ],
          exercise: {
            title: "把 Java 工具方法迁移为顶层函数",
            prompt: "把下面的方法改成 Kotlin 顶层函数，参数不可重新赋值，返回类型交给编译器推断。",
            starter: "public static String userLabel(long id) {\n    return \"user-\" + id;\n}",
            hint: "函数可以写成单表达式形式：fun name(parameter: Type) = expression",
          },
        },
      ),
      chapter(
        2,
        "types-and-control-flow",
        "基础类型与控制流程",
        "掌握表达式、when、区间、相等性与智能类型转换。",
        42,
        "入门",
        ["基础类型与字符串模板", "if、when 与 try 表达式", "区间和循环", "== 与 ===", "类型判断和转换", "标签与 Nothing"],
        ["使用表达式消除临时变量", "正确区分结构相等和引用相等", "用 when 建模多分支业务逻辑"],
        {
          status: "ready",
          sections: [
            {
              id: "expressions",
              eyebrow: "01 · 表达式",
              title: "if、when 和 try 都可以产生值",
              paragraphs: [
                "Java 经常先声明变量，再在不同分支里赋值。Kotlin 的控制结构大多是表达式，可以直接把分支结果赋给 val。这样既减少可变状态，也让编译器确认每条路径都有结果。",
              ],
              code: {
                title: "页面标题",
                java: "String title;\nif (user.isVip()) {\n    title = \"VIP 用户\";\n} else {\n    title = \"普通用户\";\n}",
                kotlin: "val title = if (user.isVip) {\n    \"VIP 用户\"\n} else {\n    \"普通用户\"\n}",
              },
            },
            {
              id: "when",
              eyebrow: "02 · when",
              title: "when 不只是更好看的 switch",
              paragraphs: [
                "when 可以匹配具体值、区间、类型或任意布尔条件。作为表达式使用时，需要覆盖所有可能路径；这正是后面用 sealed class 处理 UI 状态的基础。",
              ],
              kotlinCode: "val message = when (code) {\n    in 200..299 -> \"请求成功\"\n    401 -> \"登录已失效\"\n    404 -> \"数据不存在\"\n    else -> \"未知错误：$code\"\n}",
              note: "没有 Java 式 fall-through，也不需要 break。每个分支天然独立。",
            },
            {
              id: "equality",
              eyebrow: "03 · 相等性",
              title: "== 比较内容，=== 比较是否同一对象",
              paragraphs: [
                "Kotlin 的 == 会安全地调用 equals；=== 才相当于 Java 对引用使用 ==。业务代码绝大部分需要的是结构相等，因此通常使用 ==。",
              ],
              code: {
                title: "字符串比较",
                java: "String a = new String(\"Kotlin\");\nString b = new String(\"Kotlin\");\nboolean sameValue = a.equals(b);\nboolean sameObject = a == b;",
                kotlin: "val a = String(charArrayOf('K', 'o', 't', 'l', 'i', 'n'))\nval b = \"Kotlin\"\nval sameValue = a == b\nval sameObject = a === b",
              },
            },
            {
              id: "smart-cast",
              eyebrow: "04 · 类型",
              title: "类型检查之后，编译器替你完成转换",
              paragraphs: [
                "通过 is 检查后，只要编译器能证明值不会被偷偷改变，就会自动将它视为更具体的类型。Java 中重复的 instanceof 与强制转换因此合并成一步。",
              ],
              kotlinCode: "fun render(model: Any) = when (model) {\n    is String -> model.length\n    is List<*> -> model.size\n    else -> 0\n}",
            },
          ],
          exercise: {
            title: "使用 when 改写状态码判断",
            prompt: "编写函数 httpLabel(code: Int)，200～299 返回“成功”，401 返回“请登录”，其他返回“失败”。",
            hint: "让 when 直接成为函数的返回表达式。",
          },
        },
      ),
      chapter(
        3,
        "functions",
        "函数基础",
        "理解函数声明、默认参数、具名参数、Unit 与单表达式函数。",
        38,
        "入门",
        ["函数声明", "Unit 与 Nothing", "单表达式函数", "默认和具名参数", "vararg", "顶层与局部函数"],
        ["用默认参数减少重载", "区分 Unit、Nothing 和 Java void", "写出清晰的 Kotlin 函数 API"],
        {
          status: "ready",
          sections: [
            {
              id: "declaration",
              eyebrow: "01 · 声明",
              title: "参数写类型，返回类型看复杂度",
              paragraphs: [
                "Kotlin 参数采用 name: Type 的形式。单表达式函数可以推断返回类型；具有复杂控制流的公共函数则建议明确写出返回类型，让 API 意图稳定。",
              ],
              code: {
                title: "计算折扣",
                java: "double discounted(double price, double rate) {\n    return price * (1 - rate);\n}",
                kotlin: "fun discounted(price: Double, rate: Double) =\n    price * (1 - rate)",
              },
            },
            {
              id: "defaults",
              eyebrow: "02 · 参数",
              title: "默认参数代替成组的重载方法",
              paragraphs: [
                "默认参数让调用方只覆盖真正关心的选项；具名参数让多个 Boolean、Int 或可空参数不再依赖记忆顺序。Java 调用者需要重载时，可以在边界处使用 @JvmOverloads，而不是让所有 Kotlin API 都膨胀。",
              ],
              kotlinCode: "fun loadUser(\n    id: Long,\n    refresh: Boolean = false,\n    showLoading: Boolean = true,\n) { /* 执行用户加载逻辑 */ }\n\nloadUser(id = 42L, refresh = true)",
            },
            {
              id: "unit",
              eyebrow: "03 · 返回值",
              title: "Unit 是有唯一值的类型",
              paragraphs: [
                "没有业务结果的函数返回 Unit，声明时通常省略。它与 Java void 的使用体验相似，但 Unit 可以作为泛型参数和函数类型的返回值，因此 Kotlin 的函数类型系统更统一。",
              ],
              kotlinCode: "val logger: (String) -> Unit = { message ->\n    println(message)\n}\n\nfun render(): Unit {\n    logger(\"render user screen\")\n}",
              note: "Nothing 表示函数永远不会正常返回，例如总是抛异常的 error()。它和 Unit 不是一回事。",
            },
            {
              id: "android-api",
              eyebrow: "04 · Android API",
              title: "让调用代码自己解释意图",
              paragraphs: [
                "具名参数尤其适合测试数据、动画配置和页面导航。调用处直接展示含义，比连续传入 true、false、0 更可靠。",
              ],
              code: {
                title: "配置动画",
                java: "animate(view, 300L, true, false);",
                kotlin: "animate(\n    target = view,\n    durationMillis = 300L,\n    fade = true,\n    scale = false,\n)",
              },
            },
          ],
          exercise: {
            title: "消除重载",
            prompt: "把三个 loadData() Java 重载合并为一个 Kotlin 函数，参数包含 page、refresh 和 showLoading。",
            hint: "为非必要参数设置默认值，在调用处使用具名参数。",
          },
        },
      ),
      chapter(
        4,
        "null-safety",
        "空安全",
        "把 null 从运行时事故，变成编译器能帮助你处理的业务状态。",
        52,
        "入门",
        ["可空与非空类型", "安全调用和 Elvis", "非空断言", "智能转换条件", "lateinit、lazy 与可空属性", "Java 平台类型"],
        ["正确组合 ?. 与 ?: ", "知道 !! 为什么不是空安全方案", "为 Android 生命周期选择合适的属性形式"],
        {
          status: "ready",
          sections: [
            {
              id: "type-system",
              eyebrow: "01 · 类型系统",
              title: "String 和 String? 是两种不同类型",
              paragraphs: [
                "Kotlin 不假设所有引用都可能为 null。非空类型可以直接访问成员；可空类型必须先证明当前值存在。很多潜在 NPE 因而在编译阶段就暴露出来。",
              ],
              code: {
                title: "空值声明",
                java: "String name = getName();\n// 编译器不知道 name 是否为 null\nint length = name.length();",
                kotlin: "val name: String? = getName()\nval length: Int? = name?.length",
              },
            },
            {
              id: "operators",
              eyebrow: "02 · 操作符",
              title: "安全调用负责传播 null，Elvis 负责收口",
              paragraphs: [
                "?. 在接收者为空时直接返回 null，适合安全地继续链式访问。?: 在左侧为空时提供默认值、抛出异常或提前返回。两者组合后，空值路径会非常清晰。",
              ],
              kotlinCode: "val userId = intent\n    .getStringExtra(EXTRA_USER_ID)\n    ?.toLongOrNull()\n    ?: return finish()",
              note: "!! 只是把编译错误变回运行时崩溃。除非不变量已经由框架或测试严格保证，否则不要把它当日常写法。",
            },
            {
              id: "smart-cast-null",
              eyebrow: "03 · 智能转换",
              title: "可变属性为什么有时不能自动去掉问号",
              paragraphs: [
                "局部 val 在判空后不会改变，编译器可以安全地把它转换成非空类型。开放属性、带自定义 getter 的属性或普通 var 可能在检查与使用之间变化，因此需要保存局部快照，或者使用安全调用。",
              ],
              kotlinCode: "val currentName = userName\nif (currentName != null) {\n    titleView.text = currentName.uppercase()\n}\n\nuserName?.let { name ->\n    titleView.text = name.uppercase()\n}",
            },
            {
              id: "lifecycle",
              eyebrow: "04 · Android 生命周期",
              title: "lateinit、lazy 和 T? 分别表达不同承诺",
              paragraphs: [
                "lateinit 表示稍后一定初始化；lazy 表示第一次使用时才计算；T? 表示业务或生命周期上确实可能不存在。Fragment 的 ViewBinding 在 onDestroyView 后必须释放，因此可空幕后属性比 lateinit 更符合事实。",
              ],
              kotlinCode: "private var _binding: FragmentUserBinding? = null\nprivate val binding get() = requireNotNull(_binding)\n\noverride fun onDestroyView() {\n    _binding = null\n    super.onDestroyView()\n}",
            },
            {
              id: "platform-types",
              eyebrow: "05 · Java 边界",
              title: "平台类型是 Kotlin 无法替 Java 做出的决定",
              paragraphs: [
                "没有空值注解的 Java 返回值在 Kotlin 中成为平台类型。你可以把它当非空，也可以当可空；如果 Java 实际返回 null，而你选择了非空路径，NPE 仍然会发生。边界代码应主动做保守判断，并逐步补充 Java 空值注解。",
              ],
            },
          ],
          exercise: {
            title: "安全读取页面参数",
            prompt: "读取 Intent 中的 user_id，转换为 Long；缺失或格式错误时结束页面。禁止使用 if 和 !!。",
            hint: "依次使用 ?.toLongOrNull() 和 ?: return finish()。",
          },
        },
      ),
    ],
  },
  {
    id: "object-model",
    label: "第二部分",
    title: "类、属性与数据建模",
    description: "用 Kotlin 的对象模型描述稳定、可穷举的 Android 状态。",
    accent: "blue",
    chapters: [
      chapter(5, "classes", "类和构造函数", "主构造、init、继承、接口与可见性。", 44, "入门", ["主构造函数", "次构造函数", "init", "继承与 open", "接口", "嵌套与 inner"], ["理解构造参数和属性的区别", "正确设计继承和组合关系"]),
      chapter(6, "properties", "Kotlin 属性系统", "getter、setter、幕后字段、常量与委托属性。", 46, "进阶", ["属性与字段", "自定义访问器", "field", "幕后属性", "private set", "const val"], ["解释 Kotlin 属性如何映射到 JVM", "使用 private set 控制状态修改"]),
      chapter(7, "data-modeling", "数据建模", "data、sealed、object、value class 与 UI 状态。", 55, "进阶", ["data class", "解构与 copy", "enum", "sealed", "object", "value class"], ["用密封类型建模 UI 状态", "理解 data class 自动生成的能力"]),
    ],
  },
  {
    id: "idiomatic-kotlin",
    label: "第三部分",
    title: "Kotlin 常用写法",
    description: "从能写语法，进阶到写出清晰、地道且可维护的 Kotlin。",
    accent: "teal",
    chapters: [
      chapter(8, "lambdas", "Lambda 与高阶函数", "函数类型、闭包、函数引用和 SAM。", 52, "进阶", ["函数类型", "Lambda", "尾随 Lambda", "it", "函数引用", "闭包与 SAM"], ["读懂 Android API 中的 Lambda", "能够声明和调用高阶函数"]),
      chapter(9, "scope-functions", "扩展函数与作用域函数", "let、run、with、apply、also 的选择与边界。", 48, "进阶", ["扩展函数", "静态分派", "五个作用域函数", "takeIf", "嵌套与滥用"], ["根据返回值和接收者选择作用域函数", "避免扩展函数造成隐式耦合"]),
      chapter(10, "collections", "集合与序列", "集合转换、分组、聚合、惰性执行与性能。", 58, "进阶", ["只读与可变集合", "转换与过滤", "分组与关联", "fold", "Sequence", "性能"], ["熟练处理 Android 列表数据", "判断何时需要 Sequence"]),
      chapter(11, "generics", "泛型与型变", "类型约束、in/out、星投影和 Java 通配符。", 66, "高级", ["泛型类型", "类型约束", "型变", "类型投影", "星投影", "类型擦除"], ["用 PECS 思维理解 in/out", "解释 Kotlin 泛型为何默认不型变"]),
      chapter(12, "inline-and-reified", "内联与高级函数机制", "inline、noinline、crossinline、reified 与 DSL。", 62, "高级", ["inline", "noinline", "crossinline", "非局部返回", "reified", "类型安全构建器"], ["解释 inline 对 Lambda 分配的影响", "用 reified 简化类型参数 API"]),
    ],
  },
  {
    id: "jvm",
    label: "第四部分",
    title: "委托、反射与 JVM 互操作",
    description: "理解 Android 项目里那些看似“魔法”的 Kotlin 写法。",
    accent: "amber",
    chapters: [
      chapter(13, "delegation", "委托机制", "类委托、属性委托与 Android 常见代理。", 54, "高级", ["类委托", "lazy", "observable", "自定义委托", "Map 委托", "by viewModels"], ["实现简单属性委托", "解释 by viewModels 的语法基础"]),
      chapter(14, "annotations-reflection", "注解与反射", "KClass、属性引用、函数引用与性能边界。", 45, "高级", ["注解", "使用目标", "KClass", "成员引用", "反射", "框架场景"], ["掌握 Kotlin 反射核心 API", "知道何时不应该使用反射"]),
      chapter(15, "java-interop", "Java 与 Kotlin 互操作", "平台类型、JVM 注解、SAM、异常和混合迁移。", 68, "高级", ["平台类型", "SAM", "受检异常", "JvmStatic/JvmField", "JvmOverloads", "Java 泛型"], ["为 Java 调用方设计 Kotlin API", "制定可执行的混合项目迁移策略"]),
    ],
  },
  {
    id: "coroutines",
    label: "第五部分",
    title: "协程原理",
    description: "从 suspend 状态机走到结构化并发、取消、异常与测试。",
    accent: "pink",
    chapters: [
      chapter(16, "coroutine-mental-model", "协程到底是什么", "线程、挂起、Continuation 与状态机。", 64, "进阶", ["线程与协程", "阻塞与挂起", "suspend", "Continuation", "状态机", "线程切换"], ["准确解释 suspend", "看懂挂起函数反编译后的核心结构"]),
      chapter(17, "coroutine-context", "作用域、上下文与调度器", "Scope、Context、Job、Dispatcher 与构建器。", 70, "进阶", ["CoroutineScope", "CoroutineContext", "Job", "Dispatcher", "launch/async", "withContext"], ["根据任务类型选择 Dispatcher", "理解 Job 父子关系"]),
      chapter(18, "structured-concurrency", "结构化并发", "父子协程、并发组合和监督关系。", 62, "高级", ["结构化并发", "coroutineScope", "async 并发", "supervisorScope", "SupervisorJob", "Android Scope"], ["说明 GlobalScope 的问题", "正确组织多个并发请求"]),
      chapter(19, "cancellation-and-errors", "取消、超时与异常", "协作式取消、资源清理与异常传播。", 72, "高级", ["协作取消", "ensureActive", "timeout", "finally", "CancellationException", "异常处理器"], ["写出可取消的 CPU 任务", "判断 launch 和 async 的异常去向"]),
      chapter(20, "channels-and-testing", "Channel、共享状态与测试", "通道、背压、互斥与虚拟时间测试。", 78, "高级", ["Channel", "缓冲", "select", "Mutex", "原子变量", "runTest"], ["选择 Channel 或共享状态", "使用虚拟时间测试协程"]),
    ],
  },
  {
    id: "flow",
    label: "第六部分",
    title: "Flow",
    description: "建立从冷流到热流，再到生命周期安全收集的完整模型。",
    accent: "cyan",
    chapters: [
      chapter(21, "flow-basics", "Flow 基础和操作符", "冷流、发射、收集和常用转换。", 68, "进阶", ["冷流", "flow 构建器", "emit/collect", "中间操作符", "combine/zip", "展平操作符"], ["解释 Flow 的冷流特征", "根据业务语义选择组合操作符"]),
      chapter(22, "flow-context", "Flow 上下文、背压与异常", "flowOn、buffer、conflate、catch 和重试。", 74, "高级", ["顺序模型", "flowOn", "buffer", "conflate", "collectLatest", "catch/retry"], ["画出 flowOn 的上下游边界", "为高频数据选择背压策略"]),
      chapter(23, "hot-flows", "StateFlow 与 SharedFlow", "热流、replay、stateIn、shareIn 和事件选择。", 80, "高级", ["热流", "StateFlow", "SharedFlow", "replay", "stateIn/shareIn", "Channel 对比"], ["区分状态与事件", "配置正确的 SharingStarted"]),
      chapter(24, "flow-lifecycle", "Android 生命周期中收集 Flow", "repeatOnLifecycle、ViewModel 和 UI 状态。", 66, "高级", ["repeatOnLifecycle", "flowWithLifecycle", "viewModelScope", "SavedStateHandle", "UI State", "一次性事件"], ["避免页面后台仍持续收集", "设计稳定的 ViewModel 状态流"]),
    ],
  },
  {
    id: "android",
    label: "第七部分",
    title: "Android 完整实战",
    description: "把 Kotlin、协程和 Flow 串进真实的 Android 数据链路。",
    accent: "green",
    chapters: [
      chapter(25, "android-patterns", "Kotlin Android 常用模式", "ViewBinding、ViewModel、Room、Retrofit 与状态建模。", 82, "进阶", ["Activity/Fragment", "ViewBinding", "ViewModel", "Repository", "Room/Retrofit", "Parcelize"], ["建立清晰的 Android Kotlin 分层", "避免扩展函数和全局状态滥用"]),
      chapter(26, "capstone", "完整项目", "完成一个搜索、缓存、刷新、重试和恢复齐全的客户端。", 180, "高级", ["项目结构", "网络和缓存", "StateFlow", "状态恢复", "错误重试", "测试"], ["独立完成 Kotlin Android 数据流", "能解释关键架构取舍"]),
    ],
  },
  {
    id: "engineering",
    label: "第八部分",
    title: "原理、规范与面试",
    description: "把知识变成工程判断，也变成面试时能清楚表达的答案。",
    accent: "slate",
    chapters: [
      chapter(27, "performance", "性能、调试与代码规范", "隐藏分配、装箱、调试工具与可维护性。", 64, "高级", ["隐藏分配", "装箱", "集合性能", "协程调试", "Flow 订阅", "编码规范"], ["识别常见 Kotlin 性能问题", "建立可维护性优先的编码判断"]),
      chapter(28, "kotlin-21-k2", "Kotlin 2.1 与 K2", "编译器变化、语言更新和升级检查。", 52, "进阶", ["K2", "Kotlin 2.1", "编译器选项", "兼容性", "版本迁移", "检查清单"], ["理解 K2 对开发体验的影响", "安全升级现有 Android 项目"]),
      chapter(29, "interview-review", "面试与综合复习", "把类型、泛型、协程和 Flow 组织成专业口语答案。", 95, "高级", ["类型系统", "泛型", "inline", "协程状态机", "结构化并发", "Flow 热冷流"], ["完成高频题系统复盘", "用原理、场景、取舍三层回答问题"]),
    ],
  },
];

export const allChapters = courseUnits.flatMap((unit) =>
  unit.chapters.map((item) => ({ ...item, unitId: unit.id, unitTitle: unit.title, unitLabel: unit.label })),
);

export type ChapterWithUnit = (typeof allChapters)[number];

export function getChapter(slug: string) {
  return allChapters.find((item) => item.slug === slug);
}

export function getAdjacentChapters(slug: string) {
  const index = allChapters.findIndex((item) => item.slug === slug);
  return {
    previous: index > 0 ? allChapters[index - 1] : undefined,
    next: index >= 0 && index < allChapters.length - 1 ? allChapters[index + 1] : undefined,
  };
}

export const totalLessons = allChapters.reduce((total, item) => total + item.lessons.length, 0);
export const totalMinutes = allChapters.reduce((total, item) => total + item.duration, 0);
