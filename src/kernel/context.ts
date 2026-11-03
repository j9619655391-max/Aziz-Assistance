import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function getRequestId(): string {
  return requestContext.getStore()?.requestId || "REQ-SYSTEM-INIT";
}

export function generateRequestId(): string {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `REQ-AZIZ-${Date.now()}-${rand}`;
}
