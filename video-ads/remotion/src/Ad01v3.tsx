import { Audio, Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ACCENT, FONT, LIGHT_GRAY, Stretch, clamp, onDark, onLight, stretchCount } from "./ravelType";

/**
 * Ad 01 v2 — 10 s, 30 fps, 1080x1920.
 * pile (sad) → loads own car → Ravel corridor → his unit → clean home, seated → end card.
 */
type Shot = { src: string; from: number; dur: number; rate?: number; trimStart?: number };
const SHOTS: Shot[] = [
  { src: "ad01v3/s1_pile.mp4", from: 0, dur: 50 },
  { src: "ad01v3/s2_car.mp4", from: 50, dur: 36, trimStart: 6 },
  { src: "ad01v3/s3_corridor.mp4", from: 86, dur: 46 },
  { src: "ad01v3/s4_unit.mp4", from: 132, dur: 40 },
  { src: "ad01v3/s5_home.mp4", from: 172, dur: 128, rate: 1.2 },
];
const T = 7; // whip transition length (frames)
export const AD01V3_FRAMES = 300;

/** Whip-pan between shots: outgoing slides left + blur, incoming arrives from the right. */
const ShotLayer: React.FC<{ shot: Shot; index: number }> = ({ shot, index }) => {
  const frame = useCurrentFrame(); // local to the Sequence
  const last = index === SHOTS.length - 1;
  const inT = index === 0 ? 1 : interpolate(frame, [0, T], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const outT = last ? 0 : interpolate(frame, [shot.dur - T, shot.dur], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const x = (1 - inT) * 1080 - outT * 1080;
  const blur = (1 - inT) * 28 + outT * 28;
  return (
    <AbsoluteFill style={{ translate: `${x}px 0px`, filter: `blur(${blur}px)` }}>
      <Video
        src={staticFile(shot.src)}
        muted
        playbackRate={shot.rate ?? 1}
        trimBefore={shot.trimStart ?? 0}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

export const Ad01v3: React.FC = () => {
  const frame = useCurrentFrame();

  // 1) Hook — «زحمة؟» stretches hard from frame 0
  const k1 = stretchCount(frame, 0, 11); // 518px → ~930px (measured), fits 1080 with margins
  const hookScale = interpolate(frame, [0, 8, 14], [1.06, 0.98, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const hookOut = interpolate(frame, [43, 50], [1, 0], clamp);
  // 2) «ضاق» compresses right after
  const l2In = interpolate(frame, [15, 21], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sq = interpolate(frame, [22, 27, 31], [1, 0.55, 0.66], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  // 3) «خزّن الزايد عندنا» over car → corridor → unit
  const l3In = interpolate(frame, [92, 100], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const l3Out = interpolate(frame, [160, 167], [1, 0], clamp);
  // 4) End line «رد الراحة لبيتك.» with a big stretch on «الراحة»
  const l4In = interpolate(frame, [228, 236], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const k4 = stretchCount(frame, 236, 9);
  const cardIn = interpolate(frame, [246, 258], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ backgroundColor: LIGHT_GRAY, fontFamily: FONT, fontWeight: 900, direction: "rtl" }}>
      {SHOTS.map((s, i) => (
        <Sequence key={s.src} from={s.from - (i === 0 ? 0 : T)} durationInFrames={s.dur + (i === 0 ? 0 : T)} premountFor={30}>
          <ShotLayer shot={{ ...s, dur: s.dur + (i === 0 ? 0 : T) }} index={i} />
        </Sequence>
      ))}

      {/* 1) Hook */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, opacity: hookOut }}>
        <div style={{ fontSize: 150, lineHeight: 1.1, scale: `${hookScale}`, ...onLight }}>
          <Stretch before="زحـ" after="مة؟" count={k1} />
        </div>
        <div
          style={{
            height: 12,
            borderRadius: 6,
            background: ACCENT,
            marginTop: 6,
            width: interpolate(k1, [0, 11], [60, 760], clamp),
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1260, opacity: hookOut }}>
        <div style={{ opacity: l2In, translate: `0px ${interpolate(l2In, [0, 1], [30, 0])}px`, fontSize: 96, display: "flex", gap: 24, ...onLight }}>
          <span>البيت</span>
          <span style={{ display: "inline-block", scale: `${sq} 1`, marginInline: (sq - 1) * 80 }}>ضاق</span>
          <span>عليك؟</span>
        </div>
      </AbsoluteFill>

      {/* 3) Message over the storage shots */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1250, opacity: l3In * l3Out }}>
        <div style={{ fontSize: 96, translate: `0px ${interpolate(l3In, [0, 1], [30, 0])}px`, ...onDark }}>
          خزّن الزايد عندنا
        </div>
      </AbsoluteFill>

      {/* 4) End */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
        <div style={{ opacity: l4In, translate: `0px ${interpolate(l4In, [0, 1], [30, 0])}px`, textAlign: "center", lineHeight: 1.15, ...onLight }}>
          <div style={{ fontSize: 120 }}>
            <Stretch before="رد الراحـ" after="ة" count={k4} />
          </div>
          <div style={{ fontSize: 96, marginTop: 10 }}>لبيتك.</div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 1150 }}>
        {/* Logo directly on the scene (no card) — soft white halo keeps it legible */}
        <div
          style={{
            opacity: cardIn,
            translate: `0px ${interpolate(cardIn, [0, 1], [40, 0])}px`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Img
            src={staticFile("ad01/logo.png")}
            style={{ width: 340, filter: "drop-shadow(0 0 14px rgba(255,255,255,0.95)) drop-shadow(0 0 4px rgba(255,255,255,0.9))" }}
          />
          <div style={{ marginTop: 10, fontSize: 52, fontWeight: 800, direction: "ltr", letterSpacing: 1, ...onLight }}>
            050 325 0551
          </div>
        </div>
      </AbsoluteFill>

      {/* Audio */}
      <Audio src={staticFile("ad01v3/music.mp3")} volume={(f) => interpolate(f, [0, 3, 285, 300], [0, 0.34, 0.34, 0], clamp)} />
      <Sequence from={0} durationInFrames={27}><Audio src={staticFile("sfx/stretch.wav")} volume={0.6} /></Sequence>
      <Sequence from={22} durationInFrames={11}><Audio src={staticFile("sfx/squish.wav")} volume={0.55} /></Sequence>
      {[50, 86, 132, 172].map((f) => (
        <Sequence key={f} from={f - T} durationInFrames={15}><Audio src={staticFile("sfx/whoosh_in.wav")} volume={0.35} /></Sequence>
      ))}
      <Sequence from={70} durationInFrames={20}><Audio src={staticFile("ad01v3/hatch.wav")} volume={0.45} /></Sequence>
      <Sequence from={140} durationInFrames={20}><Audio src={staticFile("ad01v3/thud.wav")} volume={0.5} /></Sequence>
      <Sequence from={236} durationInFrames={50}><Audio src={staticFile("sfx/chime.wav")} volume={0.45} /></Sequence>
    </AbsoluteFill>
  );
};
