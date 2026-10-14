/**
 * Run-Length Encoding (RLE) Streak Record Compressor & Decompressor
 *
 * Compresses repetitive sequential data (such as daily habit completion streaks)
 * into compact Run-Length Encoded structures and serialized strings for efficient
 * local persistence and network synchronization payloads.
 */

export interface RleRun<T = number> {
  value: T; // The repeated item (e.g. 1 for completed, 0 for missed)
  count: number; // Number of consecutive occurrences (integer >= 1)
}

/**
 * Compresses an array into an array of run objects { value, count }.
 * Returns an empty array if the input sequence is empty.
 */
export function compressRle<T>(sequence: T[]): RleRun<T>[] {
  if (!Array.isArray(sequence) || sequence.length === 0) {
    return [];
  }

  const runs: RleRun<T>[] = [];
  let currentValue = sequence[0];
  let currentCount = 1;

  for (let i = 1; i < sequence.length; i++) {
    if (Object.is(sequence[i], currentValue)) {
      currentCount++;
    } else {
      runs.push({ value: currentValue, count: currentCount });
      currentValue = sequence[i];
      currentCount = 1;
    }
  }

  runs.push({ value: currentValue, count: currentCount });
  return runs;
}

/**
 * Reconstructs the original sequence from run objects.
 * Throws RangeError if any run has count <= 0 or a non-integer count.
 */
export function decompressRle<T>(runs: RleRun<T>[]): T[] {
  if (!Array.isArray(runs) || runs.length === 0) {
    return [];
  }

  const result: T[] = [];

  for (const run of runs) {
    if (
      typeof run.count !== "number" ||
      !Number.isInteger(run.count) ||
      run.count < 1
    ) {
      throw new RangeError(
        `Invalid RLE run count: ${run.count}. Count must be an integer >= 1.`
      );
    }

    for (let i = 0; i < run.count; i++) {
      result.push(run.value);
    }
  }

  return result;
}

/**
 * Convenience helper that encodes binary streaks like "1111100011"
 * or [1, 1, 1, 1, 1, 0, 0, 0, 1, 1] into a formatted short string like "5:1,3:0,2:1".
 */
export function compressBinaryStreak(
  bitStringOrArray: string | number[]
): string {
  let sequence: number[];

  if (typeof bitStringOrArray === "string") {
    if (bitStringOrArray.trim() === "") {
      return "";
    }
    sequence = Array.from(bitStringOrArray).map((char) => {
      const num = Number(char);
      if (Number.isNaN(num) || (num !== 0 && num !== 1)) {
        throw new TypeError(
          `Invalid binary streak character: "${char}". Expected 0 or 1.`
        );
      }
      return num;
    });
  } else if (Array.isArray(bitStringOrArray)) {
    if (bitStringOrArray.length === 0) {
      return "";
    }
    sequence = bitStringOrArray;
  } else {
    return "";
  }

  const runs = compressRle(sequence);
  return runs.map((run) => `${run.count}:${run.value}`).join(",");
}

/**
 * Decompresses short string format back into an array of numbers:
 * "5:1,3:0,2:1" -> [1, 1, 1, 1, 1, 0, 0, 0, 1, 1]
 */
export function decompressBinaryStreak(compressed: string): number[] {
  if (!compressed || typeof compressed !== "string" || compressed.trim() === "") {
    return [];
  }

  const parts = compressed.split(",");
  const runs: RleRun<number>[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      throw new RangeError(
        `Invalid compressed streak segment: "${trimmed}". Expected "count:value".`
      );
    }

    const countStr = trimmed.slice(0, colonIndex);
    const valueStr = trimmed.slice(colonIndex + 1);

    const count = Number(countStr);
    const value = Number(valueStr);

    if (Number.isNaN(count) || !Number.isInteger(count) || count < 1) {
      throw new RangeError(
        `Invalid count in segment "${trimmed}": "${countStr}". Must be an integer >= 1.`
      );
    }

    if (Number.isNaN(value)) {
      throw new TypeError(`Invalid value in segment "${trimmed}": "${valueStr}".`);
    }

    runs.push({ count, value });
  }

  return decompressRle(runs);
}
