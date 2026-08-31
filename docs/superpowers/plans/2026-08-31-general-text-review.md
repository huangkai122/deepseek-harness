# 通用文本审稿实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 DeepSeek Harness 中实现当前会话级通用文本审稿、连续复审、人工确认标准变更和结构化工作流结果。

**Architecture:** 新增 `review` 领域服务包承载标准版本、审稿状态和会话事件；新增 `tool-review` 消费该服务并注册模型工具；新增 runtime-registration Skill 提供审稿方法和稳定输出格式。全局正式标准使用现有 settings 持久化，当前审稿事实使用 SessionEventMap 事件持久化，独立 `review` bundle 显式启用全部相关组件。

**Tech Stack:** TypeScript ESM、Cordis 插件、Schemastery、Zod、`@deepseek-ai/dsh-session` 事件日志、`@deepseek-ai/dsh-settings` 用户设置、`@deepseek-ai/dsh-tools`、Vitest、Loader 真实组合测试和 keyless snapshot。

**Spec:** `docs/superpowers/specs/2026-08-31-general-text-review-design.md`

## Global Constraints

- 审稿上下文只绑定当前会话；第一版不实现跨会话内容项目。
- 全局标准必须人工确认后生效；候选标准不能直接修改正式标准。
- 一次审稿固定使用启动时的标准版本；全局更新不改变当前审稿历史。
- “建议通过”不是终态；只有小编明确确认后才进入“已确认通过”。
- 影响模型判断的文本、标准版本、意见状态和确认结果必须可由会话日志重建。
- 模型可见操作必须在执行处校验状态，不能只依赖 Skill 指令或工具 schema。
- 插件为可选组合项，不修改所有 profile 的默认行为；所有注册必须可撤销。
- 每个新增包必须提供 `./invariant`，并为注册贡献覆盖 HMR/disposal 测试。
- 产品可见行为必须有 Loader 真实组合测试；模型可见文本使用 snapshot 或 assembled transcript 验证。
- 修改包 README、JSDoc、事件声明、工具目录和相关 Agent Note 时保持同步。

---

## File Map

**新增领域服务包 `packages/review/review/`：**

- `package.json`、`tsconfig.json`、`tsdown.config.ts`：包元数据、聚合引用和构建入口。
- `src/types.ts`：标准、意见、轮次、候选变更、结果和状态的纯类型。
- `src/runtime.ts`：品牌化 `ReviewId`、错误码和事件版本常量。
- `src/domain.ts`：SessionEventMap payload、标准版本引用和状态变更数据类型，并显式声明 `@deepseek-ai/dsh-session` 的 `SessionEventMap` 扩展。
- `src/fold.ts`：从审稿事件折叠当前会话状态的纯函数。
- `src/index.ts`：`ctx.reviews` 服务、settings 绑定、事件追加和操作前置条件校验；settings 是全局标准的权威，session event 只保存已提交标准版本的审计引用。
- `src/invariant.ts`：审稿事件顺序、固定标准版本和终态关系的运行时不变量。
- `tests/fold.spec.ts`、`tests/review.spec.ts`、`tests/invariant.spec.ts`：纯折叠、状态转换、拒绝路径和不变量测试。
- `README.md`、`README.zh.md`：服务、配置、持久化、模型体验和限制。

**新增模型工具包 `packages/review/tool-review/`：**

- `package.json`、`tsconfig.json`、`tsdown.config.ts`：工具包元数据和构建入口。
- `src/index.ts`：注册 `start_review`、`review_revision`、`propose_standard_draft`、`confirm_standard_change`、`confirm_review_passed`、`get_review_state`。
- `src/authority.ts`：确认直接人类请求和当前 agent/session 归属的执行边界。
- `src/invariant.ts`：工具注册和输出关系的运行时不变量。
- `tests/tool-review.spec.ts`、`tests/loader-composition.spec.ts`：工具 schema、执行拒绝、真实 Loader 组合测试。
- `README.md`、`README.zh.md`：模型可见操作和结构化结果。

