export interface DesktopRequestInit {
  method?: string;
  body?: string | null;
}

export interface DesktopApiSuccess {
  ok: true;
  status: number;
  body?: unknown;
}

export interface DesktopApiFailure {
  ok: false;
  status: number;
  body: {
    error: {
      code: string;
      message: string;
      fields?: Record<string, string>;
    };
  };
}

export type DesktopApiResponse = DesktopApiSuccess | DesktopApiFailure;

export interface DesktopFileResult {
  canceled: boolean;
  filePath?: string;
  message?: string;
}
