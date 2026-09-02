# OpenAI-Compatible Image Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in OpenAI Responses/Images-compatible image-generation capability that inherits the active LLM route by default, persists generated images as durable attachments, and exposes them through a model-facing `generate_image` tool.

**Architecture:** Keep ordinary `ctx.llm.stream` text generation unchanged. Add an explicit `outputModalities` model capability, a provider-neutral `ctx.imageGeneration` service, an OpenAI-compatible provider for Images and Responses protocols, and a tool consumer that returns a durable `ImageBlock`. The optional bundle composes the service, provider, tool, and Skill; absent explicit image configuration resolves the active LLM route.

**Tech Stack:** TypeScript ESM, Cordis plugins, `ctx.llm`, `ctx.credentials`, attachment service, `ctx.tools`, session event persistence, Loader composition tests, Vitest, tsdown, keyless snapshots.

**Spec:** `docs/superpowers/specs/2026-09-01-openai-image-generation-design.md`

## Global Constraints

- The `image-generation` configuration section is optional; absent configuration inherits the current active LLM route.
- Inherited generation requires explicit `outputModalities: ['image']` and an adapter that supports the selected Images or Responses protocol.
- Ordinary `ctx.llm.stream` text requests remain unchanged; image generation is an explicit `generate_image` tool operation.
- Credentials resolve through the existing credentials seam and never enter prompts, session events, or diagnostics.
- Successful image bytes pass attachment media-type, byte, dimension, and pixel limits before publication.
- Third-party URLs are never persisted as image references; only durable `ImageAttachmentRef` values enter session history.
- Every registry contribution is reversible and has disposal coverage.
- Every model-visible image result is reconstructable from the session log and tested through persistence/reload.
- Optional review/image profiles stay out of shipped base defaults.
- New public types and operations have complete JSDoc; package READMEs document Model Experience and Known Limitations.
- Do not modify unrelated dirty files or untracked SDD records in the root checkout.

## File Map

- `packages/llm/llm/src/types.ts`: add provider-neutral output modality metadata and image-generation capability vocabulary.
- `packages/llm/llm/src/index.ts`: carry output modalities through model resolution without changing text stream semantics.
- `packages/llm/llm-deepseek/src/*`, `packages/llm/llm-pi-ai/src/*`: declare and preserve output capability only where the adapter can actually generate images.
- `packages/image/image-generation/`: new Service Definition package for provider-neutral requests/results.
- `packages/image/image-generation-openai/`: new OpenAI-compatible Images/Responses provider package.
- `packages/image/tool-image-generation/`: new model-facing tool Consumer package.
- `packages/bundle/image-generation/`: new optional composition bundle and patch.
- `packages/image/image-generation-skill/`: reusable Skill that instructs the model to call `generate_image` for visual assets.
- `packages/session/*` and attachment-owned modules: only modify the existing projection/event path if image tool results require a missing durable representation; otherwise add focused replay tests at the owning tool/session layer.
- `examples/acp-agent/`: add optional image profile, Loader composition, lifecycle, and keyless snapshot fixtures.
- `docs/subsystems/`, package READMEs, `docs/persistence-catalog.md`, and `.agents/notes/implemented/`: document the shipped contracts and decision rationale.

### Task 1: Add explicit output modality metadata

**Files:**
- Modify: `packages/llm/llm/src/types.ts`
- Modify: `packages/llm/llm/src/index.ts`
- Modify: `packages/llm/llm-deepseek/src/types.ts`, `packages/llm/llm-deepseek/src/adapter.ts`, and catalog/config files that declare model capabilities
- Modify: `packages/llm/llm-pi-ai/src/catalog.ts`, `packages/llm/llm-pi-ai/src/adapter.ts`, and route resolution types
- Test: `packages/llm/llm/tests/service.spec.ts`, `packages/llm/llm-deepseek/tests/adapter.spec.ts`, `packages/llm/llm-pi-ai/tests/catalog.spec.ts`