**新增 runtime-registration Skill 包：**

- `packages/review/review-skill/package.json`、`packages/review/review-skill/src/index.ts`：注册 bundled `review` Skill，不依赖 filesystem provider 的目录发现。
- `packages/review/review-skill/src/content.ts`：默认通用文本审稿流程、标准草案确认、首轮/复审输出和候选规则提炼指令。
- `packages/review/review-skill/README.md`、`README.zh.md`：资源安装和组合方式。

**Bundle 与文档：**

- Create: `packages/bundle/review/cordis.patch.yml`、`packages/bundle/review/package.json`、`packages/bundle/review/README.md`：显式同时装配 `dsh-review`、`dsh-tool-review` 和 runtime `review` Skill；不把半启用的审稿行加入 `base`。
- `packages/client/ui-tool/`：仅检查现有 generic/tool presentation 注册，不修改 UI；六个工具不新增专用 UI 节点。
- `docs/subsystems/review.md`、`docs/subsystems/review.zh.md`：新增审稿服务和 SessionEventMap 的 subsystem reference。
- `.agents/notes/implemented/feature/2026-08-31-review-plugin-skill-separation.md`：记录插件/Skill 分工、固定标准版本和人工确认策略。
- `examples/acp-agent/tests/review.snapshot.ts`、`examples/acp-agent/tests/snapshots/review/input.json`、`examples/acp-agent/tests/snapshots/review/system-prompt.expected.md`、`examples/acp-agent/tests/snapshots/review/tool-schemas.expected.json`：加入 keyless 真实组合审稿 transcript。

---

### Task 1: 建立审稿领域包和纯数据折叠

**Files:**
- Create: `packages/review/review/package.json`
- Create: `packages/review/review/tsconfig.json`
- Create: `packages/review/review/tsdown.config.ts`
- Create: `packages/review/review/src/types.ts`
- Create: `packages/review/review/src/runtime.ts`
- Create: `packages/review/review/src/domain.ts`
- Create: `packages/review/review/src/fold.ts`
- Test: `packages/review/review/tests/fold.spec.ts`

**Interfaces:**
- Produces `ReviewId`, `ReviewStatus`, `ReviewStandard`, `ReviewStandardChange`, `ReviewFinding`, `ReviewRevision`, `ReviewSnapshot` and `ReviewEventMap` payload types.
- In `src/domain.ts`, explicitly declaration-merges `@deepseek-ai/dsh-session`'s `SessionEventMap`; every event has event JSDoc with `@mode`, payload `@param`, and the required durable/ignorable semantics.
- Produces `emptyReviewFoldState()` and `applyReviewEvent(state, event)` for deterministic replay.
- Uses event discriminants `review/start`、`review/revision`、`review/standard-candidate`、`review/standard-confirmed`、`review/standard-rejected`、`review/passed`。

- [ ] **Step 1: Write failing fold tests** covering empty state, start with fixed standard version, revision adding resolved and unresolved findings, candidate change, confirmation, rejection, and passed terminal state.
- [ ] **Step 2: Run `pnpm vitest run packages/review/review/tests/fold.spec.ts` and verify the missing package/types fail.**
- [ ] **Step 3: Implement the package skeleton and pure JSON-compatible types.** Brand only opaque cross-boundary IDs; keep `src/types.ts` runtime-free.
- [ ] **Step 4: Implement event payload codecs and `applyReviewEvent` as a last-event deterministic fold with explicit discriminant handling.** Reject malformed durable payloads at decode boundaries and preserve state identity for unrelated events.
- [ ] **Step 5: Run the focused fold tests and `pnpm exec tsc -p packages/review/review/tsconfig.json --noEmit`.**
- [ ] **Step 6: Commit `feat: add review domain event fold`.**

### Task 2: Implement the session review service and global standard persistence

**Files:**
- Create: `packages/review/review/src/index.ts`
- Create: `packages/review/review/src/invariant.ts`
- Create: `packages/review/review/tests/review.spec.ts`
- Create: `packages/review/review/tests/invariant.spec.ts`
- Modify: `packages/review/review/src/domain.ts`
- Modify: `packages/review/review/src/runtime.ts`

