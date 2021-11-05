import { BadRequest } from 'http-errors';
import {
  errorLogger,
  errorTranslator,
  isTranslatableError,
} from '../lib/errors';
import { getThrownError, mockContext } from './utils';

describe('isTranslatableError', () => {
  test('success', () => {
    expect(isTranslatableError({ httpError: () => null })).toBe(true);

    class A {
      httpError(): null {
        return null;
      }
    }
    expect(isTranslatableError(new A())).toBe(true);
  });

  test('failure', () => {
    expect(isTranslatableError(1)).toBe(false);
    expect(isTranslatableError('hello')).toBe(false);
    expect(isTranslatableError({})).toBe(false);
    expect(isTranslatableError(null)).toBe(false);
  });
});

describe('errorLogger', () => {
  test('log non-HttpError by default', async () => {
    const error = new Error('test');
    const next = async () => {
      throw error;
    };
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    await expect(() =>
      errorLogger()(mockContext({}), next),
    ).rejects.toThrowError(error);
    expect(consoleErrorSpy).toBeCalledWith(error);

    consoleErrorSpy.mockRestore();
  });

  test('ignore HttpError by default', async () => {
    const error = new BadRequest();
    const next = async () => {
      throw error;
    };
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    await expect(() =>
      errorLogger()(mockContext({}), next),
    ).rejects.toThrowError(BadRequest);
    expect(consoleErrorSpy).not.toBeCalled();

    consoleErrorSpy.mockRestore();
  });

  test('options: shouldLog', async () => {
    const error = new BadRequest();
    const next = async () => {
      throw error;
    };
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(() =>
      errorLogger({ shouldLog: (err) => err === error })(mockContext({}), next),
    ).rejects.toThrowError(BadRequest);
    expect(consoleErrorSpy).toBeCalledWith(error);

    consoleErrorSpy.mockRestore();
  });
});

describe('errorTranslator', () => {
  test('throw non-Error value without translation', async () => {
    const next = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'hello';
    };
    const err = await getThrownError(() =>
      errorTranslator()(mockContext({}), next),
    );
    expect(err).toBe('hello');
  });

  test('throw HttpError without translation', async () => {
    const error = new BadRequest();
    const next = async () => {
      throw error;
    };
    await expect(() =>
      errorTranslator()(mockContext({}), next),
    ).rejects.toThrowError(BadRequest);
  });

  test('translate a translatable error and throw', async () => {
    class TError extends Error {
      public httpError = () => error2;
    }
    const error1 = new TError('test');
    const error2 = new BadRequest();
    const next = async () => {
      throw error1;
    };
    await expect(() =>
      errorTranslator()(mockContext({}), next),
    ).rejects.toThrowError(BadRequest);
  });

  test('translate an mapped error and throw', async () => {
    class BaseError extends Error {}
    class ChildError extends BaseError {}
    const error = new ChildError();
    const next = async () => {
      throw error;
    };
    await expect(() =>
      errorTranslator({
        errorMap: new Map().set(BaseError, () => new BadRequest()),
      })(mockContext({}), next),
    ).rejects.toThrowError(BadRequest);
  });

  test('throw unmapped and untranslatable error itself', async () => {
    class BaseError extends Error {}
    class Child1Error extends BaseError {}
    class Child2Error extends BaseError {}
    const error = new Child2Error();
    const next = async () => {
      throw error;
    };
    await expect(() =>
      errorTranslator({
        errorMap: new Map().set(Child1Error, () => new BadRequest()),
      })(mockContext({}), next),
    ).rejects.toThrowError(Child2Error);
  });
});
