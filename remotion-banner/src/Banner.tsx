import React, { useEffect } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

// ─── Constants ────────────────────────────────────────────────────────────────
const CYAN = "#00e5ff";
const TEXT_CYAN = "#00D9FF";
const NAVY = "#060d1a";
const BLUE_SABER = "#4488ff";
const RED_SABER = "#ff4444";

// Figure geometry
const BASE_CY = 95;        // body-center y on the 160 px canvas
const SHOULDER_Y = BASE_CY - 18;  // = 77
const ARM_LEN = 18;
const SABER_LEN = 78;
// Left at cx=305 → shoulder=312 → max reach 312+96=408 ≈ center
// Right at cx=495 → shoulder=488 → max reach 488-96=392 ≈ center

// Fight resting positions
const L_CX = 305;
const R_CX = 495;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t);
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 2);
const phaseT = (f: number, s: number, e: number) => clamp((f - s) / (e - s));

// ─── Stars ────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: ((i * 137.508 + 50) % 780) + 10,
  y: ((i * 97.3 + 20) % 140) + 10,
  r: (i % 3) * 0.5 + 1,
  phase: (i * 41) % 100,
}));

// ─── Clash flash events (fight-local frames) ──────────────────────────────────
const CLASHES = [
  { f: 45,  cx: 400, cy: 102, r: 18 },  // Phase 1 — first diagonal clash
  { f: 75,  cx: 393, cy:  86, r: 11 },  // Phase 2 — horizontal deflect spark
  { f: 105, cx: 400, cy:  56, r: 22 },  // Phase 3 — overhead clash
  { f: 165, cx: 399, cy:  82, r: 13 },  // Phase 5 — thrust deflect
  { f: 195, cx: 402, cy: 106, r: 20 },  // Phase 6 — leap clash
];

// ─── Fight choreography ───────────────────────────────────────────────────────
interface FigureState {
  cx: number;
  cyOffset: number;   // vertical offset (negative = up, for leaps)
  saberAngle: number; // absolute radians: 0=right, π=left, -π/2=up, π/2=down
  legPhase: number;
  shakeX: number;
}

