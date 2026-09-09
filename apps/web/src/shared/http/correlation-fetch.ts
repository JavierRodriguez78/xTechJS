function reportTrace(correlationId: string, phase: "started" | "completed" | "failed", method: string, url: string, status?: number): void {
  const path = new URL(url, window.location.origin).pathname;
  navigator.sendBeacon("/api/observability/frontend-trace", new Blob([JSON.stringify({ correlationId, phase, method, path, status })], { type: "application/json" }));
}

export function installCorrelationFetch(): void {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    const correlationId = crypto.randomUUID();
    headers.set("x-correlation-id", correlationId);
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const url = input instanceof Request ? input.url : String(input);

    console.debug("HTTP request", { correlationId, method, url });
    reportTrace(correlationId, "started", method, url);
    return nativeFetch(input, { ...init, headers })
      .then((response) => {
        console.debug("HTTP response", { correlationId, method, url, status: response.status });
        reportTrace(correlationId, "completed", method, url, response.status);
        return response;
      })
      .catch((error: unknown) => {
        reportTrace(correlationId, "failed", method, url);
        throw error;
      });
  };
}