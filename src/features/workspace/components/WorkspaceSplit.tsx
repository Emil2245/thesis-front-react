/* Required ARIA roles and focusable regions are part of the Plan 082 contract. */
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/prefer-tag-over-role */

import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

const MIN = 40;
const MAX = 60;

export function WorkspaceSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [leftPercent, setLeftPercent] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const setFromPointer = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setLeftPercent(Math.min(MAX, Math.max(MIN, ((event.clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 1;
    if (event.key === "ArrowLeft") setLeftPercent((value) => Math.max(MIN, value - step));
    else if (event.key === "ArrowRight") setLeftPercent((value) => Math.min(MAX, value + step));
    else if (event.key === "Home") setLeftPercent(MIN);
    else if (event.key === "End") setLeftPercent(MAX);
    else return;
    event.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      style={{
        gridTemplateColumns: `minmax(0, ${leftPercent}fr) auto minmax(0, ${100 - leftPercent}fr)`,
      }}
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden md:grid md:gap-0"
    >
      {/* Required keyboard navigation for the labelled workspace pane. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div
        role="region"
        tabIndex={0}
        aria-label="Presupuesto"
        className="min-h-0 min-w-0 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-start-1 md:pr-4"
      >
        {left}
      </div>
      {/* Required ARIA separator contract for keyboard and assistive technology users. */}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role */}
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Separador del workspace"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={leftPercent}
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event);
        }}
        className="hidden w-3 cursor-col-resize touch-none items-stretch justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-start-2 md:flex"
      >
        <span className="w-px bg-border" />
      </div>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div
        role="region"
        tabIndex={0}
        aria-label="Detalle del proyecto"
        className="min-h-0 min-w-0 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-ring md:col-start-3 md:pl-4"
      >
        {right}
      </div>
    </div>
  );
}
