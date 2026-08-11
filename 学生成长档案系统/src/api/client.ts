import type { ApiErrorBody } from '../../shared/contracts';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' });

  if (!response.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      body = undefined;
    }
    throw new ApiClientError(
      response.status,
      body?.error.code ?? 'REQUEST_FAILED',
      body?.error.message ?? '请求失败，请稍后重试',
      body?.error.fields,
    );
  }

  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
