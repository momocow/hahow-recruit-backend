import fetch, { RequestInfo, RequestInit, Response } from 'node-fetch';
import pLimit from 'p-limit';

/**
 * Create an AbortController that is automatically aborted after timeout.
 */
export function createTimeoutAbortController(timeout: number): AbortController {
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    if (!ctrl.signal.aborted) ctrl.abort();
  }, timeout);
  ctrl.signal.addEventListener('abort', () => {
    clearTimeout(timer);
  });
  return ctrl;
}

/**
 * Abort the dst once the src is aborted.
 */
export function bindSignal(
  dst: AbortController,
  src: AbortSignal,
): AbortController {
  if (src.aborted) {
    if (!dst.signal.aborted) dst.abort();
  } else {
    src.addEventListener('abort', () => {
      if (!dst.signal.aborted) dst.abort();
    });
  }
  return dst;
}

export type FetchFn = (
  url: RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Limit the concurrency of fetch's and also handle timeout for each of them.
 * The concurrency is restricted per limiter.
 */
export async function timedAndLimitedFetch(
  limiter: pLimit.Limit,
  timeout: number,
  url: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  return await limiter(() => timedFetch(timeout, url, init));
}

/**
 * Abort the fetch operation once timeout.
 */
export async function timedFetch(
  timeout: number,
  url: RequestInfo,
  { signal, ...init }: RequestInit = {},
): Promise<Response> {
  const ctrl = createTimeoutAbortController(timeout);
  if (signal) bindSignal(ctrl, signal as AbortSignal);
  const ret = await fetch(url, {
    ...init,
    signal: ctrl.signal,
  });
  return ret;
}

export function controlRequest(concurrency: number, timeout: number): FetchFn {
  return timedAndLimitedFetch.bind(undefined, pLimit(concurrency), timeout);
}

export default controlRequest(
  Number(process.env.REQUEST_CONCURRENCY || Infinity),
  Number(process.env.REQUEST_TIMEOUT || 1000),
);
