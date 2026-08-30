import type { ApiErrorBody } from '../../shared/contracts';
import type { DesktopApiResponse, DesktopFileResult } from '../../electron/types';

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

const REQUEST_TIMEOUT_MS = 12_000;

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (window.archiveDesktop) {
    const result = await window.archiveDesktop.request(path, {
      method: init.method,
      body: typeof init.body === 'string' ? init.body : null,
    });
    if (!result.ok) {
      throw new ApiClientError(
        result.status,
        result.body.error.code,
        result.body.error.message,
        result.body.error.fields,
      );
    }
    return result.body as T;
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/u, '');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${apiOrigin}/api${path}`, {
      ...init,
      headers,
      credentials: apiOrigin ? 'include' : 'same-origin',
      signal: init.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError(0, 'NETWORK_TIMEOUT', '连接档案服务器超时，请检查网络后重试；中国大陆网络可尝试使用 Worker 入口。');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

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

declare global {
  interface Window {
    archiveDesktop?: {
      request(path: string, init?: { method?: string; body?: string | null }): Promise<DesktopApiResponse>;
      exportBackup(): Promise<DesktopFileResult>;
      importBackup(): Promise<DesktopFileResult>;
    };
  }
}
