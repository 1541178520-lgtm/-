import type { Context } from 'hono';
import type { ZodType } from 'zod';
import type { ApiErrorBody } from '../../shared/contracts';

export class ApiException extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export function apiError(
  c: Context,
  status: ApiException['status'],
  code: string,
  message: string,
  fields?: Record<string, string>,
): Response {
  const body: ApiErrorBody = { error: { code, message, ...(fields ? { fields } : {}) } };
  return c.json(body, status);
}

export async function parseJson<T>(c: Context, schema: ZodType<T>): Promise<T> {
  let input: unknown;
  try {
    input = await c.req.json();
  } catch {
    throw new ApiException(422, 'INVALID_JSON', '请求内容必须是有效的 JSON');
  }

  const result = schema.safeParse(input);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.') || '_form';
      fields[field] ??= issue.message;
    }
    throw new ApiException(422, 'VALIDATION_ERROR', '请检查填写内容', fields);
  }
  return result.data;
}
