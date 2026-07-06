import type { DiffLine } from '../types';

export function computeLineDiff(text1: string, text2: string): DiffLine[] {
  const lines1 = text1.split('\n');
  const lines2 = text2.split('\n');
  const m = lines1.length;
  const n = lines2.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      result.push({ type: 'unchanged', text: lines1[i - 1], line1: i, line2: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: lines2[j - 1], line1: null, line2: j });
      j--;
    } else {
      result.push({ type: 'removed', text: lines1[i - 1], line1: i, line2: null });
      i--;
    }
  }

  result.reverse();
  return result;
}
