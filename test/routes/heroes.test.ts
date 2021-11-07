import Router from '@koa/router';
import { Unauthorized } from 'http-errors';
import Koa from 'koa';
import fetchExt from 'node-fetch/externals';
import { setTimeout } from 'timers/promises';
import {
  authenticate,
  fetchHero,
  fetchHeroes,
  fetchHeroProfile,
} from '../../lib/hahow';
import {
  getAllHeroes,
  getOneHero,
  hahowAuth,
  loadProfile,
} from '../../lib/routes/heroes';

jest.mock('../../lib/hahow');

afterEach(() => {
  (fetchHeroes as jest.Mock).mockReset();
  (authenticate as jest.Mock).mockReset();
  (fetchHeroProfile as jest.Mock).mockReset();
});

describe('hahowAuth', () => {
  test('success', async () => {
    (authenticate as jest.Mock).mockImplementationOnce(async () => true);
    const headers: Record<string, string> = { name: 'foo', password: 'bar' };
    const result = await hahowAuth({
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
    } as Koa.Context);
    expect(result).toBe(true);
    expect(authenticate).toBeCalledWith('foo', 'bar');

    (authenticate as jest.Mock).mockReset();
  });

  test('failure with no credential', async () => {
    (authenticate as jest.Mock).mockImplementationOnce(async () => true);
    const headers: Record<string, string> = {};
    const result = await hahowAuth({
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
    } as Koa.Context);
    expect(result).toBe(false);
    expect(authenticate).not.toBeCalled();

    (authenticate as jest.Mock).mockReset();
  });

  test('throw 401 Unauthorized if the credential is invalid', async () => {
    (authenticate as jest.Mock).mockImplementationOnce(async () => false);
    const headers: Record<string, string> = { name: 'foo', password: 'bar' };
    await expect(() =>
      hahowAuth({
        request: { headers },
        get: (k: string) => headers[k.toLowerCase()],
      } as Koa.Context),
    ).rejects.toThrowError(Unauthorized);
    expect(authenticate).toBeCalledWith('foo', 'bar');

    (authenticate as jest.Mock).mockReset();
  });
});

describe('loadProfile', () => {
  test(
    'call fetchHeroProfile and ' + 'merge profile into Hero in a new object',
    async () => {
      (fetchHeroProfile as jest.Mock).mockImplementationOnce(async () => ({
        foo: 'bar',
      }));
      const hero = { id: '', name: '', image: '' };
      const result = await loadProfile(hero);
      expect(result).toEqual({
        id: '',
        name: '',
        image: '',
        profile: { foo: 'bar' },
      });
      expect(result).not.toBe(hero);
      expect(fetchHeroProfile).toBeCalled();

      (fetchHeroProfile as jest.Mock).mockReset();
    },
  );
});

