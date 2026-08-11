import type { SessionAdmin } from '../shared/contracts';

export interface Env {
  DB: D1Database;
  APP_ORIGIN: string;
  SESSION_COOKIE_SECURE: string;
  SETUP_SECRET?: string;
}

export type AppEnv = {
  Bindings: Env;
  Variables: {
    admin: SessionAdmin;
    sessionTokenHash: string;
  };
};
