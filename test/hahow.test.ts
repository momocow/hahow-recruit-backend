import { BadGateway, NotFound } from 'http-errors';
import fetch, { MockParams } from 'jest-fetch-mock';
import Joi, { ValidationError } from 'joi';
import { AbortSignal } from 'node-fetch/externals';
import { isTranslatableError } from '../lib/errors';
import {
  ApiGatewayError,
  authenticate,
  fetchJson,
  heroesSchema,
  heroProfileSchema,
  heroSchema,
} from '../lib/hahow';
import { getThrownError } from './utils';

describe('ApiGatewayError', () => {
  test('is translatable error', () => {
    expect(isTranslatableError(new ApiGatewayError('test'))).toBe(true);
  });

  test('can be translated into 502 Bad Gateway', () => {
    expect(new ApiGatewayError('test').httpError()).toBeInstanceOf(BadGateway);
  });
});

describe('authenticate', () => {
  test('success', async () => {
    fetch.mockResponseOnce('', { status: 200 });
    const result = await authenticate('foo', 'bar');
    expect(result).toBe(true);
  });

  test('failure', async () => {
    fetch.mockResponseOnce('', { status: 401 });
    const result = await authenticate('foo', 'bar');
    expect(result).toBe(false);
  });

  test('can be aborted', async () => {
    jest.useFakeTimers();

    fetch.mockResponseOnce(async () => {
      jest.advanceTimersByTime(100);
      return { body: '', init: { status: 200 } };
    });

    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 50);

    const err = await getThrownError(() =>
      authenticate('foo', 'bar', { signal: ctrl.signal as AbortSignal }),
    );
    expect((err as Error).name).toBe('AbortError');

    jest.useRealTimers();
  });
});

describe('fetchJson', () => {
  test('fetch json', async () => {
    const data = { foo: 'bar' };
    const schema = Joi.object({ foo: Joi.string().required() });
    fetch.mockResponseOnce(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await fetchJson('<url>', schema);
    expect(json).toEqual(data);
  });

  test('forward 4xx status', async () => {
    fetch.mockResponseOnce('', { status: 404 });
    const err = await getThrownError(() => fetchJson('<url>', Joi.any()));
    expect(err).toBeInstanceOf(NotFound);
  });

  test('throw on non-200 status', async () => {
    fetch.mockResponseOnce('', { status: 500 });
    const err = (await getThrownError(() =>
      fetchJson('<url>', Joi.any()),
    )) as ApiGatewayError;
    expect(err).toBeInstanceOf(ApiGatewayError);
    expect(err.message).toMatch(/^Got unexpected status/);
  });

  test('throw on non-json content type', async () => {
    const responses: [string, MockParams][] = [
      // invalid content type
      ['', { status: 200, headers: { 'Content-Type': 'text/html' } }],
      // no content type
      ['', { status: 200 }],
    ];
    fetch.mockResponses(...responses);

    for (let i = 0; i < responses.length; i++) {
      const err1 = (await getThrownError(() =>
        fetchJson('<url>', Joi.any()),
      )) as ApiGatewayError;
      expect(err1).toBeInstanceOf(ApiGatewayError);
      expect(err1.message).toMatch(/^Expect application\/json, got/);
    }
  });

  test('throw on malformed json body', async () => {
    fetch.mockResponseOnce('{', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const err = (await getThrownError(() =>
      fetchJson('<url>', Joi.any()),
    )) as ApiGatewayError;
    expect(err).toBeInstanceOf(ApiGatewayError);
    expect(err.message).toMatch(/^Failed to decode JSON data/);
  });

  test('throw on invalid json schema', async () => {
    fetch.mockResponseOnce('{"bar":"foo"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const err = (await getThrownError(() =>
      fetchJson('<url>', Joi.object({ foo: Joi.string().required() })),
    )) as ApiGatewayError;
    expect(err).toBeInstanceOf(ApiGatewayError);
    expect(err.message).toMatch(/^Invalid data/);
  });

  test('can be aborted', async () => {
    jest.useFakeTimers();

    fetch.mockResponseOnce(async () => {
      jest.advanceTimersByTime(100);
      return '';
    });

    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 50);

    const err = await getThrownError(() =>
      fetchJson('<url>', Joi.any(), { signal: ctrl.signal as AbortSignal }),
    );
    expect((err as Error).name).toBe('AbortError');

    jest.useRealTimers();
  });
});

function testSchemaSuccess(schema: Joi.Schema, cases: unknown[]): void {
  for (const c of cases) {
    const { error } = schema.validate(c, { convert: false });
    expect(error).toBeUndefined();
  }
}

function testSchemaFailure(schema: Joi.Schema, cases: unknown[]): void {
  for (const c of cases) {
    const { error } = schema.validate(c, { convert: false });
    expect(error).toBeInstanceOf(ValidationError);
  }
}

describe.each([
  [
    'heroProfileSchema',
    heroProfileSchema,
    [
      {
        str: 1,
        int: 2,
        agi: 3,
        luk: 4,
      },
    ],
    [
      // extra keys
      {
        str: 1,
        int: 2,
        agi: 3,
        luk: 4,
        ext: 5,
      },
      // missing keys
      {
        str: 1,
        int: 2,
        agi: 3,
      },
      // invalid type
      5,
      // invalid value type
      {
        str: '1',
        int: '2',
        agi: '3',
        luk: '4',
      },
    ],
  ],
  [
    'heroSchema',
    heroSchema,
    [
      {
        id: '1',
        name: 'foo',
        image: 'bar',
      },
    ],
    [
      // extra keys
      {
        id: '1',
        name: 'foo',
        image: 'bar',
        extra: true,
      },
      // missing keys
      {
        id: '1',
        name: 'foo',
      },
      // invalid type
      5,
      // invalid value type
      {
        id: 1,
        name: 'foo',
        image: 'bar',
      },
    ],
  ],
  [
    'heroesSchema',
    heroesSchema,
    [
      [
        {
          id: '1',
          name: 'Daredevil',
          image:
            'http://i.annihil.us/u/prod/marvel/i/mg/6/90/537ba6d49472b/' +
            'standard_xlarge.jpg',
        },
        {
          id: '2',
          name: 'Thor',
          image:
            'http://x.annihil.us/u/prod/marvel/i/mg/5/a0/537bc7036ab02/' +
            'standard_xlarge.jpg',
        },
      ],
    ],
    [
      // a list of non-hero
      [
        {
          id: '1',
          name: 'Daredevil',
        },
        {
          id: '2',
          name: 'Thor',
        },
      ],
    ],
  ],
])('%s', (_, schema, successCases, failureCases) => {
  test('success', () => {
    testSchemaSuccess(schema, successCases);
  });

  test('failure', () => {
    testSchemaFailure(schema, failureCases);
  });
});
