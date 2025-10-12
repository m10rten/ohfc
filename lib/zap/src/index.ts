// @ohfc/zap - a native, typesafe, performant HTTP client for Node and browser with streaming, error handling, and customisation

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS" | "HEAD";

interface ZapRequestOptions extends RequestInit {
  // custom headers, body, etc are inherited from RequestInit
  validateResponse?: (data: unknown) => boolean; // user-provided validation function
  signal?: AbortSignal; // support cancelation
}

interface ZapResponseSuccess<T> {
  ok: true;
  status: number;
  headers: Headers;
  data: T;
  error: null;
}

interface ZapResponseError {
  ok: false;
  status: number;
  headers: Headers | null;
  data: unknown;
  error: Error;
}

type ZapResponse<T> = ZapResponseSuccess<T> | ZapResponseError;

const createResponse = async <T>(
  response: Response,
  validate?: (data: unknown) => boolean,
): Promise<ZapResponse<T>> => {
  const headers = response.headers;
  const status = response.status;

  // Try to parse JSON response safely
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status,
      headers,
      data,
      error: new Error(`HTTP error: ${status}`),
    };
  }

  // Validate data if validator provided
  if (validate && !validate(data)) {
    return {
      ok: false,
      status,
      headers,
      data,
      error: new Error("Response data validation failed"),
    };
  }

  return {
    ok: true,
    status,
    headers,
    data: data as T,
    error: null,
  };
};

// Core request function
async function zapRequest<T>(
  url: string,
  options: ZapRequestOptions & { method: HttpMethod },
): Promise<ZapResponse<T>> {
  // Defensive: no config needed for baseline usage
  const reqInit: RequestInit = {
    ...options,
    method: options.method,
  };

  // Use native fetch APIs (browser or node 18+)
  try {
    const response = await fetch(url, reqInit);
    return createResponse<T>(response, options.validateResponse);
  } catch (error) {
    return {
      ok: false,
      status: 0,
      headers: null,
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Streaming support - returns ReadableStream or Node Readable if available
async function zapStream(url: string, options: ZapRequestOptions & { method: HttpMethod }) {
  // No validation here- stream usage is advanced scenario
  return fetch(url, { ...options, method: options.method }).then((res) => {
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return res.body; // ReadableStream in browser or Node18+
  });
}

// Typed shortcuts for HTTP methods
function get<T>(url: string, options: Omit<ZapRequestOptions, "method"> = {}) {
  return zapRequest<T>(url, { ...options, method: "GET" });
}
function post<T>(url: string, options: Omit<ZapRequestOptions, "method"> = {}) {
  return zapRequest<T>(url, { ...options, method: "POST" });
}
function patch<T>(url: string, options: Omit<ZapRequestOptions, "method"> = {}) {
  return zapRequest<T>(url, { ...options, method: "PATCH" });
}
function put<T>(url: string, options: Omit<ZapRequestOptions, "method"> = {}) {
  return zapRequest<T>(url, { ...options, method: "PUT" });
}
function del<T>(url: string, options: Omit<ZapRequestOptions, "method"> = {}) {
  return zapRequest<T>(url, { ...options, method: "DELETE" });
}
function head<T>(url: string, options: Omit<ZapRequestOptions, "method"> = {}) {
  return zapRequest<T>(url, { ...options, method: "HEAD" });
}
function options<T>(url: string, options: Omit<ZapRequestOptions, "method"> = {}) {
  return zapRequest<T>(url, { ...options, method: "OPTIONS" });
}

// Default export with .all for generic method, plus streaming and methods
const zap = Object.assign(
  <T>(url: string, options: ZapRequestOptions & { method: HttpMethod }): Promise<ZapResponse<T>> =>
    zapRequest<T>(url, options),
  {
    all: zapRequest,
    stream: zapStream,
    get,
    post,
    patch,
    put,
    delete: del,
    head,
    options,
  },
);

export { zap, zap as default, get, post, patch, put, del as delete, head, options };
export type { ZapRequestOptions, ZapResponse };