describe('getAllHeroes', () => {
  test('success without credential', async () => {
    const heroes = [{ id: '1' }, { id: '2' }];
    (fetchHeroes as jest.Mock).mockImplementationOnce(async () => heroes);
    const headers: Record<string, string> = {};
    const next = jest.fn();
    const ctx = {
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
      body: undefined,
    } as Router.RouterContext;
    await getAllHeroes(ctx, next);
    expect(next).not.toBeCalled();
    expect(ctx.body).toEqual({ heroes });
  });

  test('success with credential', async () => {
    const heroes = [{ id: '1' }, { id: '2' }];
    (fetchHeroes as jest.Mock).mockImplementationOnce(async () => heroes);
    (authenticate as jest.Mock).mockImplementationOnce(async () => true);
    (fetchHeroProfile as jest.Mock).mockImplementation(async (hid) => ({
      foo: 'bar' + hid,
    }));
    const headers: Record<string, string> = { name: 'foo', password: 'bar' };
    const next = jest.fn();
    const ctx = {
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
      body: undefined,
    } as Router.RouterContext;
    await getAllHeroes(ctx, next);
    expect(next).not.toBeCalled();
    expect(ctx.body).toEqual({
      heroes: [
        { id: '1', profile: { foo: 'bar1' } },
        { id: '2', profile: { foo: 'bar2' } },
      ],
    });
  });

  test('failure with invalid credential', async () => {
    (authenticate as jest.Mock).mockImplementationOnce(async () => false);
    const headers: Record<string, string> = { name: 'foo', password: 'bar' };
    const ctx = {
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
      body: undefined,
    } as Router.RouterContext;
    const next = jest.fn();
    await expect(() => getAllHeroes(ctx, next)).rejects.toThrowError(
      Unauthorized,
    );
  });

  test(
    'all loadProfile calls are aborted ' + 'if any of them throws an error',
    async () => {
      const heroes = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const abortSpy: Record<string, jest.Mock> = {
        1: jest.fn(),
        2: jest.fn(),
        3: jest.fn(),
      };
      (fetchHeroes as jest.Mock).mockImplementationOnce(async () => heroes);
      (authenticate as jest.Mock).mockImplementationOnce(async () => true);
      (fetchHeroProfile as jest.Mock).mockImplementation(
        async (
          hid,
          { signal }: { signal: AbortSignal & fetchExt.AbortSignal },
        ) => {
          signal.addEventListener('abort', abortSpy[hid], { once: true });

          if (hid === '1') {
            await setTimeout(50);
            throw new Error(hid);
          } else {
            await setTimeout(200);
            return { foo: 'bar' };
          }
        },
      );
      const headers: Record<string, string> = { name: 'foo', password: 'bar' };
      const next = jest.fn();
      const ctx = {
        request: { headers },
        get: (k: string) => headers[k.toLowerCase()],
        body: undefined,
      } as Parameters<typeof getAllHeroes>[0];
      await expect(() => getAllHeroes(ctx, next)).rejects.toThrowError('1');
      expect(abortSpy[1]).toBeCalled();
      expect(abortSpy[2]).toBeCalled();
      expect(abortSpy[3]).toBeCalled();
    },
  );
});

describe('getOneHero', () => {
  test('success without credential', async () => {
    const hero = { id: '1', name: 'foo', image: 'bar' };
    (fetchHero as jest.Mock).mockImplementationOnce(async () => hero);
    const headers: Record<string, string> = {};
    const next = jest.fn();
    const ctx = {
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
      body: undefined,
      params: { id: hero.id },
    } as unknown as Router.RouterContext;
    await getOneHero(ctx, next);
    expect(ctx.body).toEqual(hero);
  });

  test('success with credential', async () => {
    const hero = { id: '1', name: 'foo', image: 'bar' };
    (fetchHero as jest.Mock).mockImplementationOnce(async () => hero);
    (authenticate as jest.Mock).mockImplementationOnce(async () => true);
    (fetchHeroProfile as jest.Mock).mockImplementation(async (hid) => ({
      foo: 'bar' + hid,
    }));
    const headers: Record<string, string> = { name: 'foo', password: 'bar' };
    const next = jest.fn();
    const ctx = {
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
      body: undefined,
      params: { id: hero.id },
    } as unknown as Router.RouterContext;
    await getOneHero(ctx, next);
    expect(ctx.body).toEqual({
      id: '1',
      name: 'foo',
      image: 'bar',
      profile: { foo: 'bar1' },
    });
  });

  test('failure with invalid credential', async () => {
    (authenticate as jest.Mock).mockImplementationOnce(async () => false);
    const headers: Record<string, string> = { name: 'foo', password: 'bar' };
    const ctx = {
      request: { headers },
      get: (k: string) => headers[k.toLowerCase()],
      body: undefined,
      params: { id: '1' },
    } as unknown as Router.RouterContext;
    const next = jest.fn();
    await expect(() => getOneHero(ctx, next)).rejects.toThrowError(
      Unauthorized,
    );
  });
});
