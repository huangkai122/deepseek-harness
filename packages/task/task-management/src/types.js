/** Brand a workspace id after it has crossed the persistence boundary. */
export function WorkspaceId(value) { return value; }
/** Brand a task id after it has crossed the persistence boundary. */
export function TaskId(value) { return value; }
/** Brand a lease token after it has crossed the persistence boundary. */
export function LeaseToken(value) { return value; }
/** Whether a failure may be retried without human intervention. */
export function isAutomaticRetryFailure(kind) {
    return kind === 'network_error'
        || kind === 'worker_crash'
        || kind === 'temporary_database_error';
}
//# sourceMappingURL=types.js.map