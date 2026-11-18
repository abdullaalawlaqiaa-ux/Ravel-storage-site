import { loadFont } from "@remotion/fonts";
import React from "react";
import { Easing, interpolate, staticFile } from "remotion";

// Brand palette: light gray + navy primary (navy ≤ ~10–20 % of the frame), light-blue accent.
export const NAVY = "#152249";
export const LIGHT_GRAY = "#EEF1F5";
export const ACCENT = "#2EC5FF";
export const FONT = "Alexandria, AlexandriaLatin";

for (const w of ["500", "800", "900"]) {
  loadFont({ family: "Alexandria", url: staticFile(`fonts/Alexandria-arabic-${w}.woff2`), weight: w });
  loadFont({ family: "AlexandriaLatin", url: staticFile(`fonts/Alexandria-latin-${w}.woff2`), weight: w });
}

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const KASHIDA = "ـ";

/** Elastic stretch: kashida grows fast with a springy overshoot, then settles. */
export const stretchCount = (frame: number, start: number, max: number) => {
  const t = frame - start;
  if (t <= 0) return 0;
  const grow = interpolate(t, [0, 9], [0, max * 1.12], { ...clamp, easing: Easing.out(Easing.cubic) });
  const settle = interpolate(t, [9, 16], [max * 1.12, max], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return t < 9 ? grow : settle;
};

export const Stretch: React.FC<{
  before: string;
  after: string;
  count: number;
  style?: React.CSSProperties;
}> = ({ before, after, count, style }) => (
  <span style={{ whiteSpace: "nowrap", ...style }}>{before + KASHIDA.repeat(Math.max(0, Math.round(count))) + after}</span>
);

/** Navy headline sitting directly on a light wall (no box) — soft white halo for separation. */
export const onLight: React.CSSProperties = {
  color: NAVY,
  textShadow: "0 0 28px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.8)",
};

/** White text over busier/darker areas — navy-tinted soft shadow. */
export const onDark: React.CSSProperties = {
  color: "#FFFFFF",
  textShadow: "0 6px 26px rgba(21,34,73,0.65), 0 2px 6px rgba(21,34,73,0.5)",
};

/** Frosted-glass card (end card only). */
export const glass: React.CSSProperties = {
  background: "rgba(255,255,255,0.42)",
  backdropFilter: "blur(24px) saturate(1.25)",
  WebkitBackdropFilter: "blur(24px) saturate(1.25)",
  border: "2px solid rgba(255,255,255,0.8)",
  borderRadius: 40,
  boxShadow: "0 24px 70px rgba(21,34,73,0.18)",
};
