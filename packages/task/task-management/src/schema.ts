/** PostgreSQL schema owned by task-management. */
export const TASK_SCHEMA_VERSION = 1

/**
 * Build the initial schema migration using a validated identifier.
 * @param schema - PostgreSQL schema name.
 * @returns One transactional migration statement.
 */
export function initialSchemaSql(schema: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new TypeError('task-management schema must be lowercase snake_case')
  const q = `"${schema}"`
  return `
CREATE SCHEMA IF NOT EXISTS ${q};
CREATE TABLE IF NOT EXISTS ${q}.schema_version (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ${q}.workspace (
  id text PRIMARY KEY,
  canonical_path text NOT NULL UNIQUE,
  display_name text NOT NULL,
  default_branch text NOT NULL,
  remote_name text NOT NULL,
  remote_branch text NOT NULL,
  validation_commands_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ${q}.task (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES ${q}.workspace(id),
  title text NOT NULL,
  description text NOT NULL,
  primary_status text NOT NULL,
  execution_status text NOT NULL,
  development_branch text,
  agent_session_id text,
  confirmed_plan_document_id text,
  confirmed_plan_revision integer,
  revision bigint NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (revision > 0)
);
CREATE INDEX IF NOT EXISTS task_board_idx ON ${q}.task(workspace_id, primary_status, execution_status, updated_at);
CREATE TABLE IF NOT EXISTS ${q}.task_status_history (
  id bigserial PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  from_primary_status text,
  from_execution_status text,
  to_primary_status text NOT NULL,
  to_execution_status text NOT NULL,
  reason text,
  revision bigint NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ${q}.task_document (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  kind text NOT NULL,
  revision integer NOT NULL,
  content text NOT NULL,
  created_by_session_id text,
  created_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  UNIQUE(task_id, kind, revision)
);
CREATE TABLE IF NOT EXISTS ${q}.task_question (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  question text NOT NULL,
  options_json jsonb NOT NULL,
  allow_free_text boolean NOT NULL,
  status text NOT NULL,
  revision integer NOT NULL,
  created_at timestamptz NOT NULL,
  answered_at timestamptz
);
CREATE TABLE IF NOT EXISTS ${q}.task_question_answer (
  id bigserial PRIMARY KEY,
  question_id text NOT NULL REFERENCES ${q}.task_question(id),
  answer_json jsonb NOT NULL,
  session_id text,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ${q}.task_comment (
  id bigserial PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  author_kind text NOT NULL,
  content text NOT NULL,
  session_id text,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ${q}.task_test_feedback (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  content text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  resolved_at timestamptz
);
CREATE TABLE IF NOT EXISTS ${q}.task_run (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  kind text NOT NULL,
  status text NOT NULL,
  worker_id text,
  agent_session_id text,
  commit_sha text,
  dev_commit_sha text,
  error_kind text,
  error_message text,
  metadata_json jsonb NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS ${q}.task_lease (
  task_id text PRIMARY KEY REFERENCES ${q}.task(id),
  worker_id text NOT NULL,
  lease_token text NOT NULL UNIQUE,
  acquired_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ${q}.workspace_lease (
  workspace_id text PRIMARY KEY REFERENCES ${q}.workspace(id),
  task_id text NOT NULL UNIQUE REFERENCES ${q}.task(id),
  worker_id text NOT NULL,
  lease_token text NOT NULL UNIQUE,
  acquired_at timestamptz NOT NULL,
  heartbeat_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ${q}.task_git_operation (
  id bigserial PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  kind text NOT NULL,
  status text NOT NULL,
  branch text,
  commit_sha text,
  dev_commit_sha text,
  changed_files_json jsonb NOT NULL,
  output text,
  created_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS ${q}.task_validation_result (
  id bigserial PRIMARY KEY,
  task_id text NOT NULL REFERENCES ${q}.task(id),
  kind text NOT NULL,
  command text NOT NULL,
  cwd text NOT NULL,
  commit_sha text,
  exit_code integer,
  output text NOT NULL,
  passed boolean NOT NULL,
  created_at timestamptz NOT NULL
);
INSERT INTO ${q}.schema_version(version) VALUES (${TASK_SCHEMA_VERSION}) ON CONFLICT (version) DO NOTHING;
`
}
