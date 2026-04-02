const POST_STUDIO_DEBUG = true;

declare global {
  interface Window {
    __postStudioDebug?: Record<string, unknown>;
  }
}

export function logPostStudioDebug(label: string, payload: Record<string, unknown>) {
  if (!POST_STUDIO_DEBUG || typeof window === 'undefined') {
    return;
  }

  const stampedPayload = {
    ...payload,
    timestamp: new Date().toISOString()
  };

  window.__postStudioDebug = {
    ...(window.__postStudioDebug ?? {}),
    [label]: stampedPayload
  };

  console.groupCollapsed(`[PostStudio Debug] ${label}`);
  console.log(stampedPayload);
  console.groupEnd();
}

export function setPostStudioDebugState(label: string, payload: Record<string, unknown>) {
  if (!POST_STUDIO_DEBUG || typeof window === 'undefined') {
    return;
  }

  window.__postStudioDebug = {
    ...(window.__postStudioDebug ?? {}),
    [label]: {
      ...payload,
      timestamp: new Date().toISOString()
    }
  };
}
