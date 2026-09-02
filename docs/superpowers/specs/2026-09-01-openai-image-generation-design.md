# OpenAI-Compatible Image Generation Design

## Status

Approved in conversation; implementation is not started.

## Goal

Add opt-in image generation to DeepSeek Harness through an OpenAI Responses/Images-compatible provider. The capability must generate a durable image attachment that is visible to the model, UI, and restored sessions without changing ordinary text generation. The current LLM model metadata declares input modalities only, so this change adds an explicit provider-neutral output modality declaration and carries it through model resolution.

## Scope

The first release supports a provider-neutral image-generation service, one OpenAI-compatible provider, a model-facing `generate_image` tool, and an optional bundle/profile composition. The provider supports the OpenAI Images endpoint and Responses image-generation calls. It does not change the regular `ctx.llm.stream` contract or make image output implicit for text requests.

Platform-specific image-generation policies, editing or masking workflows, multi-image batches, provider-specific arbitrary parameters, and automatic prompt rewriting are deferred unless required by the provider protocol.

## Architecture

The Service Definition package owns `ctx.imageGeneration` and provider-neutral request/result types. The model metadata contract also gains `outputModalities`; the provider and model-resolution path must explicitly declare `image` before the Consumer allows generation. The provider package calls the configured OpenAI-compatible endpoint, parses its response, and hands decoded bytes to the attachment service. The Consumer package registers `generate_image`, validates model-facing arguments and the active route's output capability, invokes the service, and presents a text summary beside an `ImageBlock`.

The provider-neutral result contains a durable `ImageAttachmentRef`, provider and model identifiers, and an optional provider-revised prompt. Provider code owns HTTP protocol and provider error mapping. The attachment service owns byte, media-type, dimension, and pixel validation and durable storage. The tool owns schema, execution authority, and generic presentation.

The optional bundle composes the service, provider, tool, and image-generation Skill. It is not added to shipped base profiles.

## Configuration and credentials

The provider has an explicit configuration section with `provider`, `baseURL`, `api`, `model`, `apiKeyRef`, and validated defaults for size and quality. The entire `image-generation` section is optional. When it is absent, the Consumer resolves the current active LLM route and inherits its provider, endpoint, credential reference, model, and declared output modalities. Inherited generation is allowed only when that route explicitly declares `image` in `outputModalities` and its adapter supports the configured Images or Responses protocol. An explicit image-generation section overrides the inherited route for deployments that use a separate image model. `api` is `images` or `responses`; the provider fails at the earliest resolvable point when an explicit configuration is missing or invalid. Credentials resolve through the existing credentials seam and never enter prompts, session events, or error messages.

The public provider schema exposes only supported OpenAI-compatible fields: prompt, size, quality, background, and output format. Every deployment-varying limit is validated configuration rather than a hardcoded plugin tuning constant. The implementation must not persist or expose third-party URLs as image references.

## Data flow

1. `generate_image` validates the prompt and optional generation fields.
2. The Consumer resolves the explicit image-generation profile, or inherits the current active LLM route when that profile is absent.
3. The Consumer verifies that the resolved model route explicitly declares `image` in `outputModalities` and that its adapter supports the selected API mode.
4. The provider selects `/images/generations` or `/responses` from the configured API mode.
5. The provider accepts supported base64 results or downloads only an HTTPS result URL, then decodes the image.
6. The decoded bytes go through the attachment service's media-type, byte, dimension, and pixel limits.
7. The Consumer returns a structured text result and a durable `ImageBlock` referencing the stored attachment.
8. The tool result and image content follow the existing session-log path and remain available to `read_image` after reload.

No successful image event is published before attachment persistence completes. Failed, cancelled, malformed, oversized, or rejected results do not leave a successful image result in the session.

## Errors and lifecycle

Configuration and credential errors name the setting or credential reference without exposing secrets. Invalid tool arguments fail before a provider request. HTTP 4xx/5xx, rate limits, timeouts, and request IDs map to provider-neutral image-generation errors. Missing image data, unsupported URLs, decode failures, and attachment rejection are recoverable tool errors.

The provider honors cancellation and disposal. Fetches are aborted when the operation or owning fiber is disposed, and no partial attachment is retained. Service, provider, tool, prompt, and Skill registrations are reversible effects and disappear with their owning fibers.

The request prompt, response bytes, download size, pixel count, dimensions, and retained attachment are bounded. Image output is model-visible and therefore must be reconstructable from the session log.

## Verification

Provider wire tests cover Images base64 responses, Responses `image_generation_call`, revised prompts, malformed responses, unsupported URLs, provider failures, timeout, and cancellation. Model-resolution tests cover explicit `outputModalities` propagation and rejection of routes that declare input image support without output image support. Service and tool tests cover schema validation, route capability, attachment limits, errors, structured output, and disposal.

A real Loader composition test uses a fake HTTP provider and deterministic image bytes to verify package composition, prompt/tool registration, image persistence, and disposal. A keyless snapshot pins the assembled system-prompt section, tool schema, and error presentation. An in-process lifecycle test persists and reloads a session containing a generated image without using a real API key. Package typecheck, builds, hygiene, and existing attachment/read-image tests remain required.

## Deferred work

The first release does not provide platform-specific image policies, image editing, masks, batches, arbitrary provider parameters, or implicit image output from ordinary text calls. A later provider can implement the same service without changing the Consumer or Skill contract.
