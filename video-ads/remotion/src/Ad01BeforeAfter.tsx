import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

// Brand: light gray + navy are primary; navy kept to ~10-20% of the frame (text only).
const NAVY = "#152249"; // sampled from the official logo file
const LIGHT_GRAY = "#EEF1F5";
const ACCENT = "#2EC5FF";
const FONT = "Tajawal, TajawalLatin";

loadFont({ family: "Tajawal", url: staticFile("fonts/Tajawal-800.woff2"), weight: "800" });
loadFont({ family: "Tajawal", url: staticFile("fonts/Tajawal-500.woff2"), weight: "500" });
loadFont({ family: "TajawalLatin", url: staticFile("fonts/Tajawal-latin-800.woff2"), weight: "800" });
loadFont({ family: "TajawalLatin", url: staticFile("fonts/Tajawal-latin-500.woff2"), weight: "500" });

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const KASHIDA = "ـ";

/** Arabic word stretched with kashida (tatweel) inserted at a valid joining point. */
const Stretched: React.FC<{ before: string; after: string; count: number }> = ({ before, after, count }) => (
  <span>{before + KASHIDA.repeat(Math.max(0, Math.round(count))) + after}</span>
);

const Pill: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: "rgba(238,241,245,0.94)",
      borderRadius: 36,
      padding: "18px 44px 26px",
      boxShadow: "0 18px 50px rgba(21,34,73,0.18)",
      ...style,
    }}
  >
    {children}
  </div>
);

export const Ad01BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- Hook (frame 0): «زحمة؟» stretches from the very first frame
  const hookK = interpolate(frame, [0, 13], [0, 7], { ...clamp, easing: Easing.out(Easing.cubic) });
  const hookOut = interpolate(frame, [76, 84], [1, 0], clamp);
  // ---- then «ضاق» compresses right after the stretch
  const line2In = interpolate(frame, [14, 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const squeeze = interpolate(frame, [21, 27, 31], [1, 0.62, 0.7], { ...clamp, easing: Easing.inOut(Easing.cubic) });

  // ---- End line (5.0 s): «رد الراحة لبيتك.» with a light stretch on «الراحة»
  const endIn = interpolate(frame, [150, 158], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const endK = interpolate(frame, [161, 172], [0, 5], { ...clamp, easing: Easing.out(Easing.cubic) });
  const logoIn = interpolate(frame, [160, 170], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const endOut = interpolate(frame, [191, 199], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: LIGHT_GRAY, fontFamily: FONT, direction: "rtl" }}>
      <Video src={staticFile("ad01/bg.mp4")} muted />

      {/* Hook — top safe zone (y 260+), above the man's head */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 290, opacity: hookOut }}>
        <Pill style={{ paddingBottom: 12, paddingTop: 8 }}>
          <div style={{ fontSize: 150, fontWeight: 800, color: NAVY, lineHeight: 1.1, textAlign: "center" }}>
            <Stretched before="زحـ" after="مة؟" count={hookK} />
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: ACCENT,
              margin: "0 auto 8px",
              width: interpolate(frame, [0, 13], [40, 260], { ...clamp, easing: Easing.out(Easing.cubic) }),
            }}
          />
        </Pill>
      </AbsoluteFill>
      {/* Second line — on the open floor, above the bottom UI zone (y < 1500) */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1300, opacity: hookOut }}>
        <div
          style={{
            opacity: line2In,
            translate: `0px ${interpolate(line2In, [0, 1], [24, 0])}px`,
          }}
        >
          <Pill style={{ padding: "14px 40px 20px" }}>
            <div style={{ fontSize: 100, fontWeight: 800, color: NAVY, display: "flex", gap: 22, alignItems: "baseline" }}>
              <span>البيت</span>
              <span style={{ display: "inline-block", scale: `${squeeze} 1`, transformOrigin: "center", marginInline: (squeeze - 1) * 75 }}>ضاق</span>
              <span>عليك؟</span>
            </div>
          </Pill>
        </div>
      </AbsoluteFill>

      {/* End card — line at top, logo card on the floor below the sofa */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 290, opacity: endOut }}>
        <div style={{ opacity: endIn, translate: `0px ${interpolate(endIn, [0, 1], [26, 0])}px` }}>
          <Pill>
            <div style={{ fontSize: 100, fontWeight: 800, color: NAVY, display: "flex", gap: 24, alignItems: "baseline" }}>
              <span>رد</span>
              <Stretched before="الراحـ" after="ة" count={endK} />
              <span>لبيتك.</span>
            </div>
          </Pill>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1160, opacity: endOut }}>
        <div style={{ opacity: logoIn, translate: `0px ${interpolate(logoIn, [0, 1], [20, 0])}px` }}>
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              borderRadius: 32,
              padding: "26px 52px 22px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              boxShadow: "0 18px 50px rgba(21,34,73,0.14)",
            }}
          >
            <Img src={staticFile("ad01/logo.png")} style={{ width: 260 }} />
            <div style={{ marginTop: 14, fontSize: 44, fontWeight: 500, color: NAVY, direction: "ltr" }}>
              WhatsApp 050 325 0551
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Audio */}
      <Audio
        src={staticFile("ad01/music.mp3")}
        volume={(f) => interpolate(f, [0, 4, 196, 210], [0, 0.32, 0.32, 0.18], clamp)}
      />
      <Sequence from={0} durationInFrames={20}><Audio src={staticFile("sfx/whoosh_out.wav")} volume={0.35} /></Sequence>
      <Sequence from={0} durationInFrames={27}><Audio src={staticFile("sfx/stretch.wav")} volume={0.55} /></Sequence>
      <Sequence from={21} durationInFrames={11}><Audio src={staticFile("sfx/squish.wav")} volume={0.5} /></Sequence>
      {[30, 39, 50, 59].map((f) => (
        <Sequence key={f} from={f} durationInFrames={5}><Audio src={staticFile("sfx/click.wav")} volume={0.7} /></Sequence>
      ))}
      <Sequence from={30} durationInFrames={54}><Audio src={staticFile("sfx/whoosh_rise.wav")} volume={0.3} /></Sequence>
      <Sequence from={161} durationInFrames={49}><Audio src={staticFile("sfx/chime.wav")} volume={0.45} /></Sequence>
      <Sequence from={195} durationInFrames={15}><Audio src={staticFile("sfx/whoosh_in.wav")} volume={0.35} /></Sequence>
    </AbsoluteFill>
  );
};
