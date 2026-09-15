# Agent Note: Nested confirmation modals stay above settings

Status: implemented

English | [中文](2026-09-10-nested-modal-stacking.zh.md)

## Problem

The Settings → Models provider-removal confirmation is rendered through the shared body-portal `Modal` while the Settings shell itself owns a full-viewport overlay at `z-index: 100000`. The confirmation's default modal layer at `z-index: 1000` therefore leaves its mask and controls behind the settings overlay: opening Delete darkens the page, but the confirmation card and buttons are not visible or usable.

## Decision

The shared `Modal` accepts an optional `zIndex` presentation prop. When supplied, it applies that value to the body-portal root; when omitted, the existing CSS-module layer remains unchanged. The Models provider-removal confirmation passes `zIndex={100001}`, placing its card and controls one level above the Settings shell without changing the stacking level of other modal consumers.

## Alternatives considered

**Raise the shared modal default.** Rejected because every modal would move above the Settings shell, changing unrelated dialogs and removing the caller's ability to express nested ownership deliberately.

**Add a second modal-specific CSS class or global selector.** Rejected because the stacking requirement belongs to the nested dialog instance, while a prop keeps the primitive reusable and avoids a cross-package selector dependency.

**Move the confirmation into the Settings overlay markup.** Rejected because it would duplicate portal, mask, Escape, focus, and close behavior that the shared primitive already owns.

## Consequences

All existing modal consumers retain the default `z-index: 1000`. A consumer that owns a nested overlay can select a higher layer explicitly, and the Models deletion confirmation remains above the `SettingsRoot` overlay at `100000`. The primitive and Models component tests pin the inline stacking value; the focused component suites and rebuilt client artifacts verify the shipped path.

## Verification

The focused `ui-primitives` suite passes 27 tests and the focused `ui-settings-models` suite passes 77 tests after repairing the local React 18 peer link. The full build exits successfully and the affected client type declarations and bundles contain the stacking change. The repository GUI and documentation lanes remain red on pre-existing catalog, graph, README, and translation issues outside this change. The replayed Web suite reaches the existing `http://127.0.0.1:3080` endpoint and serves the rebuilt shell and asset; its browser scaffolds initially lacked the API-proxy artifact and, after that artifact was rebuilt, stop at the unrelated unconfigured `localhost-postgreSQL` task-management connection before reaching Models UI.
