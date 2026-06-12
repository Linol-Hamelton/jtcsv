/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * setup-fc-seed.js — make fast-check property tests reproducible.
 *
 * When JTCSV_FUZZ_SEED is set, configure fast-check globally to use that
 * seed. This makes CI runs deterministic (you can replay a failing run
 * locally with the same seed) while preserving the ability to do
 * exploratory runs by leaving the env var unset.
 *
 * The synthesis pins seed = 4242 for CI; local dev can override.
 *
 * Loaded via jest.setupFilesAfterEach so it runs *after* fast-check is
 * imported by the test file but *before* the property starts.
 */
const seedEnv = process.env.JTCSV_FUZZ_SEED;
if (seedEnv && /^\d+$/.test(seedEnv)) {
  // fast-check is an optional devDep at the moment; skip silently when
  // running a partial test slice that doesn't pull it in.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fc = require('fast-check');
    fc.configureGlobal({ seed: Number(seedEnv) });
  } catch {
    // Not installed — fuzz tests won't run anyway.
  }
}
