# Agent Note: 嵌套确认弹窗保持在设置层之上

Status: implemented

[English](2026-09-10-nested-modal-stacking.md) | 中文

## 问题

「设置 → 模型」中的提供方删除确认经由共享的 body portal `Modal` 渲染，而 Settings 外壳自身持有一个 `z-index: 100000` 的全视口覆盖层。因此，确认弹窗默认的 `z-index: 1000` 会把遮罩和控件留在 Settings 覆盖层后面：点击「删除」会使页面变暗，但确认卡片及按钮不可见、不可用。

## 决策

共享 `Modal` 接受可选的 `zIndex` 展示属性。提供该值时，它会将值应用到 body portal 根节点；省略时，现有 CSS Module 层级保持不变。Models 的提供方删除确认传入 `zIndex={100001}`，使卡片和控件位于 Settings 外壳之上，同时不改变其他 Modal 消费方的层级。

## 曾考虑的替代方案

**提高共享 Modal 的默认层级。** 不采用：这会让所有 Modal 都移动到 Settings 外壳之上，改变无关弹窗，并消除调用方明确表达嵌套归属的能力。

**增加第二个 Modal 专用 CSS 类或全局选择器。** 不采用：层级要求属于具体的嵌套弹窗实例，而 prop 让原子组件保持可复用，避免跨包选择器依赖。

**将确认弹窗移入 Settings 覆盖层的标记结构。** 不采用：这会复制共享原子组件已经持有的 portal、遮罩、Escape、焦点和关闭行为。

## 后果

所有现有 Modal 消费方继续使用默认的 `z-index: 1000`。拥有嵌套覆盖层的消费方可以显式选择更高层级，Models 删除确认保持在 `100000` 的 `SettingsRoot` 覆盖层之上。原子组件与 Models 组件测试固定了内联层级值；聚焦组件测试和重新构建的 client artifact 验证了发布路径。

## 验证

修复本地 React 18 peer 链接后，聚焦的 `ui-primitives` 测试通过 27 项，聚焦的 `ui-settings-models` 测试通过 77 项。完整构建成功退出，受影响的 client 类型声明和 bundle 均包含该层级改动。仓库 GUI 与文档通道仍因本改动之外既有的 catalog、graph、README 和翻译问题而为红色。回放 Web 套件已到达现有的 `http://127.0.0.1:3080` 端点并提供重新构建的 shell 与 asset；其浏览器 scaffold 最初缺少 API proxy artifact，补建该 artifact 后又在尚未配置的 `localhost-postgreSQL` task-management 连接处停止，尚未执行到 Models UI。
