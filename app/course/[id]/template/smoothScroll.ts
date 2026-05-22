// ============================================================
// Apple-style smooth scroll
// ------------------------------------------------------------
// The page has scroll listeners (e.g. StickyCTA) whose React
// re-renders cancel the browser's native `behavior: "smooth"`
// mid-animation. This rAF-driven scroll is immune: each frame is
// an instant jump, and the target is re-measured every frame so
// layout shifts (lazy images, reveal animations) can't break it.
// ============================================================

// easeInOutCubic — slow start, quick middle, soft landing (Apple feel)
const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

let activeAnimationId: number | null = null;

/**
 * Smoothly scroll the window so that `target` sits `offset` px below
 * the top of the viewport. Re-reads the target position every frame.
 */
export function smoothScrollToElement(target: HTMLElement, offset = 80) {
    // Honor reduced-motion preference — jump instantly.
    const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const destinationFor = () =>
        Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);

    if (reduceMotion) {
        window.scrollTo(0, destinationFor());
        return;
    }

    // Cancel any in-flight animation so taps don't stack.
    if (activeAnimationId !== null) cancelAnimationFrame(activeAnimationId);

    const startY = window.scrollY;
    const startTime = performance.now();
    // Duration scales with distance but stays in a pleasant range.
    const distance = Math.abs(destinationFor() - startY);
    const duration = Math.min(900, Math.max(450, distance * 0.5));

    const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const eased = easeInOutCubic(progress);
        // Re-measure the destination each frame so layout shifts self-correct.
        const currentY = startY + (destinationFor() - startY) * eased;
        window.scrollTo(0, currentY);

        if (progress < 1) {
            activeAnimationId = requestAnimationFrame(step);
        } else {
            activeAnimationId = null;
        }
    };

    activeAnimationId = requestAnimationFrame(step);
}

/** Convenience: scroll to an element by id (no-op if missing). */
export function smoothScrollToId(id: string, offset = 80) {
    const el = document.getElementById(id);
    if (el) smoothScrollToElement(el, offset);
}
