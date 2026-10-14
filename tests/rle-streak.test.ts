import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  compressRle,
  decompressRle,
  compressBinaryStreak,
  decompressBinaryStreak,
  type RleRun,
} from '../src/lib/data/rle-streak';

describe('Run-Length Encoding (RLE) Streak Compressor', () => {
  describe('compressRle', () => {
    it('returns empty array when input sequence is empty', () => {
      assert.deepStrictEqual(compressRle([]), []);
    });

    it('compresses a single-element array', () => {
      assert.deepStrictEqual(compressRle([1]), [{ value: 1, count: 1 }]);
    });

    it('compresses all-identical elements into a single run', () => {
      assert.deepStrictEqual(compressRle([1, 1, 1, 1, 1]), [{ value: 1, count: 5 }]);
    });

    it('compresses alternating sequence accurately', () => {
      const input = [1, 1, 1, 0, 0, 1];
      const expected: RleRun<number>[] = [
        { value: 1, count: 3 },
        { value: 0, count: 2 },
        { value: 1, count: 1 },
      ];
      assert.deepStrictEqual(compressRle(input), expected);
    });

    it('works with non-numeric values such as strings or booleans', () => {
      const bools = [true, true, false, true];
      assert.deepStrictEqual(compressRle(bools), [
        { value: true, count: 2 },
        { value: false, count: 1 },
        { value: true, count: 1 },
      ]);
    });
  });

  describe('decompressRle', () => {
    it('returns empty array when runs are empty', () => {
      assert.deepStrictEqual(decompressRle([]), []);
    });

    it('reconstructs original sequence from runs', () => {
      const runs: RleRun<number>[] = [
        { value: 1, count: 3 },
        { value: 0, count: 2 },
        { value: 1, count: 1 },
      ];
      assert.deepStrictEqual(decompressRle(runs), [1, 1, 1, 0, 0, 1]);
    });

    it('throws RangeError when run count is 0 or negative', () => {
      assert.throws(() => decompressRle([{ value: 1, count: 0 }]), RangeError);
      assert.throws(() => decompressRle([{ value: 1, count: -3 }]), RangeError);
    });

    it('throws RangeError when run count is not an integer', () => {
      assert.throws(() => decompressRle([{ value: 1, count: 2.5 }]), RangeError);
    });

    it('preserves complete round-trip integrity on a 365-day habit streak', () => {
      const days = Array.from({ length: 365 }, (_, i) => (i % 7 === 0 ? 0 : 1));
      const compressed = compressRle(days);
      const decompressed = decompressRle(compressed);
      assert.deepStrictEqual(decompressed, days);
    });
  });

  describe('compressBinaryStreak', () => {
    it('compresses binary string into compact formatted representation', () => {
      assert.strictEqual(compressBinaryStreak('1111100011'), '5:1,3:0,2:1');
      assert.strictEqual(compressBinaryStreak('1111100'), '5:1,2:0');
    });

    it('compresses number array into compact formatted representation', () => {
      assert.strictEqual(
        compressBinaryStreak([1, 1, 1, 1, 1, 0, 0, 0, 1, 1]),
        '5:1,3:0,2:1'
      );
    });

    it('returns empty string for empty input', () => {
      assert.strictEqual(compressBinaryStreak(''), '');
      assert.strictEqual(compressBinaryStreak([]), '');
    });

    it('throws TypeError if string contains non-binary characters', () => {
      assert.throws(() => compressBinaryStreak('1100201'), TypeError);
      assert.throws(() => compressBinaryStreak('abc'), TypeError);
    });
  });

  describe('decompressBinaryStreak', () => {
    it('decompresses formatted string back to binary number array', () => {
      assert.deepStrictEqual(
        decompressBinaryStreak('5:1,3:0,2:1'),
        [1, 1, 1, 1, 1, 0, 0, 0, 1, 1]
      );
    });

    it('returns empty array for empty or whitespace-only string', () => {
      assert.deepStrictEqual(decompressBinaryStreak(''), []);
      assert.deepStrictEqual(decompressBinaryStreak('   '), []);
    });

    it('verifies round-trip fidelity between string compressor and decompressor', () => {
      const original = '11111110001010111100';
      const compressed = compressBinaryStreak(original);
      const decompressed = decompressBinaryStreak(compressed);
      assert.strictEqual(decompressed.join(''), original);
    });

    it('throws RangeError for invalid segment format or invalid count', () => {
      assert.throws(() => decompressBinaryStreak('invalid'), RangeError);
      assert.throws(() => decompressBinaryStreak('0:1'), RangeError);
      assert.throws(() => decompressBinaryStreak('-5:1'), RangeError);
      assert.throws(() => decompressBinaryStreak('1.5:1'), RangeError);
    });
  });
});
