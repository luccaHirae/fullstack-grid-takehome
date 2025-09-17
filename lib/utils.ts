export function colLetter(idx: number): string {
  const A = 'A'.charCodeAt(0);
  let n = idx;
  let s = '';
  do {
    s = String.fromCharCode(A + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
