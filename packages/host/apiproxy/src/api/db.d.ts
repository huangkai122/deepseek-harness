/** Database connection test API exposed to configuration UIs. */
import type { DbConnectionConfig, ConnectionTestResult } from '@deepseek-ai/dsh-db-connector/types';
import type { RpcRequest, RpcResponse } from './rpc.ts';
/** Database-domain unary methods. */
export interface DbApi {
    /** Test one database connection without storing its credentials. */
    testConnection(request: RpcRequest<{
        config: DbConnectionConfig;
    }>): Promise<RpcResponse<ConnectionTestResult>>;
}
//# sourceMappingURL=db.d.ts.map