**Interfaces:**
- Produces `ctx.reviews` with `startReview(text, options?)`, `reviewRevision(textOrResponse)`, `proposeStandardDraft(standard)`, `confirmStandardChange(candidateId, decision)`, `confirmReviewPassed()`, `getReviewState()`, and `getStandardState()`.
- Every mutating method derives the current agent/session from the initiator scope, appends a validated event, then publishes derived state.
- The settings document `{ activeVersion, versions }` is the global-standard authority. A confirmed settings CAS write commits a new version; the session event records only the committed version and digest as an audit reference. If event append fails, the service attempts a compensating settings CAS restore and returns an error; if restore fails, it records a durable diagnostic and refuses to claim an atomic update.

- [ ] **Step 1: Add failing service tests** for starting a non-empty review, rejecting empty text, binding to one session, fixing the starting standard version, creating revisions, rejecting operations without an active review, and preventing mutation after confirmed pass.
- [ ] **Step 2: Add failing persistence tests** for candidate confirmation creating exactly one new global version in `{ activeVersion, versions }`, rejection leaving the current version unchanged, settings CAS conflicts, event-append failure triggering compensating restore, and restore failure producing a diagnostic without an atomicity claim.
- [ ] **Step 3: Run the focused service tests and verify failures identify missing service behavior.**
- [ ] **Step 4: Implement `ReviewService` as an event-backed service patterned after `GoalService`.** Maintain a per-Session cache, resync from the session log, validate all text and IDs at the service boundary, and append only complete JSON payloads.
- [ ] **Step 5: Implement standard version resolution and settings persistence.** `proposeStandardDraft(standard)` appends a session candidate; only `confirmStandardChange` performs the settings CAS and publishes the new active version. Later confirmations increment monotonically and preserve prior versions in `{ activeVersion, versions }`.
- [ ] **Step 6: Implement transition checks:** one active review per session, revisions only before confirmed pass, candidate confirmation only for a current candidate, and `confirmReviewPassed()` only after status `recommended_pass`.
- [ ] **Step 7: Implement the package invariant to verify event ordering, session ownership, fixed standard version, and no revision after `review/passed`; register the invariant manifest entry.**
- [ ] **Step 8: Run `pnpm vitest run packages/review/review/tests` and `pnpm exec tsc -p packages/review/review/tsconfig.json --noEmit`.**
- [ ] **Step 9: Commit `feat: add event-backed review service`.**

### Task 3: Add model-facing review tools and structured result rendering

**Files:**
- Create: `packages/review/tool-review/package.json`
- Create: `packages/review/tool-review/tsconfig.json`
- Create: `packages/review/tool-review/tsdown.config.ts`
- Create: `packages/review/tool-review/src/index.ts`
- Create: `packages/review/tool-review/src/authority.ts`
- Create: `packages/review/tool-review/src/invariant.ts`
- Create: `packages/review/tool-review/tests/tool-review.spec.ts`
- Create: `packages/review/tool-review/tests/loader-composition.spec.ts`

**Interfaces:**
- Produces model tools `start_review`, `review_revision`, `propose_standard_draft`, `confirm_standard_change`, `confirm_review_passed`, and `get_review_state`.
- `propose_standard_draft` passes the Skill-generated standard to `ctx.reviews.proposeStandardDraft`; `start_review` requires an active confirmed standard version and never silently activates a draft.
- Every tool returns `{ status, reviewId, revision, blockingIssues, suggestions, candidateStandardChanges }` where applicable, plus concise user-facing text rendered from the same JSON value.
- Consumes `ctx.reviews`, `ctx.agents`, `ctx.tools`, `ctx.systemPrompt`, and direct-human authority information.

