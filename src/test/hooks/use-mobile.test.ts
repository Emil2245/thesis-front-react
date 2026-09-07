import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useIsMobile } from "@/hooks/use-mobile";

const matchMediaOriginal = window.matchMedia;

/**
 * `matchMedia` controlable: el stub global de `setup.ts` devuelve siempre
 * `matches: false` y listeners que no hacen nada, así que aquí hace falta uno
 * propio para poder mover el viewport.
 */
function instalarMatchMedia(matchesInicial: boolean) {
  const listeners = new Set<() => void>();
  let matches = matchesInicial;

  Object.defineProperty(window, "matchMedia", {
    value: (media: string) => ({
      get matches() {
        return matches;
      },
      media,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    }),
    writable: true,
    configurable: true,
  });

  return {
    mover(nuevo: boolean) {
      matches = nuevo;
      act(() => listeners.forEach((cb) => cb()));
    },
    get suscritos() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    value: matchMediaOriginal,
    writable: true,
    configurable: true,
  });
});

describe("useIsMobile", () => {
  it("desde el primer render dice si el viewport es móvil", () => {
    instalarMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("es falso en un viewport de escritorio", () => {
    instalarMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("reacciona a un cambio de viewport", () => {
    const mql = instalarMatchMedia(false);
    const { result } = renderHook(() => useIsMobile());

    mql.mover(true);

    expect(result.current).toBe(true);
  });

  it("se da de baja del listener al desmontar", () => {
    const mql = instalarMatchMedia(false);
    const { unmount } = renderHook(() => useIsMobile());
    expect(mql.suscritos).toBe(1);

    unmount();

    expect(mql.suscritos).toBe(0);
  });
});
