/** Wire schemas for the database configuration API. */
import { z } from 'zod';
/** db.testConnection request payload. */
export declare const dbTestConnectionRequestSchema: z.ZodObject<{
    config: z.ZodObject<{
        type: z.ZodEnum<{
            mysql: "mysql";
            postgresql: "postgresql";
            redis: "redis";
        }>;
        host: z.ZodString;
        port: z.ZodNumber;
        database: z.ZodOptional<z.ZodString>;
        username: z.ZodOptional<z.ZodString>;
        passwordRef: z.ZodOptional<z.ZodString>;
        ssl: z.ZodOptional<z.ZodUnion<readonly [z.ZodBoolean, z.ZodObject<{
            rejectUnauthorized: z.ZodOptional<z.ZodBoolean>;
            ca: z.ZodOptional<z.ZodString>;
            cert: z.ZodOptional<z.ZodString>;
            key: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>]>>;
        pool: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            idleTimeoutMs: z.ZodOptional<z.ZodNumber>;
            connectionTimeoutMs: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        options: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strip>;
}, z.core.$strip>;
/** db.testConnection response value. */
export declare const dbTestConnectionValueSchema: z.ZodObject<{
    success: z.ZodBoolean;
    serverVersion: z.ZodOptional<z.ZodString>;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    error: z.ZodOptional<z.ZodString>;
    diagnostics: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
//# sourceMappingURL=db.schema.d.ts.map