# Agent Note: Resolve database credential references before provider calls

Status: implemented

English | [中文](2026-08-21-database-credential-reference-resolution.zh.md)

## Problem

Database connection settings stored a `passwordRef`, but the database service passed that reference directly to providers without resolving it. The providers consequently created clients without a password, even after the settings UI successfully stored the secret.

## Decision

`DbConnectorService` resolves `passwordRef` for every database operation and passes the resolved secret only through the in-process provider configuration. The wire-facing `DbConnectionConfig` remains reference-only. MySQL, PostgreSQL, and Redis providers consume the resolved password, and their cached client keys include a non-secret password fingerprint so a newly stored password cannot reuse a client created with an earlier credential.

## Alternatives considered

- **Send the password directly from the browser in the database RPC:** rejected because the settings UI already uses the credential-reference seam and database RPC payloads must not carry secret values.
- **Resolve the reference separately in each provider:** rejected because it duplicates credential ownership across providers and leaves future providers vulnerable to the same omission.
- **Keep the existing cache key:** rejected because a client created during a passwordless test could survive a later password update.

## Consequences

Database operations now require the credentials service when a `passwordRef` is present and fail clearly when the reference is unconfigured. Resolved passwords remain in provider memory for the lifetime of their client, while cache keys do not contain the password itself. Credential changes create a new provider client; old idle clients are retained by the existing provider lifecycle until process teardown.
