// ============================================================
// KhThemeChrome — sales-page theme shell
// Injects the --kh-* design tokens for the palette chosen by the
// admin (per course, via salesPage.theme.id), the brand gradient
// top bar, the graph-paper page background, and the shared .kh-*
// utility classes used by every section.
//
// The palette is fixed per course — visitors cannot change it.
// (Admins pick it in the Sales Page Editor → 🎨 ชุดสีของหน้านี้.)
// ============================================================
import type { ReactNode, CSSProperties } from "react";
import { buildThemeVars, getKhTheme } from "./khTheme";

export default function KhThemeChrome({
    children,
    themeId,
}: {
    children: ReactNode;
    /** kh-* palette id from salesPage.theme.id; falls back to the default (mint). */
    themeId?: string;
}) {
    const theme = getKhTheme(themeId);
    const vars = buildThemeVars(theme) as CSSProperties;

    return (
        <div className="kh-root min-h-screen" style={vars}>
            {/* Brand gradient strip on top of the menu */}
            <div className="kh-topbar" aria-hidden="true" />

            {children}

            <style>{`
                /* ===== Root: paper + graph grid (fine 32px / major 160px) + typography ===== */
                .kh-root {
                    background-color: var(--kh-paper);
                    background-image:
                        linear-gradient(to right, var(--kh-grid) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--kh-grid) 1px, transparent 1px),
                        linear-gradient(to right, var(--kh-grid2) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--kh-grid2) 1px, transparent 1px);
                    background-size: 32px 32px, 32px 32px, 160px 160px, 160px 160px;
                    color: var(--kh-body);
                    font-family: var(--font-ibm-loop), var(--font-sarabun), sans-serif;
                }
                .kh-topbar { position: fixed; top: 0; left: 0; right: 0; height: 5px; z-index: 60;
                    background: linear-gradient(90deg, var(--kh-p), var(--kh-s), var(--kh-cta1), var(--kh-acc)); }

                /* ===== Typography ===== */
                .kh-kanit, .kh-h1, .kh-h2, .kh-h3, .kh-num, .kh-cta-btn, .kh-ghost-btn, .kh-eyebrow {
                    font-family: var(--font-kanit), var(--font-mitr), sans-serif; }
                .kh-h1 { font-size: clamp(34px, 5.2vw, 62px); font-weight: 800; line-height: 1.25;
                    letter-spacing: -0.5px; color: var(--kh-ink); }
                .kh-h2 { font-size: clamp(26px, 3.6vw, 40px); font-weight: 700; line-height: 1.35;
                    letter-spacing: -0.4px; color: var(--kh-ink); }
                .kh-h3 { font-size: clamp(18px, 2.2vw, 22px); font-weight: 600; line-height: 1.45; color: var(--kh-ink); }
                .kh-sub { font-size: clamp(15px, 1.8vw, 18px); line-height: 1.65; color: var(--kh-mut); }
                .kh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600;
                    color: var(--kh-pText); background: var(--kh-pT); border: 1px solid var(--kh-pLine);
                    padding: 6px 14px; border-radius: 999px; }

                /* ===== Section shell ===== */
                .kh-sec { max-width: 1080px; margin: 0 auto; padding: clamp(52px, 7vw, 92px) 20px; }
                .kh-sec-head { text-align: center; max-width: 760px; margin: 0 auto clamp(28px, 4vw, 44px); }

                /* ===== Surfaces ===== */
                .kh-card { background: var(--kh-card); border: 1px solid var(--kh-line);
                    border-radius: 20px; box-shadow: var(--kh-shadow-sm); }
                .kh-lift { transition: transform .25s ease, box-shadow .25s ease; }
                .kh-lift:hover { transform: translateY(-4px); box-shadow: var(--kh-shadow); }
                .kh-dark { background: linear-gradient(135deg, var(--kh-d1), var(--kh-d2) 55%, var(--kh-d3));
                    color: var(--kh-onD); border-radius: 28px; box-shadow: var(--kh-shadow); }
                .kh-tintbox { background: var(--kh-tint); border: 1px solid var(--kh-pLine); border-radius: 20px; }

                /* ===== Buttons / chips ===== */
                .kh-cta-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                    background: linear-gradient(135deg, var(--kh-cta1), var(--kh-cta2));
                    color: var(--kh-ctaText); font-weight: 700; font-size: clamp(16px, 2vw, 19px);
                    padding: 15px 30px; border-radius: 15px; box-shadow: var(--kh-ctaShadow);
                    transition: transform .18s ease, filter .18s ease; cursor: pointer; }
                .kh-cta-btn:hover { transform: translateY(-2px) scale(1.015); filter: brightness(1.05); }
                .kh-cta-btn:active { transform: scale(.98); }
                .kh-ghost-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                    background: var(--kh-card); color: var(--kh-pText); font-weight: 600;
                    border: 1.5px solid var(--kh-pLine); padding: 13px 24px; border-radius: 13px;
                    transition: background .18s ease, transform .18s ease; cursor: pointer; }
                .kh-ghost-btn:hover { background: var(--kh-pT); transform: translateY(-1px); }
                .kh-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600;
                    background: var(--kh-card); border: 1px solid var(--kh-line); color: var(--kh-body);
                    padding: 7px 13px; border-radius: 999px; }

                /* ===== Accordion (curriculum + FAQ) ===== */
                .kh-accItem { background: var(--kh-card); border: 1px solid var(--kh-line); border-radius: 16px;
                    overflow: hidden; transition: border-color .3s ease, box-shadow .3s ease; }
                .kh-accItem.open { border-color: var(--kh-pLine); box-shadow: var(--kh-shadow-sm); }
                .kh-accHead { width: 100%; display: flex; align-items: center; gap: 14px; text-align: left;
                    padding: 18px 20px; cursor: pointer; background: transparent; }
                .kh-accPlus { flex-shrink: 0; width: 30px; height: 30px; border-radius: 10px;
                    display: grid; place-items: center; font-weight: 700; font-size: 18px; line-height: 1;
                    background: var(--kh-pT); color: var(--kh-pText);
                    transition: transform .45s cubic-bezier(.34,1.4,.5,1), background .3s, color .3s; }
                .kh-accItem.open .kh-accPlus { transform: rotate(135deg); background: var(--kh-p); color: #fff; }
                .kh-accBody { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .5s cubic-bezier(.3,1,.4,1); }
                .kh-accItem.open .kh-accBody { grid-template-rows: 1fr; }
                .kh-accInner { overflow: hidden; opacity: 0; transform: translateY(-6px);
                    transition: opacity .4s ease .08s, transform .45s ease .05s; }
                .kh-accItem.open .kh-accInner { opacity: 1; transform: translateY(0); }

                /* ===== Marquee (review strip) / auto-scroll (hero TOC) ===== */
                @keyframes kh-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                .kh-marquee { animation: kh-marquee var(--kh-marquee-dur, 38s) linear infinite; }
                .kh-marquee:hover { animation-play-state: paused; }
                @keyframes kh-vscroll { from { transform: translateY(0); } to { transform: translateY(-50%); } }
                .kh-vscroll { animation: kh-vscroll var(--kh-vscroll-dur, 26s) linear infinite; }
                .kh-vscroll:hover { animation-play-state: paused; }

                /* ===== Motion safety ===== */
                @media (prefers-reduced-motion: reduce) {
                    .kh-marquee, .kh-vscroll { animation: none; }
                    .kh-root *, .kh-root *::before, .kh-root *::after { transition: none !important; }
                }
            `}</style>
        </div>
    );
}
