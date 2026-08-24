# Agent Note: Treat same-mode sandbox requests as idempotent

Status: implemented

English | [中文](2026-08-24-same-mode-sandbox-request.zh.md)

## Problem

The model-facing tools advertise a composition-global `sandbox_permissions` enum while the effective sandbox mode is resolved per call from the session. A call in `danger-full-access` could therefore repeat `danger-full-access`, or a caller could include the current mode without a justification. The shared escalation path treated that request as a non-widening escalation and rejected it before the operation ran.

## Decision

The shared escalation resolver returns the effective mode immediately when the requested mode equals it or names `workspace-write` while the effective mode is `danger-full-access`. Bash, PowerShell, and filesystem tools resolve the standing policy before validating escalation arguments, so same-mode requests bypass approval and justification validation. Requests for a genuinely different mode retain paired-argument validation and the strictly-wider, approval-gated path; Full access is never downgraded for one call.

## Alternatives considered

**Remove `sandbox_permissions` from Full access tool schemas.** Rejected because schemas are registry-global while session mode is per call; removing the field would strand calls whose session later switches to a confined mode.

**Allow every non-widening request.** Rejected because arbitrary downgrades must remain fail-closed; only the recognized `workspace-write` request under Full access is treated as redundant and does not alter the operation's policy.

**Normalize the request only in the outer UI.** Rejected because direct tool callers and non-browser transports must receive the same safety behavior.

## Consequences

Repeated current-mode parameters, and redundant `workspace-write` parameters under Full access, no longer trigger approval or fail because `justification` is absent or blank. Genuine widening still requires a non-empty justification and approval, while arbitrary downgrade and malformed requests retain their existing errors. The behavior is shared by bash, pwsh, and fs mutation tools.

## Testing

The shared escalation, bash, pwsh, and fs tool tests pass together with 146 assertions.
