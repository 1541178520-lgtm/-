import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { requireSession } from './lib/auth';
import { ApiException, apiError } from './lib/http';
import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import tagRoutes from './routes/tags';
import scoreRoutes from './routes/scores';
import studyRecordRoutes from './routes/study-records';
import courseRecordRoutes from './routes/course-records';
import archiveRoutes from './routes/archive';
import attendanceRoutes from './routes/attendance';
import type { AppEnv, Env } from './types';

export type { Env } from './types';

const app = new Hono<AppEnv>();

app.use('*', secureHeaders({
  crossOriginResourcePolicy: 'same-origin',
  referrerPolicy: 'same-origin',
  xFrameOptions: 'DENY',
}));
app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  const requestOrigin = c.req.header('origin');
  const allowedOrigins = c.env.APP_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean);
  const originAllowed = Boolean(requestOrigin && allowedOrigins.includes(requestOrigin));
  if (requestOrigin && !originAllowed) {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) throw new ApiException(403, 'INVALID_ORIGIN', '请求来源无效');
    return apiError(c, 403, 'INVALID_ORIGIN', '请求来源无效');
  }
  if (c.req.method === 'OPTIONS') {
    if (originAllowed) {
      c.header('Access-Control-Allow-Origin', requestOrigin!);
      c.header('Access-Control-Allow-Credentials', 'true');
      c.header('Access-Control-Allow-Headers', 'content-type, x-setup-secret');
      c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    }
    return c.body(null, 204);
  }
  await next();
  if (originAllowed) {
    c.header('Access-Control-Allow-Origin', requestOrigin!);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Vary', 'Origin');
  }
});

app.route('/api', authRoutes);

const protectedApi = new Hono<AppEnv>();
protectedApi.use('*', requireSession);
protectedApi.route('/', studentRoutes);
protectedApi.route('/', tagRoutes);
protectedApi.route('/', scoreRoutes);
protectedApi.route('/', studyRecordRoutes);
protectedApi.route('/', courseRecordRoutes);
protectedApi.route('/', archiveRoutes);
protectedApi.route('/', attendanceRoutes);
app.route('/api', protectedApi);

app.notFound((c) => apiError(c, 404, 'NOT_FOUND', '接口不存在'));
app.onError((error, c) => {
  if (error instanceof ApiException) {
    return apiError(c, error.status, error.code, error.message, error.fields);
  }
  console.error(error);
  return apiError(c, 500, 'INTERNAL_ERROR', '服务器暂时无法处理请求');
});

export default app satisfies ExportedHandler<Env>;