**Interfaces:**
- Consumes: existing `ModelModality`, `LlmModelInfo`, `LlmResolvedModelInfo`, `LlmAdapter.listModels()`, and `resolveModel()`.
- Produces: `ModelOutputModalityMap` with `'text'` and `'image'`, `ModelOutputModality`, `outputModalities?: readonly ModelOutputModality[]` on model metadata, and exact propagation through list/resolve APIs.

- [ ] **Step 1: Write failing tests** for output modality propagation, explicit empty output capability, and rejection of a route that declares image input but no image output.
- [ ] **Step 2: Run the focused LLM tests** and record the expected missing-property/type failures.
- [ ] **Step 3: Add the merge-extensible output modality types and carry detached output arrays through registration, list, and exact model resolution. Do not infer output from `inputModalities`.
- [ ] **Step 4: Update adapters. The DeepSeek and pi-ai adapters must report image output only for models/configurations that implement the generation protocol; text-only routes remain text-only.
- [ ] **Step 5: Run the focused tests and the owning LLM typecheck; verify no ordinary text stream behavior changed.
- [ ] **Step 6: Commit `feat: declare model image output capability`.

### Task 2: Define the provider-neutral image-generation service

**Files:**
- Create: `packages/image/image-generation/package.json`
- Create: `packages/image/image-generation/tsconfig.json`
- Create: `packages/image/image-generation/tsdown.config.ts`
- Create: `packages/image/image-generation/src/types.ts`
- Create: `packages/image/image-generation/src/index.ts`
- Create: `packages/image/image-generation/src/invariant.ts`
- Test: `packages/image/image-generation/tests/service.spec.ts`, `packages/image/image-generation/tests/invariant.spec.ts`

**Interfaces:**
- Consumes: `ImageAttachmentRef`, `ModelOutputModality`, `ctx.llm`, and the existing Cordis service/invariant conventions.
- Produces: `ImageGenerationRequest` with `prompt`, optional `size`, `quality`, `background`, `outputFormat`, and `signal`; `GeneratedImage` with `attachment`, `provider`, `model`, and optional `revisedPrompt`; `ImageGenerationProvider` with `generate(request): Promise<GeneratedImage>`; and `ImageGenerationRuntime` with provider registration/resolution and `generate(request)`.

- [ ] **Step 1: Write failing service tests** for provider registration, one active provider, missing provider failure, disposal, and result metadata ownership.
- [ ] **Step 2: Run the focused service tests to establish RED.
- [ ] **Step 3: Implement the default-export Service Definition and provider-neutral types. Keep HTTP, OpenAI fields, tool schemas, and credentials out of this package.
- [ ] **Step 4: Add provider registration with atomic validation and reversible effects. A missing provider must fail at the earliest resolvable operation; no silent no-op.
- [ ] **Step 5: Add the package invariant and a real Loader composition/disposal test if the package contributes a runtime service.
- [ ] **Step 6: Run focused tests, package typecheck, and tsdown; commit `feat: add image generation service`.

### Task 3: Implement the OpenAI-compatible Images/Responses provider

**Files:**
- Create: `packages/image/image-generation-openai/package.json`
- Create: `packages/image/image-generation-openai/tsconfig.json`
- Create: `packages/image/image-generation-openai/tsdown.config.ts`
- Create: `packages/image/image-generation-openai/src/config.ts`
- Create: `packages/image/image-generation-openai/src/provider.ts`
- Create: `packages/image/image-generation-openai/src/parse-images.ts`
- Create: `packages/image/image-generation-openai/src/parse-responses.ts`
- Create: `packages/image/image-generation-openai/src/index.ts`
- Create: `packages/image/image-generation-openai/src/invariant.ts`
- Test: `packages/image/image-generation-openai/tests/provider.spec.ts`
- Test: `packages/image/image-generation-openai/tests/parse.spec.ts`

**Interfaces:**
- Consumes: `ImageGenerationProvider`, `ImageGenerationRequest`, `ctx.credentials`, `ctx.attachments`, `ctx.llm` model resolution, and `fetch`.
- Produces: an OpenAI-compatible provider plugin with explicit `api: 'images' | 'responses'`, validated configuration, `apiKeyRef`, route inheritance resolution, and deterministic wire parsing into decoded image bytes plus metadata.

