import { afterEach, describe, expect, it, vi } from 'vitest';

// Jeder Test mit frischem Modul, weil sfx den AudioContext einmalig anlegt
const fresh = () => import('./sfx');
const brokenContext = () => vi.fn(function () {
  throw new Error('kein Audio');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('sfx', () => {
  it('bleibt ohne Web Audio still und wirft nicht', async () => {
    const { sfx } = await fresh();
    for (const sound of Object.values(sfx)) expect(() => sound()).not.toThrow();
  });

  it('legt ausgeschaltet keinen AudioContext an', async () => {
    const AudioContext = brokenContext();
    vi.stubGlobal('AudioContext', AudioContext);
    const { sfx, setEffectsEnabled } = await fresh();
    setEffectsEnabled(false);
    sfx.tap();
    expect(AudioContext).not.toHaveBeenCalled();
    setEffectsEnabled(true);
    expect(() => sfx.tap()).not.toThrow();
    expect(AudioContext).toHaveBeenCalledTimes(1);
  });

  it('wartet auf die erste Berührung', async () => {
    const AudioContext = brokenContext();
    vi.stubGlobal('AudioContext', AudioContext);
    vi.stubGlobal('navigator', { userActivation: { hasBeenActive: false } });
    const { sfx } = await fresh();
    sfx.shiny();
    expect(AudioContext).not.toHaveBeenCalled();
  });
});
