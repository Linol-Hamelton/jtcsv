/**
 * Deprecation runtime warning helper.
 *
 * Wraps a function so the first call (per-process, per-name) emits a
 * `DeprecationWarning` via `process.emitWarning`. Subsequent calls run
 * silently, so log volume stays bounded. Browser builds get a no-op
 * `process` shim from rollup, so the wrapper simply forwards the call.
 *
 * Removal target for current aliases: jtcsv 5.0.
 */

const warned = new Set<string>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

export function deprecate<F extends AnyFn>(
  fn: F,
  name: string,
  replacement: string,
  removal = '5.0'
): F {
  const wrapper = function (this: unknown, ...args: Parameters<F>): ReturnType<F> {
    if (!warned.has(name)) {
      warned.add(name);
      const msg =
        `${name}() is deprecated and will be removed in jtcsv ${removal}. ` +
        `Use ${replacement}() instead.`;
      // process.emitWarning is Node-only; guard so the helper also works in
      // browser/worker bundles where rollup provides a process shim or none.
      if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
        try {
          process.emitWarning(msg, {
            type: 'DeprecationWarning',
            code: `JTCSV_DEP_${name.toUpperCase()}`,
          });
        } catch {
          // Ignore: some Node builds reject unknown emitWarning options.
        }
      } else if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        // eslint-disable-next-line no-console
        console.warn(`[DeprecationWarning] ${msg}`);
      }
    }
    return fn.apply(this, args) as ReturnType<F>;
  };
  // Preserve the original function name so stack traces stay readable.
  Object.defineProperty(wrapper, 'name', { value: name, configurable: true });
  return wrapper as unknown as F;
}

/**
 * Test-only: clear the seen-warnings cache so tests can assert "warns once
 * per process" without leaking state between cases.
 */
export function _resetDeprecationWarnings(): void {
  warned.clear();
}