function getFightState(f: number): { L: FigureState; R: FigureState } {
  const phase = Math.min(7, Math.floor(f / 30));
  const t = phaseT(f, phase * 30, (phase + 1) * 30);
  const eo = easeOut(t);

  // defaults
  let L: FigureState = { cx: L_CX, cyOffset: 0, saberAngle: 0,      legPhase: 0, shakeX: 0 };
  let R: FigureState = { cx: R_CX, cyOffset: 0, saberAngle: Math.PI, legPhase: 0, shakeX: 0 };

  switch (phase) {

    // ── Phase 0 (f 0–30): Walk in ────────────────────────────────────────────
    case 0:
      L = { cx: lerp(60, L_CX, eo),  cyOffset: 0, saberAngle: 0,      legPhase: f * 0.42, shakeX: 0 };
      R = { cx: lerp(740, R_CX, eo), cyOffset: 0, saberAngle: Math.PI, legPhase: f * 0.42 + Math.PI, shakeX: 0 };
      break;

    // ── Phase 1 (f 30–60): First clash — diagonal swing meets block ──────────
    case 1:
      L = { cx: L_CX, cyOffset: 0, saberAngle: lerp(0, 0.38, eo),              legPhase: 0, shakeX: 0 };
      R = { cx: R_CX, cyOffset: 0, saberAngle: lerp(Math.PI, Math.PI - 0.38, eo), legPhase: 0, shakeX: 0 };
      break;

    // ── Phase 2 (f 60–90): Right horizontal sweep; left ducks + deflects ─────
    case 2:
      L = {
        cx: L_CX,
        cyOffset: lerp(0, 9, Math.sin(t * Math.PI)),  // duck arc
        saberAngle: lerp(0.38, -0.28, eo),             // saber up to deflect
        legPhase: 0,
        shakeX: 0,
      };
      R = {
        cx: R_CX,
        cyOffset: 0,
        saberAngle: lerp(Math.PI - 0.38, Math.PI + 0.38, eo), // sweep L→R (abs angle sweeps CW)
        legPhase: 0,
        shakeX: 0,
      };
      break;

    // ── Phase 3 (f 90–120): Left overhead spin arc; right steps back + blocks ─
    case 3:
      L = {
        cx: L_CX,
        cyOffset: 0,
        saberAngle: lerp(0.38, -(Math.PI - 0.25), t),  // wide CCW arc through top
        legPhase: 0,
        shakeX: 0,
      };
      R = {
        cx: lerp(R_CX, R_CX + 16, eo),                 // step back
        cyOffset: 0,
        saberAngle: lerp(Math.PI + 0.38, Math.PI * 0.6, eo), // raise to near-vertical block
        legPhase: 0,
        shakeX: 0,
      };
      break;

    // ── Phase 4 (f 120–150): Lock — bodies lean in, tremor ──────────────────
    case 4: {
      const lean = Math.sin(t * Math.PI) * 8;
      const shake = Math.sin(f * 2.3) * 2.2;
      L = {
        cx: lerp(L_CX, L_CX + lean, 1),
        cyOffset: 0,
        saberAngle: lerp(-(Math.PI - 0.25), 0.18, eo), // settle saber toward center
        legPhase: 0,
        shakeX: shake,
      };
      R = {
        cx: lerp(R_CX, R_CX - lean, 1),
        cyOffset: 0,
        saberAngle: Math.PI * 0.6,                      // hold vertical-ish
        legPhase: 0,
        shakeX: -shake,
      };
      break;
    }

    // ── Phase 5 (f 150–180): Right breaks lock, jumps back then thrusts ──────
    case 5:
      L = {
        cx: L_CX,
        cyOffset: 0,
        saberAngle: lerp(0.18, -0.62, eo),              // deflect thrust upward
        legPhase: 0,
        shakeX: 0,
      };
      R = {
        cx: t < 0.45
          ? lerp(R_CX, R_CX + 22, phaseT(f, 150, 163)) // jump back
          : lerp(R_CX + 22, R_CX - 5, phaseT(f, 163, 180)), // lunge forward
        cyOffset: 0,
        saberAngle: lerp(Math.PI * 0.6, Math.PI + 0.06, eo), // level thrust
        legPhase: 0,
        shakeX: 0,
      };
      break;

    // ── Phase 6 (f 180–210): Left low sweep; right leaps + parries mid-air ───
    case 6:
      L = {
        cx: L_CX,
        cyOffset: 0,
        saberAngle: lerp(-0.62, Math.PI / 2 + 0.12, eo), // sweep low (up-right→down)
        legPhase: 0,
        shakeX: 0,
      };
      R = {
        cx: R_CX,
        cyOffset: lerp(0, -22, Math.sin(t * Math.PI)),   // leap arc (negative = up)
        saberAngle: lerp(Math.PI + 0.06, Math.PI / 2 + 0.35, eo), // swing blade down to meet
        legPhase: 0,
        shakeX: 0,
      };
      break;

    // ── Phase 7 (f 210–240): Reset — step back to walk-in positions ──────────
    case 7:
      L = { cx: lerp(L_CX, 60, eo),  cyOffset: 0, saberAngle: lerp(Math.PI / 2 + 0.12, 0, eo),      legPhase: f * 0.42, shakeX: 0 };
      R = { cx: lerp(R_CX, 740, eo), cyOffset: 0, saberAngle: lerp(Math.PI / 2 + 0.35, Math.PI, eo), legPhase: f * 0.42 + Math.PI, shakeX: 0 };
      break;
  }

  return { L, R };
}

// ─── SVG components ───────────────────────────────────────────────────────────

function Scanlines() {
  const lines = [];
  for (let y = 0; y < 160; y += 20) {
    lines.push(<line key={y} x1={0} y1={y} x2={800} y2={y} stroke={CYAN} strokeWidth={1} opacity={0.04} />);
  }
  return <g>{lines}</g>;
}

function StarField({ frame }: { frame: number }) {
  return (
    <g>
      {STARS.map((s, i) => {
        const t = Math.sin((frame + s.phase) * 0.1) * 0.5 + 0.5;
        return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={t * 0.6 + 0.1} />;
      })}
    </g>
  );
}

/** Glowing lightsaber: glow (6 px, 60% opacity, saber colour) + core (2 px white) */
function Saber({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color}   strokeWidth={6} opacity={0.6} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white"   strokeWidth={2} opacity={1}   strokeLinecap="round" />
    </g>
  );
}

