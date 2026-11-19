import { Audio, Video } from "@remotion/media";
import React from "react";
import { AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ACCENT, FONT, LIGHT_GRAY, Stretch, clamp, onLight, stretchCount } from "./ravelType";

/**
 * Ad 02 — 5 s, 30 fps, 1080x1920.
 * 0–2 s clutter (fast push) + VO «البيت صار زحمة؟» → 2–3 s match cut to the tidy room (same framing)
 * → 3–5 s unit door closed + padlock → «خزّن أغراضك الزايدة بأمان» + logo.
 */
export const AD02_FRAMES = 150;

const Clutter: React.FC = () => {
  const f = useCurrentFrame();
  // extra digital push for a faster, more energetic move through the mess
  const s = interpolate(f, [0, 66], [1.0, 1.22], { ...clamp, easing: Easing.in(Easing.quad) });
  const shake = Math.sin(f * 1.7) * interpolate(f, [0, 66], [2, 5], clamp);
  return (
    <AbsoluteFill style={{ scale: `${s}`, translate: `${shake}px ${shake * 0.6}px` }}>
      <Video src={staticFile("ad02/s1_clutter.mp4")} muted playbackRate={1.4} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

/** Match cut: identical framing, the clutter dissolves out with a soft light sweep. */
const Tidy: React.FC = () => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, 34], [1.22, 1.12], { ...clamp, easing: Easing.out(Easing.cubic) });
  const glow = interpolate(f, [0, 4, 14], [0.0, 0.35, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ scale: `${s}` }}>
        <Img src={staticFile("ad02/tidy.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "white", opacity: glow }} />
    </AbsoluteFill>
  );
};

const Unit: React.FC = () => {
  const f = useCurrentFrame();
  const inT = interpolate(f, [0, 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ translate: `${(1 - inT) * 1080}px 0px`, filter: `blur(${(1 - inT) * 24}px)` }}>
      <Video src={staticFile("ad02/s3_unit.mp4")} muted playbackRate={1.25} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

export const Ad02Five: React.FC = () => {
  const frame = useCurrentFrame();
  // match-cut wipe: tidy room revealed by a soft vertical sweep (left→right) between frames 60 and 68
  const wipe = interpolate(frame, [60, 68], [0, 100], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const k1 = stretchCount(frame, 6, 9);
  const vOut = interpolate(frame, [54, 60], [1, 0], clamp);
  const tagIn = interpolate(frame, [104, 112], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const logoIn = interpolate(frame, [116, 126], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ backgroundColor: LIGHT_GRAY, fontFamily: FONT, fontWeight: 900, direction: "rtl" }}>
      <Sequence from={0} durationInFrames={70}><Clutter /></Sequence>
      <Sequence from={60} durationInFrames={36}>
        <AbsoluteFill style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}><Tidy /></AbsoluteFill>
      </Sequence>
      <Sequence from={90} durationInFrames={60}><Unit /></Sequence>

      {/* VO caption — «زحمة» stretches */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, opacity: vOut }}>
        <div style={{ fontSize: 112, lineHeight: 1.15, textAlign: "center", ...onLight }}>
          <div>البيت صار</div>
          <Stretch before="زحـ" after="مة؟" count={k1} style={{ fontSize: 150 }} />
        </div>
        <div style={{ height: 10, borderRadius: 5, background: ACCENT, marginTop: 4, width: interpolate(k1, [0, 9], [60, 640], clamp) }} />
      </AbsoluteFill>

      {/* Tagline + logo over the closed unit */}
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 290 }}>
        <div style={{ opacity: tagIn, translate: `0px ${interpolate(tagIn, [0, 1], [30, 0])}px`, fontSize: 76, textAlign: "center", whiteSpace: "nowrap", ...onLight }}>
          خزّن أغراضك الزايدة بأمان
        </div>
        <Img
          src={staticFile("ad01/logo.png")}
          style={{
            width: 300,
            marginTop: 26,
            opacity: logoIn,
            translate: `0px ${interpolate(logoIn, [0, 1], [20, 0])}px`,
            filter: "drop-shadow(0 0 16px rgba(255,255,255,1)) drop-shadow(0 0 6px rgba(255,255,255,0.95))",
          }}
        />
      </AbsoluteFill>

      {/* Audio */}
      <Sequence from={0} durationInFrames={62}><Audio src={staticFile("ad02/clutter.mp3")} volume={0.5} /></Sequence>
      <Sequence from={6} durationInFrames={56}><Audio src={staticFile("ad02/vo.mp3")} volume={1} /></Sequence>
      <Sequence from={6} durationInFrames={24}><Audio src={staticFile("sfx/stretch.wav")} volume={0.35} /></Sequence>
      <Sequence from={56} durationInFrames={15}><Audio src={staticFile("sfx/whoosh_in.wav")} volume={0.45} /></Sequence>
      <Sequence from={84} durationInFrames={15}><Audio src={staticFile("sfx/whoosh_in.wav")} volume={0.35} /></Sequence>
      <Sequence from={60} durationInFrames={90}>
        <Audio src={staticFile("ad02/music.mp3")} volume={(f) => interpolate(f, [0, 8, 80, 90], [0, 0.4, 0.4, 0], clamp)} />
      </Sequence>
      <Sequence from={116} durationInFrames={30}><Audio src={staticFile("ad02/lock.mp3")} volume={0.6} /></Sequence>
    </AbsoluteFill>
  );
};
