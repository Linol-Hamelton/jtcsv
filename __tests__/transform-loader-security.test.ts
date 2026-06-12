/**
 * Phase 2 Week 6 — Test M3 transform-loader security harness.
 *
 * Locks the security posture of `src/utils/transform-loader.ts` — the
 * one Node-only escape hatch in jtcsv that loads user-supplied
 * JavaScript via vm.Script. Every test in this file documents an
 * invariant the loader must hold for it to ship with the package.
 *
 * What this file does NOT claim:
 *   - That vm.createContext is a security boundary. It is NOT —
 *     loaded code can call require() and reach anything Node can.
 *     That property is documented in THREAT_MODEL.md and surfaced
 *     to users via the (forthcoming) `--allow-unsafe-transforms`
 *     CLI flag. This test file LOCKS the input-validation, path-
 *     traversal, and basic safety-pattern detection layers — the
 *     defense-in-depth that makes accidental misuse loud.
 */
import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  loadTransform,
  loadTransformAsync,
  createTransformHook,
  applyTransform,
  applyTransformAsync,
  validateTransformFunction,
  validateTransformSafety,
} from '../src/utils/transform-loader';
import { ValidationError, SecurityError } from '../errors';

// Each test that needs a real transform file writes it under a
// per-test-run tmp dir. We clean up at the end.
let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jtcsv-tl-'));
});

afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

function writeTransform(name: string, contents: string): string {
  const p = path.join(tmpDir, name);
  fs.writeFileSync(p, contents);
  return p;
}

/* ============================ Input validation ============================ */
describe('loadTransform — input validation', () => {
  test('empty string throws ValidationError', () => {
    expect(() => loadTransform('')).toThrow(ValidationError);
  });

  test('non-string input throws ValidationError', () => {
    expect(() => loadTransform(null as unknown as string)).toThrow(ValidationError);
    expect(() => loadTransform(undefined as unknown as string)).toThrow(ValidationError);
    expect(() => loadTransform(42 as unknown as string)).toThrow(ValidationError);
  });

  test('missing file throws ValidationError mentioning the path', () => {
    expect(() => loadTransform('/nonexistent-jtcsv-test-file.js')).toThrow(/not found/i);
  });

  test('non-.js extension is rejected', () => {
    const p = writeTransform('not-a-js.txt', 'module.exports = (r) => r;');
    expect(() => loadTransform(p)).toThrow(/\.js extension/i);
  });

  test('.JS uppercase is accepted (case-insensitive check)', () => {
    const p = writeTransform('upper.JS', 'module.exports = (r) => r;');
    const fn = loadTransform(p);
    expect(typeof fn).toBe('function');
  });
});

/* ============================ Path traversal ============================== */
describe('loadTransform — path-traversal hardening', () => {
  test('relative ../ paths are rejected', () => {
    expect(() => loadTransform('../secret.js')).toThrow(SecurityError);
  });

  test('windows-style ..\\ paths are rejected', () => {
    expect(() => loadTransform('subdir\\..\\..\\evil.js')).toThrow(SecurityError);
  });

  test('embedded /../ is rejected even mid-path', () => {
    expect(() => loadTransform('safe/../../evil.js')).toThrow(SecurityError);
  });

  test('plain leading "../" is rejected', () => {
    expect(() => loadTransform('../../../etc/passwd.js')).toThrow(SecurityError);
  });

  test('absolute-but-clean path is accepted (not a traversal)', () => {
    const p = writeTransform('clean.js', 'module.exports = (r) => r;');
    const fn = loadTransform(p);
    expect(typeof fn).toBe('function');
  });
});

