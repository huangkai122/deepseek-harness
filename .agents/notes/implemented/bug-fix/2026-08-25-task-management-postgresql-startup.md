# Agent Note: Make task-management PostgreSQL startup reliable

Status: implemented

English | [中文](2026-08-25-task-management-postgresql-startup.zh.md)

## Problem

The Web profile could not activate task-management after its Host entry was added. Its generated Typert module imported `zod` without a package-level runtime declaration, its schema migration sent multiple PostgreSQL statements through a batch operation that assumed the driver returned one result object, and the Remote BFF did not mount the task-management Remote contribution.

## Decision

Task-management declares `zod` as a production dependency. The PostgreSQL provider normalizes single-statement and multi-statement query results before reading rows and sums affected row counts across the statements in one batch operation.
The API Remote assembly imports and mounts the generated task-management Remote contribution and declares the package in its peer and development dependencies.

## Alternatives considered

**Split the task-management schema into separate batch operations.** Rejected because the provider owns transaction execution and other callers may legitimately submit multi-statement SQL operations.

**Rely on a hoisted `zod` installation.** Rejected because package runtime imports must be satisfied by declared dependencies for isolated installs and built plugin loading.

**Let the task-management Client call an unmounted Remote namespace.** Rejected because Remote namespaces are selected and mounted centrally by the API assembly; a client-side injection cannot create the Host contribution it consumes.

## Consequences

The generated task-management Typert module can load from its package runtime, and its PostgreSQL schema migration handles the driver’s multi-result response without `undefined.length` failures. Batch callers receive the final statement’s rows and the aggregate affected-row count.
The Web Client can resolve `remote.taskManagement` after the API Remote assembly mounts the generated contribution.

## Testing

Task-management and PostgreSQL provider TypeScript builds passed, both runtime bundles rebuilt, and `pnpm dsh web --no-open` reached `http://127.0.0.1:3080`.
