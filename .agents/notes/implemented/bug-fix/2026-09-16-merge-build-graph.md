# Agent Note: Restore the merged build graph

Status: implemented

English | [中文](2026-09-16-merge-build-graph.zh.md)

## Problem

The merge retained compatibility packages that origin/master no longer mounts. TypeScript excludes them from the current Client and Host aggregates, but the tsdown workspace still discovered their package configs. The same merge left the compiler-independent Typert protocol and brand packages without deterministic main-entry builds, so stale ignored lib files could satisfy resolution with obsolete exports.

## Decision

The root tsdown workspace keeps the existing empty root entry and applies the default tsdown excludes plus the face-specific compatibility-package exclusions already represented by tsconfig.host.json and tsconfig.client.json. The Typert protocol and brand packages each own a package-local tsdown entry from `lib/types/index.js` to `lib/index.js`, so their published runtime entries are rebuilt from the current TypeScript output. The excluded packages remain installable and their sources are unchanged.

## Alternatives considered

**Build the retained compatibility packages.** Rejected because they were removed from the current product graph and their APIs no longer match the current Host and Client contracts; compiling them would turn a graph-selection defect into an unrelated migration.

**Restore the upstream root `lib/types/{index,invariant,startup}.js` entry globally.** Rejected because this merged checkout also resolves the private root package as a workspace config, which has no root `lib/types` tree and fails before package builds.

**Keep the stale runtime artifacts or add broad resolver fallbacks.** Rejected because ignored build output is not a source of truth; deterministic package-local entries preserve current exports and avoid hiding stale artifacts.

## Consequences

Root Host and Client builds now consume the same package set as their TypeScript aggregates, while independently installable legacy packages are not included in product bundles. A clean build regenerates the protocol and brand runtime entries before consumers use them. The compatibility packages still require a dedicated future migration if they are mounted again.
