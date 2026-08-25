# @deepseek-ai/dsh-task-management

Directory-first task management for automated development work. The package owns task and workspace state, PostgreSQL migrations, primary board columns, auxiliary execution status, and the transition rules used by workers and Host operations.

## Config

```yaml
- id: task-management
  name: '@deepseek-ai/dsh-task-management'
  config:
    databaseConnection: development-postgres
    workerId: worker-1
    schema: dsh_task_management
```

`databaseConnection` selects an existing PostgreSQL entry from the `db-connections` settings namespace. The plugin never stores database credentials. The schema is created by the plugin and is not shared with unrelated application data. `workerId` must be unique for each concurrently running Worker instance.

The service's `migrate()` method creates the initial schema. `TaskWorker` coordinates task and workspace leases, clean-workspace admission, heartbeats, and task execution. `GitTaskController` owns task branch creation, explicit-file commits, validation, merge, and push. `TaskAgentController` creates or resumes the internal development Agent session.

## State model

The board exposes `pending`, `clarifying`, `developing`, `ready_for_test`, and `released`. `executionStatus` carries queueing, user waiting, workspace cleanup, pause, failure, and cancellation details without multiplying board columns. A plan confirmation records the exact document id and revision that authorizes development.

Tasks are bound to one canonical workspace path. A task may run only after the path has no uncommitted Git changes. The service does not stash, preserve, or commit pre-existing changes.

Git branch operations and validation commands are also written to `task_git_operation` and `task_validation_result`, including merged-`dev` validation results.

## Model Experience

### Task records

#### What the model sees

The task Agent receives the selected workspace through Session metadata and runs with the `software-development` Agent preset. The task service does not add a second model prompt layer; task-specific instructions enter the internal Agent session as a user turn.

#### Token effect

Task metadata and the initial task prompt consume the normal Agent request budget. PostgreSQL state and board projections do not add model context.

#### KV Cache effect

No direct effect. The task Agent owns its Session history and request prefix.

## Known Limitations and Deferred Work

- The Worker callback owns the full multi-round prompt protocol and automatic retry classification. The default service now starts the configured Worker after schema migration; production deployments still need explicit PostgreSQL settings and a unique `workerId` per process.
- The directory-first board Remote is available from the task service. The browser board is registered in the Web bundle, but task creation, plan confirmation, questions, feedback, and task-detail Agent controls are not yet wired into the board.
- The initial migration is intentionally additive and does not yet upgrade schema versions beyond version one.
