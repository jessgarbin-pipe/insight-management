export type AppEnv = {
  Bindings: {
    DB: D1Database;
    CLAUDE_API_KEY: string;
    ADMIN_API_KEY: string;
  };
  Variables: {
    apiKeyName?: string;
  };
};
