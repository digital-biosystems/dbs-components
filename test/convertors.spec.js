import { parseConvertors } from '../src/utils/convertors.js';

describe('parseConvertors', () => {
  it('returns [] for empty input', () => {
    expect(parseConvertors('')).toEqual([]);
    expect(parseConvertors(null)).toEqual([]);
    expect(parseConvertors(undefined)).toEqual([]);
  });

  it('returns identity for 1,1', () => {
    const [fn] = parseConvertors('1,1');
    expect(fn(5)).toBe(5);
    expect(fn(-3.2)).toBe(-3.2);
  });

  it('parses numerator,denominator scaling', () => {
    const [fn] = parseConvertors('2,4');
    expect(fn(4)).toBe(2);
    expect(fn(0)).toBe(0);
  });

  it('parses numerator,denominator,addend', () => {
    const [fn] = parseConvertors('2,4,10');
    expect(fn(4)).toBe(12);
    expect(fn(0)).toBe(10);
  });

  it('handles 1/x including division by zero', () => {
    const [fn] = parseConvertors('1/x');
    expect(fn(4)).toBe(0.25);
    expect(fn(0)).toBe(Infinity);
  });

  it('compiles arithmetic expressions', () => {
    const [fn] = parseConvertors('x*2+1');
    expect(fn(3)).toBe(7);
  });

  it('handles multiple convertors in order', () => {
    const [a, b, c] = parseConvertors('1,2;x*10;1/x');
    expect(a(10)).toBe(5);
    expect(b(10)).toBe(100);
    expect(c(4)).toBe(0.25);
  });
});
