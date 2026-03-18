import type { DrizzleD1Database } from "drizzle-orm/d1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDb = DrizzleD1Database<any>;

export type AppEnv = {
  Bindings: {
    DB: D1Database;
    ASSETS: Fetcher;
  };
  Variables: {
    db: AppDb;
    requestId: string;
    userId?: string;
  };
};
