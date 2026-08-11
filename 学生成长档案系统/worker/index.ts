export interface Env {
  DB: D1Database;
  APP_ORIGIN: string;
  SESSION_COOKIE_SECURE: string;
  SETUP_SECRET?: string;
}

export default {
  async fetch(): Promise<Response> {
    return Response.json({ error: { code: 'NOT_FOUND', message: '接口不存在' } }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