- [ ] **Step 1: Write wire-fixture tests** for Images `b64_json`, Responses `image_generation_call`, revised prompt extraction, provider error payloads, missing image, malformed JSON, unsupported URL, timeout, cancellation, and request headers without secret leakage.
- [ ] **Step 2: Run parser/provider tests to establish RED.
- [ ] **Step 3: Implement explicit config validation for `provider`, `baseURL`, `api`, `model`, `apiKeyRef`, defaults, request limits, and supported generation fields. Reject non-HTTPS downloaded image URLs.
- [ ] **Step 4: Implement Images and Responses request encoding and response parsing. Keep protocol-specific parsing in separate modules and map failures to provider-neutral errors with status/request ID when available.
- [ ] **Step 5: Implement route resolution: explicit image-generation config overrides the active route; absent config inherits the active route and requires `outputModalities` to contain `image`.
- [ ] **Step 6: Decode base64 or downloaded bytes, call attachment validation/storage, and return only durable attachment metadata. Never persist the remote URL.
- [ ] **Step 7: Add cancellation/disposal handling and tests proving no partial attachment is retained.
- [ ] **Step 8: Run wire tests, package typecheck, tsdown, and focused hygiene; commit `feat: add OpenAI image generation provider`.

### Task 4: Add the model-facing `generate_image` tool

**Files:**
- Create: `packages/image/tool-image-generation/package.json`
- Create: `packages/image/tool-image-generation/tsconfig.json`
- Create: `packages/image/tool-image-generation/tsdown.config.ts`
- Create: `packages/image/tool-image-generation/src/index.ts`
- Create: `packages/image/tool-image-generation/src/presentation.ts`
- Create: `packages/image/tool-image-generation/src/invariant.ts`
- Test: `packages/image/tool-image-generation/tests/tools.spec.ts`
- Test: `packages/image/tool-image-generation/tests/loader-composition.spec.ts`

**Interfaces:**
- Consumes: `ctx.imageGeneration`, `ctx.llm.resolveModelInfo()`, `ImageGenerationRequest`, `GeneratedImage`, `ImageBlock`, and `defineTool`.
- Produces: model tool `generate_image` with the schema `{ prompt: string, size?: string, quality?: string, background?: string, output_format?: string }`, generic presentation, structured result text, and one durable `ImageBlock` on success.

- [ ] **Step 1: Write failing schema/executor tests** for valid generation, missing image output capability, invalid prompt/options, provider errors, attachment errors, and generic result presentation.
- [ ] **Step 2: Run the tool tests to establish RED.
- [ ] **Step 3: Implement the tool with model-facing terminology only. Enforce output capability at execution time, not only in the schema or prompt.
- [ ] **Step 4: Return a text summary containing provider/model, dimensions, format, and revised prompt when present, plus the durable image block. Do not return raw HTTP responses or credentials.
- [ ] **Step 5: Add HMR disposal coverage and real Loader composition coverage for tool and system-prompt registration.
- [ ] **Step 6: Run focused tests, package typecheck, and tsdown; commit `feat: add generate image tool`.

### Task 5: Add the optional bundle and image-generation Skill

**Files:**
- Create: `packages/image/image-generation-skill/package.json`
- Create: `packages/image/image-generation-skill/tsconfig.json`
- Create: `packages/image/image-generation-skill/tsdown.config.ts`
- Create: `packages/image/image-generation-skill/src/content.ts`
- Create: `packages/image/image-generation-skill/src/index.ts`
- Create: `packages/image/image-generation-skill/src/invariant.ts`
- Create: `packages/bundle/image-generation/package.json`
- Create: `packages/bundle/image-generation/tsconfig.json`
- Create: `packages/bundle/image-generation/tsdown.config.ts`
- Create: `packages/bundle/image-generation/src/index.ts`
- Create: `packages/bundle/image-generation/src/invariant.ts`
- Create: `packages/bundle/image-generation/cordis.patch.yml`
- Test: `packages/image/image-generation-skill/tests/skill.spec.ts`
- Test: `packages/bundle/image-generation/tests/loader-composition.spec.ts`

