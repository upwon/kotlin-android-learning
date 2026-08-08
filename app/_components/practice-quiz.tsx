"use client";

import { useState } from "react";

const questions = [
  {
    question: "val users = mutableListOf(\"A\") 之后，哪一项正确？",
    options: ["users.add(\"B\") 会编译失败", "users 可以指向另一个列表", "列表内容可变，但引用不能重新赋值", "val 会让列表深层不可变"],
    answer: 2,
    explanation: "val 固定的是变量引用。MutableList 本身仍然允许增删元素。",
  },
  {
    question: "表达式 name?.length ?: 0 的最终类型是什么？",
    options: ["Int", "Int?", "String", "Unit"],
    answer: 0,
    explanation: "?.length 产生 Int?，Elvis 在 null 时提供 Int，因此整体收口为非空 Int。",
  },
  {
    question: "Kotlin 中 == 和 === 的区别是？",
    options: ["没有区别", "== 比较引用，=== 调 equals", "== 调 equals，=== 比较是否同一引用", "=== 只能比较数字"],
    answer: 2,
    explanation: "== 是空安全的结构相等比较；=== 检查两个引用是否指向同一对象。",
  },
  {
    question: "Fragment ViewBinding 为什么通常使用可空幕后属性？",
    options: ["因为 lateinit 不能用于类", "因为 Binding 在视图生命周期之外确实不存在", "因为 val 不能保存对象", "为了让代码更短"],
    answer: 1,
    explanation: "onDestroyView 后 Binding 必须释放，T? 准确表达了这一生命周期状态。",
  },
  {
    question: "下面哪个说法最准确？ suspend 函数……",
    options: ["一定运行在后台线程", "一定会切换线程", "能够挂起并在之后恢复，不等于自动切线程", "只能从 Activity 调用"],
    answer: 2,
    explanation: "suspend 描述可挂起能力；运行线程由协程上下文和具体挂起点决定。",
  },
  {
    question: "离线优先详情页中，UI 最稳定的数据事实源应该是什么？",
    options: ["Retrofit 返回值", "Fragment 字段", "Room 查询 Flow", "一次性 SharedFlow"],
    answer: 2,
    explanation: "网络 refresh 应先写入 Room，再由 Room Flow 驱动 UI；断网时同一条观察链仍能显示缓存。",
  },
  {
    question: "旋转后不重复执行正在进行的刷新，最关键的状态所有者是？",
    options: ["Fragment View", "ViewModel", "remember", "BroadcastReceiver"],
    answer: 1,
    explanation: "同一导航目的地的 ViewModel 跨配置变化保留 Job 与 StateFlow；View 只需重新收集最新状态。",
  },
  {
    question: "必须在设备重启后继续、且要等联网的同步任务，优先选择？",
    options: ["GlobalScope", "Handler.postDelayed", "WorkManager", "LaunchedEffect"],
    answer: 2,
    explanation: "WorkManager 适合必须完成、带约束、可退避并能跨进程与设备重启恢复的持久任务。",
  },
  {
    question: "Compose 中 remember 与 rememberSaveable 的核心区别是？",
    options: ["前者只保存 String", "后者可借助 Saver 跨配置变化和进程重建恢复", "后者不会重组", "两者完全相同"],
    answer: 1,
    explanation: "remember 只保留在当前 Composition 中；rememberSaveable 会把可保存值交给 SavedStateRegistry 恢复。",
  },
  {
    question: "LaunchedEffect(userId) 的 userId 改变时会发生什么？",
    options: ["旧协程继续并再启动一个", "整个 Activity 重建", "旧协程取消，再以新 key 启动", "只更新变量，不影响协程"],
    answer: 2,
    explanation: "Effect 的 key 定义任务身份；key 变化会取消旧任务并启动新任务，离开 Composition 也会取消。",
  },
  {
    question: "Paging 3 中 cachedIn(viewModelScope) 主要解决什么？",
    options: ["把所有页面永久写入磁盘", "跨旋转复用同一代 PagingData", "自动处理所有 API 错误", "替代 Room"],
    answer: 1,
    explanation: "cachedIn 共享并缓存 ViewModel 生命周期内的分页代；离线持久缓存仍应由 Room 与 RemoteMediator 负责。",
  },
  {
    question: "Compose 自适应页面中，哪项通常不应写入 ViewModel？",
    options: ["选中的 userId", "搜索 query", "当前窗口宽度分类", "待同步收藏操作"],
    answer: 2,
    explanation: "窗口宽度是随分屏和折叠实时变化的派生 UI 环境；选择和业务输入才需要可恢复状态。",
  },
];

export function PracticeQuiz() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const item = questions[current];

  function choose(index: number) {
    if (selected !== null) return;
    setSelected(index);
    if (index === item.answer) setScore((value) => value + 1);
  }

  function next() {
    if (current === questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrent((value) => value + 1);
    setSelected(null);
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz-finish panel">
        <span className="eyebrow">练习完成</span>
        <strong>{score} / {questions.length}</strong>
        <h2>{percent >= 80 ? "基础很稳，可以继续前进" : "已经找到值得复习的地方"}</h2>
        <p>答题记录暂不计入章节进度，你可以随时重新练习。</p>
        <button className="primary-button" type="button" onClick={restart}>再做一次</button>
      </div>
    );
  }

  return (
    <div className="quiz-card panel">
      <div className="quiz-topline"><span>第 {current + 1} 题 / {questions.length}</span><span>得分 {score}</span></div>
      <div className="quiz-progress"><span style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
      <h2>{item.question}</h2>
      <div className="quiz-options">
        {item.options.map((option, index) => {
          const revealed = selected !== null;
          const className = revealed && index === item.answer ? "correct" : revealed && index === selected ? "wrong" : "";
          return <button type="button" className={className} key={option} onClick={() => choose(index)} disabled={revealed}><span>{String.fromCharCode(65 + index)}</span>{option}</button>;
        })}
      </div>
      {selected !== null && (
        <div className={selected === item.answer ? "quiz-explanation correct" : "quiz-explanation"}>
          <strong>{selected === item.answer ? "回答正确" : "再想一步"}</strong>
          <p>{item.explanation}</p>
          <button className="primary-button" type="button" onClick={next}>{current === questions.length - 1 ? "查看结果" : "下一题"}</button>
        </div>
      )}
    </div>
  );
}
