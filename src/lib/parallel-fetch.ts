interface ParallelFetchResult<T> {
  fulfilled: T[];
  failedCount: number;
  firstError?: unknown;
}

export async function settleParallel<TInput, T>(
  inputs: TInput[],
  fetchOne: (input: TInput) => Promise<T>,
): Promise<ParallelFetchResult<T>> {
  const results = await Promise.allSettled(inputs.map(fetchOne));

  const fulfilled: T[] = [];
  let failedCount = 0;
  let firstError: unknown;

  for (const result of results) {
    if (result.status === "fulfilled") {
      fulfilled.push(result.value);
    } else {
      console.error(result.reason);
      firstError ??= result.reason;
      failedCount++;
    }
  }

  return { fulfilled, failedCount, firstError };
}