**Interfaces:**
- Consumes: `generate_image`, `ctx.skills.register`, service/provider/tool plugin names, and optional profile patch conventions.
- Produces: a Skill that tells the model to use `generate_image` for cover, secondary, and inline assets; an optional bundle composing service/provider/tool/Skill; no base-profile registration.

- [ ] **Step 1: Write failing Skill metadata and bundle composition tests** for registration, prompt content, optional composition, and disposal.
- [ ] **Step 2: Implement concise Skill content that distinguishes inherited active-route generation from explicit image configuration and requires human review of generated assets before publishing.
- [ ] **Step 3: Implement named function-plugin bundle entry and patch rows with package dependencies declared for config resolution.
- [ ] **Step 4: Run Skill metadata, Loader composition, invariant, typecheck, and tsdown checks; commit `feat: add optional image generation profile`.

### Task 6: Add assembled lifecycle, persistence, and snapshot coverage

**Files:**
- Modify/Create: `examples/acp-agent/image-generation.cordis.yml`
- Modify/Create: `examples/acp-agent/image-generation.cordis.snapshot.yml`
- Create: `examples/acp-agent/tests/image-generation.lifecycle.spec.ts`
- Create: `examples/acp-agent/tests/image-generation.snapshot.ts`
- Create: `examples/acp-agent/tests/snapshots/image-generation/input.json`
- Create: `examples/acp-agent/tests/snapshots/image-generation/replay.override.json`
- Create: `examples/acp-agent/tests/snapshots/image-generation/session.jsonl`
- Create: `examples/acp-agent/tests/snapshots/image-generation/system-prompt.expected.md`
- Create: `examples/acp-agent/tests/snapshots/image-generation/tool-schemas.expected.json`
- Modify: `packages/core/session/src/known-event-types.ts` only if a durable image-specific event is proven necessary
- Test: existing attachment/read-image persistence tests plus the new lifecycle and snapshot tests

**Interfaces:**
- Consumes: real Loader composition, `ctx.agents.withInitiator`, `ctx.tools.execute`, attachment store, `SessionPersistence`, and keyless snapshot conventions.
- Produces: deterministic fake HTTP image bytes, dynamic runtime IDs, a persisted and reloaded image-bearing tool result, exact system-prompt/tool-schema sidecars, and disposal assertions.

- [ ] **Step 1: Write a RED lifecycle driver using fake HTTP responses and deterministic PNG bytes. Capture runtime IDs instead of hardcoding them in static replay.
- [ ] **Step 2: Verify whether existing `tool/result` content already persists `ImageBlock`; add a new event only if the existing durable envelope cannot reconstruct the image.
- [ ] **Step 3: Implement create/append/load plus fresh `Session.fromRestore` assertions for the generated image attachment, tool result, route inheritance, and explicit-config override.
- [ ] **Step 4: Add exact keyless snapshot checks for the Skill prompt section, six-or-more tool schema ordering, and provider/tool error presentation.
- [ ] **Step 5: Run the lifecycle and snapshot tests. Record any environment collection blocker without fabricating assertions.
- [ ] **Step 6: Commit `test: cover assembled image generation workflow`.

### Task 7: Document, generate catalogs, and verify the feature

**Files:**
- Modify/Create: `packages/image/image-generation/README.md`, `packages/image/image-generation/README.zh.md`, `packages/image/image-generation-openai/README.md`, `packages/image/image-generation-openai/README.zh.md`, `packages/image/tool-image-generation/README.md`, and `packages/image/tool-image-generation/README.zh.md`
- Modify/Create: `packages/bundle/image-generation/README.md` and `README.zh.md`
- Modify: `docs/subsystems/llm-streaming.md` and `.zh.md` for output modality semantics
- Create: `docs/subsystems/image-generation.md` and `.zh.md`
- Modify: `docs/subsystems/README.md`, `.zh.md`, and i18n pairing manifests
- Modify: `docs/persistence-catalog.md` only if new session events exist
- Create: `.agents/notes/implemented/architecture/YYYY-MM-DD-openai-image-generation.md` and bilingual pairing record
- Modify: `scripts` generated catalogs only through their generator
- Test: `pnpm run doc-sync`, `pnpm run verify-type-equiv`, `pnpm run verify-cordis-catalog`, `pnpm run verify-doc-budgets`, `pnpm run verify-md-links`