/* ============================ Export formats ============================== */
describe('loadTransform — supported export shapes', () => {
  test('module.exports = function', () => {
    const p = writeTransform('me.js', 'module.exports = function (r) { return { ...r, ok: 1 }; };');
    const fn = loadTransform(p);
    expect(fn({ a: 1 }, 0)).toEqual({ a: 1, ok: 1 });
  });

  test('module.exports.default — picks .default off the namespace', () => {
    const p = writeTransform('def.js', 'module.exports.default = function (r) { return { ...r, dx: 1 }; };');
    const fn = loadTransform(p);
    expect(fn({ a: 1 }, 0)).toEqual({ a: 1, dx: 1 });
  });

  test('exports.transform pattern fails validation — arity 1 only', () => {
    // The loader picks module.exports first; named exports without a
    // function value fall through to validateTransformFunction which
    // throws. Documented behaviour.
    const p = writeTransform('named.js', 'exports.transform = function (r) { return r; };');
    expect(() => loadTransform(p)).toThrow(ValidationError);
  });

  test('module.exports = arrow with 2 args (row, index)', () => {
    const p = writeTransform('arrow.js', 'module.exports = (r, i) => ({ ...r, idx: i });');
    const fn = loadTransform(p);
    expect(fn({ a: 1 }, 7)).toEqual({ a: 1, idx: 7 });
  });
});

/* ============================ Function shape ============================== */
describe('validateTransformFunction', () => {
  test('returns true for arity-1 function', () => {
    expect(validateTransformFunction((row: unknown) => row)).toBe(true);
  });

  test('returns true for arity-2 function', () => {
    expect(validateTransformFunction((row: unknown, _i: number) => row)).toBe(true);
  });

  test('rejects arity-0 function', () => {
    expect(() => validateTransformFunction(() => null)).toThrow(ValidationError);
  });

  test('rejects arity-3 function', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expect(() => validateTransformFunction((_a: unknown, _b: number, _c: unknown) => null)).toThrow(ValidationError);
  });

  test('non-function input throws ValidationError', () => {
    expect(() => validateTransformFunction({} as unknown as () => void)).toThrow(ValidationError);
  });
});

/* ============================ createTransformHook ========================= */
describe('createTransformHook — caller-provided function', () => {
  test('accepts a function directly (no file load)', () => {
    const hook = createTransformHook((r: { a: number }, i: number) => ({ ...r, i }));
    expect(hook({ a: 1 }, 0, {})).toEqual({ a: 1, i: 0 });
  });

  test('accepts a path string and resolves via loadTransform', () => {
    const p = writeTransform('hookpath.js', 'module.exports = (r) => ({ ...r, h: 1 });');
    const hook = createTransformHook(p);
    expect(hook({ a: 1 }, 0, {})).toEqual({ a: 1, h: 1 });
  });

  test('rejects non-string non-function input', () => {
    expect(() => createTransformHook(42 as unknown as string)).toThrow(ValidationError);
  });

  test('throwing transform — hook returns the original row, does not crash', () => {
    // Silence the loader's intentional console.error for this test —
    // the hook logs but returns the original row.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const hook = createTransformHook((_r: unknown) => {
      throw new Error('boom');
    });
    const out = hook({ a: 1 }, 0, {});
    expect(out).toEqual({ a: 1 });
    spy.mockRestore();
  });
});

/* ============================ applyTransform ============================== */
describe('applyTransform / applyTransformAsync', () => {
  test('applies a transform across an array', () => {
    const out = applyTransform([{ a: 1 }, { a: 2 }], (r: { a: number }, i: number) => ({ ...r, i }));
    expect(out).toEqual([{ a: 1, i: 0 }, { a: 2, i: 1 }]);
  });

  test('rejects non-array data', () => {
    expect(() => applyTransform('not-array' as unknown as unknown[], (r) => r)).toThrow(ValidationError);
  });

  test('async variant matches sync for small arrays', async () => {
    const data = [{ a: 1 }, { a: 2 }, { a: 3 }];
    const out = await applyTransformAsync(data, (r: { a: number }) => ({ ...r, ok: 1 }));
    expect(out).toEqual([{ a: 1, ok: 1 }, { a: 2, ok: 1 }, { a: 3, ok: 1 }]);
  });
});

