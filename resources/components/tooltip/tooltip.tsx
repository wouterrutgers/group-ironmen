import { useEffect, useRef, type ReactElement } from "react";

import "./tooltip.css";

/**
 * The global singleton tooltip. It can be accessed by other tooltips with the
 * DOM id 'tooltip', and other tooltips should create a portal that attaches to
 * it.
 *
 * The tooltip has default visual styling and also floats by the cursor. If a
 * component wishes to populate the tooltip, all it needs to do is get a
 * reference to the node such as with a DOM query for '#tooltip', then use
 * createPortal and attach to that node.
 *
 * Tooltip visibility is based on whether or not it is populated i.e. has child
 * DOM nodes.
 */
export const Tooltip = (): ReactElement => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerMove = ({ clientX: x, clientY: y }: PointerEvent): void => {
      if (!elementRef.current) return;

      elementRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener("pointermove", handlePointerMove);
    return (): void => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div id="tooltip-container" ref={elementRef}>
      <div id="tooltip" />
    </div>
  );
};
