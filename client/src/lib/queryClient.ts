import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log('🔄 API Request:', { method, url, data });
  
  // Robust parameter validation and formatting
  const requestMethod = String(method || 'GET').toUpperCase().trim();
  const requestUrl = String(url || '').trim();
  
  // Comprehensive validation
  if (!requestMethod || !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(requestMethod)) {
    throw new Error(`Invalid HTTP method: "${requestMethod}". Must be GET, POST, PUT, DELETE, or PATCH.`);
  }
  
  if (!requestUrl || !requestUrl.startsWith('/')) {
    throw new Error(`Invalid URL: "${requestUrl}". Must start with '/'.`);
  }

  // Prevent parameter swapping errors
  if (requestUrl.match(/^(GET|POST|PUT|DELETE|PATCH)\s/)) {
    throw new Error(`Parameters appear to be swapped. URL contains HTTP method: "${requestUrl}"`);
  }
  
  const fetchOptions = {
    method: requestMethod,
    headers: {} as Record<string, string>,
    body: undefined as string | undefined,
    credentials: "include" as RequestCredentials,
  };
  
  if (data && ['POST', 'PUT', 'PATCH'].includes(requestMethod)) {
    fetchOptions.headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(data);
  }
  
  console.log('📡 Fetch options:', { 
    url: requestUrl, 
    method: fetchOptions.method, 
    hasBody: !!fetchOptions.body,
    headers: fetchOptions.headers 
  });
  
  const res = await fetch(requestUrl, fetchOptions);

  console.log('📊 API Response:', { status: res.status, statusText: res.statusText, ok: res.ok });
  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
