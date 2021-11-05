import Koa from 'koa';
import { defaultNegotiationMap, negotiator } from '../lib/negotiator';

describe('defaultNegotiationMap', () => {
  test('json', () => {
    expect(defaultNegotiationMap).toHaveProperty('json');

    const jsonStringifySpy = jest.spyOn(JSON, 'stringify');
    expect(defaultNegotiationMap.json({ foo: 'bar' })).toBe('{"foo":"bar"}');
    expect(jsonStringifySpy).toBeCalled();

    jsonStringifySpy.mockRestore();
  });
});

describe('negotiator', () => {
  test('Accept: application/json', async () => {
    const ctx = {
      accepts: jest.fn().mockReturnValue('json'),
      assert: jest.fn(),
      body: null as unknown,
    };
    const next = jest.fn().mockImplementation(() => {
      ctx.body = { foo: 'bar' };
    });
    await negotiator()(ctx as unknown as Koa.Context, next);
    expect(ctx.body).toBe('{"foo":"bar"}');
  });

  test('Unacceptable', async () => {
    const ctx = {
      accepts: jest.fn().mockReturnValue(false),
      assert: jest.fn().mockImplementation(() => {
        throw new Error();
      }),
      body: null as unknown,
    };
    const next = jest.fn().mockImplementation(() => {
      ctx.body = { foo: 'bar' };
    });
    await expect(() =>
      negotiator()(ctx as unknown as Koa.Context, next),
    ).rejects.toThrow();
    expect(ctx.assert).toBeCalledWith(false, 406);
  });
});