function StickFigure({ state, facing, saberColor }: { state: FigureState; facing: 1 | -1; saberColor: string }) {
  const cx = state.cx + state.shakeX;
  const cy = BASE_CY + state.cyOffset;

  const headY   = cy - 32;
  const shldrY  = cy - 18;
  const hipY    = cy + 8;
  const footY   = cy + 30;

  // Sword arm
  const shldrX = cx + facing * 7;
  const handX  = shldrX + Math.cos(state.saberAngle) * ARM_LEN;
  const handY  = shldrY + Math.sin(state.saberAngle) * ARM_LEN;
  const tipX   = handX  + Math.cos(state.saberAngle) * SABER_LEN;
  const tipY   = handY  + Math.sin(state.saberAngle) * SABER_LEN;

  // Passive back arm — hangs naturally
  const backArmX = cx - facing * 11;
  const backArmY = hipY - 6;

  // Walking legs
  const legSwing = Math.sin(state.legPhase) * 10;
  const sw = { stroke: "white" as const, strokeWidth: 1.5, fill: "none" as const };

  return (
    <g>
      <circle cx={cx} cy={headY} r={7}  {...sw} />
      <line   x1={cx}      y1={shldrY}    x2={cx}        y2={hipY}     {...sw} />
      <line   x1={cx - facing * 5} y1={shldrY + 4} x2={backArmX} y2={backArmY} {...sw} />
      <line   x1={cx}      y1={hipY}      x2={cx + legSwing}  y2={footY}  {...sw} />
      <line   x1={cx}      y1={hipY}      x2={cx - legSwing}  y2={footY}  {...sw} />
      <line   x1={shldrX}  y1={shldrY}    x2={handX}     y2={handY}    {...sw} />
      <Saber x1={handX} y1={handY} x2={tipX} y2={tipY} color={saberColor} />
    </g>
  );
}

function FlashBursts({ fightFrame }: { fightFrame: number }) {
  return (
    <g>
      {CLASHES.map((e, i) => {
        const df = fightFrame - e.f;
        if (df < 0 || df >= 3) return null;
        const op = 1 - df / 3;
        return (
          <g key={i}>
            <circle cx={e.cx} cy={e.cy} r={e.r * 1.9} fill={CYAN}  opacity={op * 0.28} />
            <circle cx={e.cx} cy={e.cy} r={e.r}        fill="white" opacity={op * 0.92} />
          </g>
        );
      })}
    </g>
  );
}

function FightScene({ fightFrame }: { fightFrame: number }) {
  const lf = fightFrame % 240;
  const { L, R } = getFightState(lf);
  return (
    <g>
      <FlashBursts fightFrame={lf} />
      <StickFigure state={L} facing={1}  saberColor={BLUE_SABER} />
      <StickFigure state={R} facing={-1} saberColor={RED_SABER}  />
    </g>
  );
}

// ─── Letter drop (HTML for text-shadow support) ───────────────────────────────
function LetterDrop({ frame }: { frame: number }) {
  const letters = "ABRAHAM BHATTI".split("");
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {letters.map((ch, i) => {
          if (ch === " ") return <div key={i} style={{ width: 18 }} />;
          const progress = clamp((frame - i * 3) / 15);
          const eased = 1 - Math.pow(1 - progress, 3);
          return (
            <span key={i} style={{
              display: "inline-block",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 30,
              color: TEXT_CYAN,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textShadow: "0 0 10px rgba(0,217,255,0.8), 0 0 28px rgba(0,217,255,0.5), 0 0 55px rgba(0,217,255,0.3)",
              transform: `translateY(${(1 - eased) * -110}px)`,
              opacity: eased,
            }}>
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Root composition ─────────────────────────────────────────────────────────
export const Banner: React.FC = () => {
  const frame = useCurrentFrame();

  // Inject Press Start 2P once
  useEffect(() => {
    if (!document.querySelector('link[href*="Press+Start"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const showLetters = frame < 60;
  const showFight   = frame >= 60;

  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <svg width={800} height={160} viewBox="0 0 800 160" style={{ position: "absolute", top: 0, left: 0 }}>
        <Scanlines />
        <StarField frame={frame} />
        {/* Cyan borders */}
        <line x1={0} y1={1}   x2={800} y2={1}   stroke={CYAN} strokeWidth={2} />
        <line x1={0} y1={159} x2={800} y2={159} stroke={CYAN} strokeWidth={2} />
        {/* Fight scene */}
        {showFight && <FightScene fightFrame={frame - 60} />}
      </svg>
      {/* Letter drop overlaid as HTML for proper text-shadow */}
      {showLetters && <LetterDrop frame={frame} />}
    </AbsoluteFill>
  );
};
