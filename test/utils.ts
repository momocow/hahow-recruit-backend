export async function getThrownError(
  fn: () => unknown | Promise<unknown>,
): Promise<unknown> {
  try {
    await fn();
  } catch (e) {
    return e;
  }
  throw new Error('The function did not throw.');
}
