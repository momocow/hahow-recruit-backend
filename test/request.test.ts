import fetch from 'jest-fetch-mock';
import pLimit from 'p-limit';
import {
  bindSignal,
  controlRequest,
  createTimeoutAbortController,
  timedAndLimitedFetch,
  timedFetch,
} from '../lib/request';
import { getThrownError } from './utils';

afterEach(() => {
  fetch.resetMocks();
});

const mockedAbortableFetch = async (req: Request) =>
  new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => resolve('ok'), 1000);
    // aborted case is already handled by jest-fetch-mock
    req.signal.addEventListener('abort', () => {
      clearTimeout(timer);
      const error = new Error('abort');
      error.name = 'AbortError';
      reject(error);
    });
  });

describe('createTimeoutAbortController', () => {
  test('automatically abort after timeout', () => {
    const ctrl = createTimeoutAbortController(100);
    const onAbort = jest.fn();
    ctrl.signal.addEventListener('abort', onAbort);
    jest.advanceTimersByTime(100);
    expect(onAbort).toBeCalled();
    expect(ctrl.signal.aborted).toBe(true);
  });

  test('proactively abort before timeout', () => {
    const ctrl = createTimeoutAbortController(100);
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    jest.advanceTimersByTime(1);
    ctrl.abort();
    expect(clearTimeoutSpy).toBeCalled();
    clearTimeoutSpy.mockRestore();
  });
});

describe('bindSignal', () => {
  test('trigger dst aborted once src gets aborted', () => {
    const src = new AbortController();
    const dst = new AbortController();
    bindSignal(dst, src.signal);
    src.abort();
    expect(dst.signal.aborted).toBe(true);
  });

  test('abort immediately if src is already aborted', () => {
    const src = new AbortController();
    const dst = new AbortController();
    src.abort();
    bindSignal(dst, src.signal);
    expect(dst.signal.aborted).toBe(true);
  });
});

describe('timedFetch', () => {
  beforeEach(() => {
    fetch.mockResponseOnce(mockedAbortableFetch);
  });
  test('normal fetch', async () => {
    const p = timedFetch(1001, '<url>');
    jest.advanceTimersByTime(1000);
    const resp = await p;
    const txt = await resp.text();
    expect(txt).toBe('ok');
  });

  test('timeout fetch', async () => {
    const p = timedFetch(999, '<url>');
    jest.advanceTimersByTime(999);
    const err = (await getThrownError(() => p)) as Error;
    expect(err.name).toBe('AbortError');
  });

  test('aborted by signal', async () => {
    const ctrl = new AbortController();
    const p = timedFetch(1001, '<url>', { signal: ctrl.signal });
    ctrl.abort();
    const err = (await getThrownError(() => p)) as Error;
    expect(err.name).toBe('AbortError');
  });
});

describe('timedAndLimitedFetch', () => {
  test('call limiter with a task function', async () => {
    const limiter = jest.fn();
    await timedAndLimitedFetch(
      limiter as unknown as pLimit.Limit,
      1000,
      '<url>',
    );
    expect(limiter).toBeCalled();
    expect(typeof limiter.mock.calls[0][0]).toBe('function');
    // a task function which calls timedFetch internally
    expect(limiter.mock.calls[0][0].toString()).toMatch(/\btimedFetch\b\(/);
  });
});

describe('controlRequest', () => {
  beforeEach(() => {
    fetch.mockResponse(mockedAbortableFetch);
  });

  test('control request concurrency', async () => {
    const ctrlReq = controlRequest(2, 2000);

    const promises = [];
    for (let i = 0; i < 6; i++) {
      // enqueue 6 tasks
      promises.push(ctrlReq('<url>'));
    }

    // this line is required since the first task is dequeued in a microtask
    // we should advance jest timers after the first task dequeued.
    // eslint-disable-next-line max-len
    // @see https://github.com/sindresorhus/p-limit/blob/e316fac4e7aeede98beeb87e3a7de4ffc3d8eebf/index.js#L42
    await Promise.resolve();

    for (let j = 2; j <= 6; j += 2) {
      expect(fetch).toBeCalledTimes(j);
      jest.advanceTimersByTime(1000);
      // the next task is dequeued right after the previous task is resolved
      await Promise.all(promises.slice(j - 2, j));
    }
  });

  test('abort by external signal', async () => {
    const ctrlReq = controlRequest(2, 2000);
    const ctrl = new AbortController();

    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(ctrlReq('url' + i, { signal: ctrl.signal }));
    }
    await Promise.resolve();
    ctrl.abort();

    const results = await Promise.allSettled(promises);
    expect(
      results.every(
        (r) =>
          r.status === 'rejected' && (r.reason as Error).name === 'AbortError',
      ),
    ).toBe(true);
  });
});