/* ====================== validateTransformSafety (heuristic) =============== */
describe('validateTransformSafety — heuristic dangerous-pattern detector', () => {
  // This is documentation-of-known-patterns, not a security boundary.
  // We test that the documented patterns ARE flagged so callers can
  // surface them in CLI output.

  test('clean function returns safe=true, issues=[]', () => {
    const res = validateTransformSafety((r: unknown) => r);
    expect(res.safe).toBe(true);
    expect(res.issues).toEqual([]);
  });

  test('eval() usage is flagged', () => {
    const res = validateTransformSafety((r: unknown) => eval('r'));
    expect(res.safe).toBe(false);
    expect(res.issues.some((s) => s.includes('eval('))).toBe(true);
  });

  test('new Function() usage is flagged', () => {
    // eslint-disable-next-line no-new-func
    const res = validateTransformSafety(() => new Function('return 1'));
    expect(res.safe).toBe(false);
    expect(res.issues.some((s) => s.toLowerCase().includes('new function'))).toBe(true);
  });

  test('require() usage is flagged', () => {
    const res = validateTransformSafety((r: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('fs');
    });
    expect(res.safe).toBe(false);
    expect(res.issues.some((s) => s.includes('require('))).toBe(true);
  });

  test('fs.X usage is flagged', () => {
    // Build the function via Function so the source carries a literal
    // `fs.readFileSync` token — that's what the heuristic substring-scans for.
    // eslint-disable-next-line no-new-func
    const wrapper = new Function('fs', 'return function(r){ return fs.readFileSync("/etc/passwd"); }');
    const fn = wrapper({ readFileSync: () => '' });
    const res = validateTransformSafety(fn);
    expect(res.safe).toBe(false);
    expect(res.issues.some((s) => s.toLowerCase().includes('fs.'))).toBe(true);
  });

  test('setTimeout usage is flagged', () => {
    const res = validateTransformSafety(() => {
      setTimeout(() => null, 100);
      return null;
    });
    expect(res.safe).toBe(false);
    expect(res.issues.some((s) => s.toLowerCase().includes('settimeout'))).toBe(true);
  });

  test('infinite-loop pattern `while(true)` is flagged', () => {
    // The heuristic looks for the literal `while(true)` substring (no space).
    // Build the function via the Function constructor so the body source
    // carries that exact token even after engine reformatting.
    // eslint-disable-next-line no-new-func
    const fn = new Function('return function(r){ while(true){ break; } }')();
    const res = validateTransformSafety(fn);
    expect(res.safe).toBe(false);
    expect(res.issues.some((s) => s.toLowerCase().includes('infinite loop'))).toBe(true);
  });
});

/* ============================ loadTransformAsync ========================== */
describe('loadTransformAsync — async variant parity', () => {
  test('rejects missing file', async () => {
    await expect(loadTransformAsync('/nonexistent-jtcsv-async.js')).rejects.toBeInstanceOf(ValidationError);
  });

  test('rejects directory traversal', async () => {
    await expect(loadTransformAsync('../../etc.js')).rejects.toBeInstanceOf(SecurityError);
  });

  test('loads same shape as sync variant', async () => {
    const p = writeTransform('async-ok.js', 'module.exports = (r) => ({ ...r, ok: 1 });');
    const fn = await loadTransformAsync(p);
    expect(fn({ a: 1 }, 0)).toEqual({ a: 1, ok: 1 });
  });
});

/* ============================ Error semantics ============================= */
describe('Error type discrimination', () => {
  test('path traversal → SecurityError (not ValidationError)', () => {
    try {
      loadTransform('../evil.js');
      throw new Error('did not throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SecurityError);
      expect(e).not.toBeInstanceOf(ValidationError);
    }
  });

  test('bad input shape → ValidationError (not SecurityError)', () => {
    try {
      loadTransform('');
      throw new Error('did not throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect(e).not.toBeInstanceOf(SecurityError);
    }
  });

  test('parse error in transform code → ValidationError wrapping the cause', () => {
    const p = writeTransform('syntax-err.js', 'module.exports = function ( {{');
    expect(() => loadTransform(p)).toThrow(ValidationError);
  });
});