- [ ] **Step 1: Write failing tool tests** for parameter schemas, stable output, direct human confirmation requirements, invalid current-state operations, and exact status mapping.
- [ ] **Step 2: Run `pnpm vitest run packages/review/tool-review/tests/tool-review.spec.ts` and verify failure.**
- [ ] **Step 3: Implement tool definitions with execution-time checks.** Do not expose UI or transport terms in descriptions; describe text, findings, standards, candidate changes, and confirmation actions from the model’s perspective.
- [ ] **Step 4: Implement `authority.ts` so standard confirmation and review pass require a direct top-level human request, while ordinary review and revision follow the current agent/session.
- [ ] **Step 5: Add generic tool presentation metadata without a custom UI node.** Ensure results remain useful in headless and Web assemblies.
- [ ] **Step 6: Implement the package invariant and disposal assertions for all six registrations.**
- [ ] **Step 7: Run focused tool tests and `pnpm exec tsc -p packages/review/tool-review/tsconfig.json --noEmit`.**
- [ ] **Step 8: Commit `feat: add model-facing review tools`.**

### Task 4: Add and register the default review Skill

**Files:**
- Create: `packages/review/review-skill/package.json`
- Create: `packages/review/review-skill/src/index.ts`
- Create: `packages/review/review-skill/src/content.ts`
- Create: `packages/review/review-skill/README.md`
- Create: `packages/review/review-skill/README.zh.md`
- Create: `packages/bundle/review/package.json`
- Create: `packages/bundle/review/cordis.patch.yml`
- Create: `packages/bundle/review/README.md`

**Interfaces:**
- Produces the runtime plugin `review` with model invocation enabled and a concise catalog description.
- `src/content.ts` contains the default instructions; `src/index.ts` calls `ctx.skills.register({ name: 'review', ... })`, so the Skill is available only when the review bundle is composed and cannot advertise tools that are absent.
- Skill instructions call the six review tools, define the stable report sections, require a fixed standard version per review, and prohibit automatic standard publication or pass confirmation.

- [ ] **Step 1: Write a keyless instruction fixture** asserting the Skill proposes the initial default standard through `propose_standard_draft` and requests human confirmation before `start_review` treats it as active.
- [ ] **Step 2: Implement `src/content.ts` and register it from `src/index.ts` with `ctx.skills.register`.** Include首轮审稿、复审、意见状态、候选标准、人工确认和建议通过输出规则；keep instructions task-focused and avoid implementation vocabulary.
- [ ] **Step 3: Implement `packages/bundle/review/cordis.patch.yml` and package metadata.** Compose `dsh-review`, `dsh-tool-review`, and the runtime `review` Skill together; do not add partial rows to `base`.
- [ ] **Step 4: Run the Skill registration tests and verify the bundled definition renders with the canonical `<skill_content>` wrapper.**
- [ ] **Step 5: Commit `feat: add bundled review skill`.**

### Task 5: Assemble the optional profile and verify end-to-end session behavior

**Files:**
- Modify: `packages/bundle/review/cordis.patch.yml`
- Modify: `packages/bundle/review/package.json`
- Create: `examples/acp-agent/tests/review.snapshot.ts`
- Create: `examples/acp-agent/tests/snapshots/review/input.json`
- Create: `examples/acp-agent/tests/snapshots/review/system-prompt.expected.md`
- Create: `examples/acp-agent/tests/snapshots/review/tool-schemas.expected.json`
- Modify: snapshot manifest files only if the existing snapshot harness requires registration

**Interfaces:**
- Produces a Loader-composed assembly containing the independent `review` bundle, which simultaneously provides `dsh-review`, `dsh-tool-review`, and the runtime `review` Skill.
- Verifies the durable transcript and structured tool results without using a hand-built Context as the only test.