**Interfaces:**
- Consumes: shipped package contracts, generated Cordis catalog, image output modality declarations, lifecycle/snapshot evidence, and docs tier rules.
- Produces: current bilingual package contracts, subsystem reference, implemented architecture note, generated API catalog, and explicitly recorded limitations including provider support and real API credentials.

- [ ] **Step 1: Write package and subsystem documentation from the implemented public contracts, including canonical Model Experience and Known Limitations sections.
- [ ] **Step 2: Add the Agent Note in present tense with Problem, Decision, Alternatives considered, Consequences, and required verification.
- [ ] **Step 3: Regenerate catalog/type-equiv/persistence artifacts; never hand-edit generated English regions.
- [ ] **Step 4: Run doc-sync and focused docs gates, then fix only feature-specific failures.
- [ ] **Step 5: Commit `docs: document image generation capability`.

### Task 8: Final verification and branch review

**Files:**
- Modify: `.superpowers/sdd/2026-09-01-openai-image-generation/task-8-report.md` only for verification evidence
- Test: focused package tests, Loader composition/lifecycle/snapshot tests, package typecheck/build/tsdown, `dsh-pre-push-checks`, `git diff --check`, lint, hygiene, duplication, and change-scope

**Interfaces:**
- Consumes: all prior task outputs and the verified merge base.
- Produces: a final report separating feature regressions from pre-existing repository/environment failures, with no untracked implementation files or accidental generated churn.

- [ ] **Step 1: Confirm branch, merge base, clean tracked/staged state, and complete outgoing scope.
- [ ] **Step 2: Run the narrow tests and builds for every changed package and assembled example.
- [ ] **Step 3: Run `dsh-pre-push-checks` and the relevant docs/catalog/hygiene gates once; record exact command results.
- [ ] **Step 4: Inspect the final diff for credential leakage, implicit route fallback, non-durable image blocks, missing disposal, and changes outside approved scope.
- [ ] **Step 5: Fix any feature-specific regression in a separate commit and rerun its owning checks.
- [ ] **Step 6: Append the final verification report and conclude readiness without claiming blocked full-suite checks passed.

## Spec Coverage Self-Review

- Provider-neutral service and three-role capability: Tasks 2, 3, and 4.
- OpenAI Images and Responses protocols: Task 3.
- Optional configuration and active-route inheritance: Tasks 1, 3, and 4.
- Explicit output capability: Task 1 and Task 4.
- Credentials, bounds, HTTPS URL handling, and secret-free errors: Task 3.
- Durable attachment and session reconstruction: Tasks 3 and 6.
- Cancellation, disposal, and no partial result: Tasks 2, 3, and 4.
- Optional bundle and Skill: Task 5.
- Loader, keyless snapshot, lifecycle, and regression evidence: Task 6.
- Bilingual docs, Agent Note, generated catalogs, and limitations: Task 7.
- Final verification and baseline failure separation: Task 8.

## Plan Self-Review

- No unresolved interface placeholder remains; each later task consumes named types or plugin contracts from an earlier task.
- The plan keeps image generation outside ordinary text streaming and makes output capability explicit rather than inferring it from image input.
- The plan does not introduce a durable event until Task 6 proves the existing tool-result envelope insufficient.
- Static replay does not hardcode runtime attachment IDs; dynamic lifecycle execution covers those values.
- The plan preserves optional composition and does not alter shipped base profiles.
- The plan requires focused tests for every acceptance path and records known environment blockers without treating them as passing evidence.
