type IntegrationApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const DEFAULT_TIMEOUT_MS = 10_000;

export class IntegrationApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'IntegrationApiError';
    this.status = status;
    this.payload = payload;
  }
}

export type FieldTodayIntegrationResponse = {
  integrationClient: string;
  divisionId: string;
  schedules: Array<unknown>;
};

export type GetSchedulesResponse = {
  divisionId: string;
  date: string;
  integrationClient: string;
  count: number;
  schedules: Array<unknown>;
};

export type StartSessionRequest = {
  scheduleId: string;
};

export type SubmitSessionRequest = {
  status: 'COMPLETED' | 'COMPLETED_WITH_ISSUE';
  issueNote?: string;
};

export type IntegrationReportRequest = {
  scheduleId: string;
  status: 'COMPLETED' | 'COMPLETED_WITH_ISSUE' | 'NOT_EXECUTED';
  issueNote?: string;
  replaceEvidence?: boolean;
  evidences?: Array<
    | { type: 'PHOTO'; url: string; caption?: string }
    | { type: 'DOCUMENT'; url: string; filename: string }
  >;
};

type IntegrationConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

function getIntegrationConfig(): IntegrationConfig {
  const baseUrl = process.env.INTEGRATION_API_BASE_URL;
  const apiKey = process.env.INTEGRATION_API_KEY;
  const rawTimeout = process.env.INTEGRATION_API_TIMEOUT_MS;

  if (!baseUrl) {
    throw new Error('INTEGRATION_API_BASE_URL is not configured');
  }

  if (!apiKey) {
    throw new Error('INTEGRATION_API_KEY is not configured');
  }

  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (rawTimeout) {
    const parsed = Number.parseInt(rawTimeout, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      timeoutMs = parsed;
    }
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    timeoutMs,
  };
}

export function getDefaultIntegrationDivisionId() {
  const divisionId = process.env.INTEGRATION_DIVISION_ID;

  if (!divisionId) {
    throw new Error('INTEGRATION_DIVISION_ID is not configured');
  }

  return divisionId;
}

type RequestOptions = {
  method?: IntegrationApiMethod;
  query?: Record<string, string | undefined>;
  jsonBody?: unknown;
  body?: BodyInit;
  contentType?: string;
};

async function integrationRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { baseUrl, apiKey, timeoutMs } = getIntegrationConfig();
  const method = options.method ?? 'GET';

  const url = new URL(path, `${baseUrl}/`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }

  const headers: HeadersInit = {
    'x-integration-key': apiKey,
  };

  let requestBody: BodyInit | undefined = options.body;
  if (options.jsonBody !== undefined) {
    requestBody = JSON.stringify(options.jsonBody);
    headers['Content-Type'] = options.contentType ?? 'application/json';
  } else if (options.contentType) {
    headers['Content-Type'] = options.contentType;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
      cache: 'no-store',
    });

    const rawBody = await response.text();
    let parsedBody: unknown = null;
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }
    }

    if (!response.ok) {
      throw new IntegrationApiError(
        `Integration API request failed with status ${response.status}`,
        response.status,
        parsedBody,
      );
    }

    return parsedBody as T;
  } catch (error) {
    if (error instanceof IntegrationApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Integration API request timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getFieldToday(divisionId?: string) {
  return integrationRequest<FieldTodayIntegrationResponse>('/api/integrations/v1/field/today', {
    query: { divisionId },
  });
}

export function getDivisionSchedules(divisionId: string, date?: string) {
  return integrationRequest<GetSchedulesResponse>(
    `/api/integrations/v1/divisions/${encodeURIComponent(divisionId)}/schedules`,
    {
      query: { date },
    },
  );
}

export function startIntegrationSession(body: StartSessionRequest) {
  return integrationRequest<unknown>('/api/integrations/v1/sessions', {
    method: 'POST',
    jsonBody: body,
  });
}

export function getIntegrationSession(sessionId: string) {
  return integrationRequest<unknown>(`/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}`);
}

export function submitIntegrationSession(sessionId: string, body: SubmitSessionRequest) {
  return integrationRequest<unknown>(`/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PUT',
    jsonBody: body,
  });
}

export function listIntegrationSessionPhotos(sessionId: string) {
  return integrationRequest<unknown[]>(
    `/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}/photos`,
  );
}

export function uploadIntegrationSessionPhoto(sessionId: string, formData: FormData) {
  return integrationRequest<unknown>(
    `/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}/photos`,
    {
      method: 'POST',
      body: formData,
    },
  );
}

export function deleteIntegrationSessionPhoto(sessionId: string, photoId: string) {
  return integrationRequest<unknown>(
    `/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}/photos`,
    {
      method: 'DELETE',
      query: { photoId },
    },
  );
}

export function listIntegrationSessionDocuments(sessionId: string) {
  return integrationRequest<unknown[]>(
    `/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}/documents`,
  );
}

export function uploadIntegrationSessionDocument(sessionId: string, formData: FormData) {
  return integrationRequest<unknown>(
    `/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}/documents`,
    {
      method: 'POST',
      body: formData,
    },
  );
}

export function deleteIntegrationSessionDocument(sessionId: string, documentId: string) {
  return integrationRequest<unknown>(
    `/api/integrations/v1/sessions/${encodeURIComponent(sessionId)}/documents`,
    {
      method: 'DELETE',
      query: { documentId },
    },
  );
}

export function submitDivisionReport(divisionId: string, body: IntegrationReportRequest) {
  return integrationRequest<unknown>(
    `/api/integrations/v1/divisions/${encodeURIComponent(divisionId)}/reports`,
    {
      method: 'POST',
      jsonBody: body,
    },
  );
}
