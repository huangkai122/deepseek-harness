# Agent Note: Constrain task answer remote JSON

Status: implemented

English | [中文](2026-08-24-task-answer-json-boundary.zh.md)

## Problem

The task-management `answerQuestion` remote method exposed an arbitrary `unknown` answer in both its request and response types. Typert rejects unconstrained unknown data at remote boundaries because the value cannot be described or validated as wire JSON.

## Decision

Task answers use the shared `JsonValue` type. Database reads validate and detach the stored JSON with `snapshotJsonValue` before returning the remote result; invalid stored data fails loudly.

## Alternatives considered

**Cast `unknown` through the remote method.** Rejected because it would hide an unrepresentable wire value from Typert and defer failure to transport time.

**Use a task-specific answer union.** Rejected because the task question model permits arbitrary JSON answers and the shared JSON vocabulary already expresses that boundary.

## Consequences

Typert can generate the host remote contract, while persisted answers retain their existing JSON flexibility. Malformed database values now produce an explicit task-management error instead of crossing the remote boundary.

## Testing

Task-management typecheck, bundle, and tests pass; the host TypeScript and Typert build also pass.
