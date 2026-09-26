import { FmiBufferUtils } from '../src/fmi/FmiBufferUtils.js';
import { FmiBufferManager } from '../src/fmi/FmiBufferManager.js';

// Back mock Emscripten instance with a real ArrayBuffer and bump allocator.
function makeInst(byteSize = 4096) {
  const buffer = new ArrayBuffer(byteSize);
  const HEAPU8 = new Uint8Array(buffer);
  let nextPtr = 8;
  const inst = {
    HEAPU8,
    _malloc: jest.fn((n) => {
      // emulate 8-byte aligned malloc like Emscripten
      nextPtr = (nextPtr + 7) & ~7;
      const ptr = nextPtr;
      nextPtr += n;
      return ptr;
    }),
    _free: jest.fn(),
  };
  return inst;
}

describe('FmiBufferUtils', () => {
  it('createAndFillBuffer round-trips Float64 data', () => {
    const inst = makeInst();
    const input = new Float64Array([1.5, 2.5]);
    const buf = FmiBufferUtils.createAndFillBuffer(inst, input);
    expect(buf.size).toBe(16);
    expect(inst._malloc).toHaveBeenCalledWith(16);
    const view = new Float64Array(inst.HEAPU8.buffer, buf.ptr, 2);
    expect(Array.from(view)).toEqual([1.5, 2.5]);
  });

  it('sizes Int32Array by BYTES_PER_ELEMENT', () => {
    const inst = makeInst();
    const buf = FmiBufferUtils.createAndFillBuffer(inst, new Int32Array([1, 2, 3]));
    expect(buf.size).toBe(12);
  });

  it('viewBuffer returns a Uint8Array view of the same memory', () => {
    const inst = makeInst();
    const buf = FmiBufferUtils.createAndFillBuffer(inst, new Float64Array([9.5]));
    const view = FmiBufferUtils.viewBuffer(inst, buf);
    expect(view).toBeInstanceOf(Uint8Array);
    expect(view.length).toBe(buf.size);
    expect(new Float64Array(view.buffer, view.byteOffset, 1)[0]).toBe(9.5);
  });

  it('viewBuffer passes through raw values', () => {
    const inst = makeInst();
    expect(FmiBufferUtils.viewBuffer(inst, 123)).toBe(123);
  });

  it('freeBuffer frees object buffers and nulls fields', () => {
    const inst = makeInst();
    const buf = { ptr: 8, size: 16 };
    FmiBufferUtils.freeBuffer(inst, buf);
    expect(inst._free).toHaveBeenCalledWith(8);
    expect(buf.ptr).toBeNull();
    expect(buf.size).toBeNull();
  });

  it('freeBuffer frees raw pointers', () => {
    const inst = makeInst();
    FmiBufferUtils.freeBuffer(inst, 42);
    expect(inst._free).toHaveBeenCalledWith(42);
  });
});

describe('FmiBufferManager', () => {
  function makeFmi() {
    const inst = makeInst();
    return { inst, getReal: jest.fn(), getBoolean: jest.fn() };
  }

  it('create/fill/view/free round-trips data', () => {
    const fmi = makeFmi();
    const mgr = new FmiBufferManager(fmi);
    const buf = mgr.createAndFillBuffer(new Float64Array([3.25, 4.5]));
    const roundTrip = new Float64Array(mgr.viewBuffer(buf).buffer, mgr.viewBuffer(buf).byteOffset, 2);
    expect(Array.from(roundTrip)).toEqual([3.25, 4.5]);
    mgr.freeBuffer(buf);
    expect(buf.ptr).toBeNull();
    expect(fmi.inst._free).toHaveBeenCalled();
  });

  it('second free is a no-op', () => {
    const fmi = makeFmi();
    const mgr = new FmiBufferManager(fmi);
    const buf = mgr.createAndFillBuffer(new Float64Array([1]));
    mgr.freeBuffer(buf);
    const calls = fmi.inst._free.mock.calls.length;
    mgr.freeBuffer(buf);
    expect(fmi.inst._free.mock.calls.length).toBe(calls);
  });

  it('getSingleReal queries one reference and returns the value', () => {
    const fmi = makeFmi();
    fmi.getReal.mockImplementation((query, output, n) => {
      expect(n).toBe(1);
      new Float64Array(output.buffer, output.byteOffset, 1)[0] = 7.5;
    });
    const mgr = new FmiBufferManager(fmi);
    expect(mgr.getSingleReal(123)).toBe(7.5);
    expect(fmi.getReal).toHaveBeenCalledTimes(1);
    // both query and output buffers are freed
    expect(fmi.inst._free).toHaveBeenCalledTimes(2);
  });

  it('getReals returns all requested values', () => {
    const fmi = makeFmi();
    fmi.getReal.mockImplementation((query, output, n) => {
      new Float64Array(output.buffer, output.byteOffset, n).set([1.1, 2.2]);
    });
    const mgr = new FmiBufferManager(fmi);
    const result = mgr.getReals([10, 20]);
    expect(Array.from(result)).toEqual([1.1, 2.2]);
  });

  it('getSingleBoolean / getBooleans return integer values', () => {
    const fmi = makeFmi();
    fmi.getBoolean.mockImplementation((query, output, n) => {
      new Int32Array(output.buffer, output.byteOffset, n).set(Array(n).fill(1));
    });
    const mgr = new FmiBufferManager(fmi);
    expect(mgr.getSingleBoolean(5)).toBe(1);
    expect(Array.from(mgr.getBooleans([5, 6]))).toEqual([1, 1]);
  });
});