- [ ] **Step 1: Add a real-composition fixture** that boots the `review` bundle through Loader, proposes the initial standard, confirms it, submits a first review request, submits a revision, proposes a candidate standard, confirms it, receives `recommended_pass`, and confirms pass.
- [ ] **Step 2: Run `pnpm run test:snapshot -- -t review` and verify the new `review.snapshot.ts` scenario fails before assembly is complete.**
- [ ] **Step 3: Add the optional bundle rows and dependency declarations, preserving row-level config and profile patch semantics.**
- [ ] **Step 4: Update the expected keyless transcript to cover standard version pinning, findings, resolved issues, candidate confirmation, and final pass confirmation.**
- [ ] **Step 5: Add recovery assertions by reloading the session and checking the folded review state and standard version.**
- [ ] **Step 6: Run `pnpm run test:snapshot -- -t review`, the focused package suites, and `pnpm run build`.**
- [ ] **Step 7: Commit `test: cover assembled review workflow`.**

### Task 6: Document the capability and record the architectural decision

**Files:**
- Modify: `packages/review/review/README.md`
- Create: `packages/review/review/README.zh.md`
- Create: `packages/review/tool-review/README.md`
- Create: `packages/review/tool-review/README.zh.md`
- Create: `packages/review/review-skill/README.md`
- Create: `packages/review/review-skill/README.zh.md`
- Modify: `docs/subsystems/review.md`、`docs/subsystems/review.zh.md`
- Create: `.agents/notes/implemented/feature/2026-08-31-review-plugin-skill-separation.md`

**Interfaces:**
- Documents the public service methods, settings namespace, event payload ownership, tool schemas, model experience, token/KV effects, known limitations, and disposal behavior.
- Agent Note records current behavior and why state belongs to the plugin while judgment instructions belong to the Skill.

- [ ] **Step 1: Write package READMEs from the implemented public contracts.** Include canonical Model Experience sections and keep each fact in its owning document.
- [ ] **Step 2: Add the implemented Agent Note in present tense.** Record the fixed standard-version rule, human confirmation requirement, and optional composition decision.
- [ ] **Step 3: Run `pnpm run doc-sync`, `pnpm run verify-doc-budgets`, `pnpm run verify-md-links`, and the package documentation checks.**
- [ ] **Step 4: Commit `docs: document review capability`.**

### Task 7: Run the outgoing-diff verification ladder

**Files:**
- No source changes expected; modify only test fixtures or generated manifests if a check identifies a required synchronized artifact.

**Interfaces:**
- Confirms all source, artifact, documentation, disposal, persistence, and assembled transcript contracts are satisfied.

- [ ] **Step 1: Run `pnpm run test:gui` only if the implementation adds or changes a client renderer; otherwise record that no GUI package changed.**
- [ ] **Step 2: Run focused review tests, Loader composition tests, and review snapshot replay.**
- [ ] **Step 3: Run `pnpm run typecheck` and `pnpm run build` for the new packages and their bundle consumer.**
- [ ] **Step 4: Run `pnpm run lint`, `pnpm run hygiene`, and `pnpm run duplication` for the outgoing diff.**
- [ ] **Step 5: Use `dsh-pre-push-checks` to select any additional required checks, inspect `git diff --check`, and report only commands actually run.**
- [ ] **Step 6: Commit any narrowly scoped verification fixture correction separately, then leave the branch ready for review.**

---

## Plan Self-Review

- **Spec coverage:** user flow is covered by Tasks 2–5; plugin/Skill separation by Tasks 2–4 and 6; current-session scope by Task 2; fixed standard version by Tasks 1–2 and 5; structured workflow result by Task 3; error handling by Tasks 2–3; persistence and replay by Tasks 2 and 5; first-phase exclusions by the absence of cross-session, auto-edit, UI-panel, and async tasks; disposal by Tasks 2–3 and 7.
- **占位检查：** 任务没有未决占位符或未指定的后续实现步骤；每个任务都列出文件、接口、测试、命令和预期结果。
- **Type consistency:** `ctx.reviews` and the six operation names are defined in Task 2 and consumed unchanged by Task 3; `ReviewSnapshot` and the structured status fields are produced by Task 2 and rendered by Task 3; Skill instructions in Task 4 call only the Task 3 operations.
- **Scope check:** the work is one capability seam with a provider/service role, a model-facing consumer, a Skill resource, and an assembled application test. It remains one implementation plan because each task produces an independently testable part of the same review workflow.
