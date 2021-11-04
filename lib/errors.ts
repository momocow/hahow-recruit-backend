import { HttpError, isHttpError } from 'http-errors';
import Koa from 'koa';

export type HttpErrorFactory = (error: Error) => HttpError;

export interface TranslatableError {
  httpError: HttpErrorFactory;
}

export function isTranslatableError(err: unknown): err is TranslatableError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'httpError' in err &&
    typeof (err as Partial<TranslatableError>).httpError === 'function'
  );
}

export type ErrorClass = typeof Error;

export interface ErrorHandlerOptions {
  errorMap: Map<ErrorClass, HttpErrorFactory>;
}

/**
 */
export function errorTranslator({
  errorMap = new Map(),
}: Partial<ErrorHandlerOptions> = {}): Koa.Middleware {
  return async (_, next) => {
    try {
      return await next();
    } catch (err) {
      if (!(err instanceof Error) || isHttpError(err)) throw err;

      // translate generic error into http error
      let httpError: HttpError | undefined;
      if (isTranslatableError(err)) httpError = err.httpError(err);
      else {
        const errorClazz = Array.from(errorMap.keys()).find(
          (ErrorClazz) => err instanceof ErrorClazz,
        );
        if (errorClazz) {
          httpError = errorMap.get(errorClazz)!(err);
        }
      }
      throw httpError ?? err;
    }
  };
}

export interface ErrorLoggerOptions {
  shouldLog: (error: unknown) => boolean;
}

export function errorLogger({
  shouldLog = (err) => !isHttpError(err),
}: Partial<ErrorLoggerOptions> = {}): Koa.Middleware {
  return async (_, next) => {
    try {
      return await next();
    } catch (err) {
      if (shouldLog(err)) console.error(err);
      throw err;
    }
  };
}
