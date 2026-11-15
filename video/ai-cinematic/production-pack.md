# Ravel Storage — cinematic AI clip (17 s, 9:16) — v3 (after 2 reviews)

**One-line idea:** Your things go into a clean, warm, secure unit, and stay there safely.

Output: 1080×1920, 24 fps, 17 s. Generate at 720p (720×1280), upscale to 1080p in the edit.
No logos or captions in the generated footage. The only lettering is the short unit numbers on plates (see risk 1).

## Color plan
| Element | HEX |
|---|---|
| Walls | #F4F1EA warm white |
| Floor | #D9CBB3 light beige polished concrete |
| Roller doors | #4A78A8 muted steel blue, ribbed metal |
| Interior light | #FFD9A8 warm 3200 K glow |
| Worker t-shirt | #1F2A44 plain navy (short sleeves) |
| Worker skin | medium-brown South Asian skin tone |
| Cardboard | #C9A27A |
| Shelving / rail | #9CA3AD brushed steel |

## Style sentence (pasted in full into every prompt below)
> Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood.

## Shot list
| Shot | In film | Generate | Size | Camera | What moves | Frames used |
|---|---|---|---|---|---|---|
| 1 Door reveal | 0.0–4.0 | 5 s | Medium-wide | Tilts down from shutter housing to room as the door rises | Door, light spill | first + last |
| 2a Boxes | 4.0–6.0 | 4 s | Medium close | Slight downward drift, shelf stays centered | Hands set a box down | first |
| 2b Clothes rail | 6.0–8.0 | 4 s | Medium, waist height | Slight downward drift | One arm pushes rail away from camera | first |
| 2c Bicycle | 8.0–10.0 | 4 s | Medium-wide | Slight downward drift | Arm tilts bike against wall | first |
| 2d Toys | 10.0–12.0 | 4 s | Close | Slight downward drift, box stays centered | Hands slide box into center cubby | first |
| 3a Corridor | 12.0–15.0 | 4 s | Wide | One crane-glide forward and down | Camera only | first |
| 3b Padlock | 15.0–17.0 | 4 s | Medium close → extreme close | Slow push-in and slight tilt down | Camera only | first + last |

Montage clips (2a–2d) are trimmed to their best 2 s. Shot 1 is used from its very first frame (door already moving). 3a → 3b joins with a hard cut.

## Risk notes
1. **Unit numbers are lettering.** The brief wants clear number plates and no other text. Plates use large, simple 3-digit numbers (104, 108, 112, 115, 120, 201–203, 211–213) on brushed-steel plates; run 2 takes of shots 3a/3b and keep the cleanest. Fallback: regenerate with blank plates and I add the numbers in the edit (easy on 3b, possible on 3a).
2. **Faces:** every montage frame is anchored by where the frame edge cuts the body, so only forearms/hands are ever in frame.
3. **Small objects in hands:** the rackets stay packed in the gym bag; hands only handle large objects (box, rail, bike saddle, toy box).
4. **Brief deviation to approve:** in 2c the rackets and gym bag are already placed; the hands place the bicycle. (Optional extra take: a hand sets the gym bag down by its strap.)
5. **Lighting drift:** each prompt locks light level and color; the edit corrects any remaining drift against the first frame.

---

## Step 1: Image prompts for first / last frames (vertical 9:16)

**1-LAST (generate first):** [Style sentence]. Vertical 9:16. Eye-level medium-wide view into a clean modern self-storage unit. The muted steel-blue ribbed roller shutter is fully rolled up into its housing at the top of the doorway. Inside: an empty room with bare warm-white walls and a bare light beige polished concrete floor, lit by a warm soft ceiling light. The open doorway fills the center of the frame; warm-white corridor walls on both sides. A brushed-steel plate with the large black number "104" on the wall to the right of the doorway.

**1-FIRST (edit from 1-LAST):** Same set, same lighting, same plate position on the wall. The camera is raised and tilted up so the frame shows the upper half of the doorway: the shutter housing at the top and the ribbed steel-blue shutter below it; the floor is out of frame. The shutter's bottom edge is at knee height (just out of frame), with warm light glowing on the corridor wall at the bottom edge of the frame.

**2a-FIRST:** [Style sentence]. Vertical. Medium close-up inside a storage compartment, the brushed-steel shelf in the middle of the frame against a warm-white wall; one neatly taped plain cardboard box on the left half of the shelf. Two bare forearms with medium-brown South Asian skin, the short sleeve of a plain navy t-shirt just visible at the right frame edge, hold a second taped cardboard box just above the right half of the shelf. A brushed-steel plate with the number "112" on the compartment frame at the upper left. Warm soft light.

**2b-FIRST:** [Style sentence]. Vertical. Camera at waist height just outside an open storage unit (steel-blue shutter rolled up, plate "108" on the door frame at the left edge). A chrome rolling clothes rail stands in the doorway, its top bar cut by the top edge of the frame; five garments on wooden hangers: beige coat, white shirt, grey blazer, camel coat, olive jacket. One bare forearm with medium-brown South Asian skin enters from the right frame edge, on the camera side of the rail, hand on the rail's side bar; the short navy t-shirt sleeve is just visible at the frame edge. Beige floor, warm-white interior.

**2c-FIRST:** [Style sentence]. Vertical. Medium-wide view from the open doorway of a storage unit; brushed-steel plate "115" on the door frame at the left edge of the frame. A plain grey city bicycle stands side-on about 30 cm in front of the warm-white back wall, slightly left of center so its saddle is near the right third of the frame, front wheel to the left. One bare forearm with medium-brown South Asian skin reaches in from the right frame edge, hand on the saddle; the short navy sleeve is just visible at the edge. A black gym bag with the handles of two tennis rackets sticking out rests on the beige floor at the lower left.

**2d-FIRST:** [Style sentence]. Vertical. Close shot of a row of three open white cubbies at waist height. A clear plastic box with a lid, filled with colorful children's toys (wooden blocks, a small plush bear, a toy car), rests at the front edge of the center cubby, in the middle of the frame. Two hands with medium-brown South Asian skin come from the bottom of the frame (camera side) and rest on the box's lower corners; short navy sleeves just visible at the bottom edge. A brushed-steel plate "120" above the center cubby. Warm soft light.

**3a-FIRST:** [Style sentence]. Vertical. High-angle view looking down a long spotless storage corridor. Both sides lined with closed muted steel-blue ribbed roller shutters; each has a brushed-steel plate with a large 3-digit number above it (right side: "201", "202", "203"; left side: "211", "212", "213"; nearest first). Warm-white walls and ceiling, light beige polished concrete floor, a row of warm soft ceiling lights. An empty corridor.

**3b-FIRST:** [Style sentence]. Vertical. Medium close-up of the lower half of one closed muted steel-blue ribbed roller shutter (door 203 from shot 3a); at the bottom of the door a steel latch with a solid brass padlock closed through it; light beige floor below. Warm side light.

**3b-LAST (image edit of 3b-FIRST at full resolution, not a crop):** Extreme close-up of the same brass padlock on the same latch, filling the center of the frame, steel-blue ribs softly out of focus behind it, a sliver of beige floor at the bottom. Same light.

---

## Step 2: Video prompts (Seedance, image-to-video)

### Shot 1: Door reveal (5 s; first = 1-FIRST, last = 1-LAST)
```
[Art style] Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood. Art style, colors and set design are fully consistent with the first and last frames throughout.
[Camera] The whole clip is 5 seconds, medium-wide. As the shutter rises, the camera tilts down at the same pace, from the shutter housing to the room, and lowers slightly to eye level, ending exactly on the last frame. One continuous take.
[Composition and color] Doorway centered; warm-white corridor walls on both sides; muted steel-blue ribbed shutter; brushed-steel plate "104" to the right of the doorway; light beige concrete floor.
[Characters] An empty scene: only the door, the room and the corridor.
[Second by second]
0–0.2s: Already in motion: the shutter is rising and the camera is tilting down.
0.2–3.4s: The roller shutter rolls smoothly upward into its housing at a steady speed; warm light spreads across the beige floor as the empty room is revealed; the camera tilts down in step with the door.
3.4–4.0s: The shutter is fully up and the camera settles on the last frame.
4.0–5.0s: Completely still; the picture matches the last frame exactly.
[Sound] Only the soft metallic rattle of the roller shutter rising.
[Constraints] The room stays empty with bare walls and floor; the ceiling light level and color stay constant (only the doorway light spill changes as the door opens); one continuous take; clean picture, no subtitles, logos or watermarks.
```

### Shot 2a: Boxes (4 s; first = 2a-FIRST)
```
[Art style] Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood. Fully consistent with the first frame throughout.
[Camera] The whole clip is 4 seconds, medium close-up; the camera drifts slightly downward while keeping the shelf centered. One continuous take.
[Composition and color] Brushed-steel shelf in the middle of the frame, warm-white wall, one taped cardboard box on the left half of the shelf, brushed-steel plate "112" on the compartment frame at the upper left.
[Characters] Two bare forearms with medium-brown South Asian skin enter from the right frame edge; the short sleeve of a plain navy t-shirt stays at the frame edge the whole time.
[Second by second]
0–0.2s: The picture matches the first frame.
0.2–2.5s: The hands lower the second box and set it on the right half of the shelf, edges aligned with the first box.
2.5–3.6s: The hands give the box a small push to square it, then withdraw to the right frame edge.
Last 0.4s: Two boxes side by side on the shelf; the frame shows only the shelf, boxes and plate.
[Sound] Only a soft thud of cardboard on a metal shelf.
[Constraints] Exactly two boxes; light level and color stay constant; clean picture, no subtitles, logos or watermarks.
```

### Shot 2b: Clothes rail (4 s; first = 2b-FIRST)
```
[Art style] Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood. Fully consistent with the first frame throughout.
[Camera] The whole clip is 4 seconds, medium shot; the camera stays at waist height and drifts slightly downward. One continuous take.
[Composition and color] Open unit with the steel-blue shutter rolled up, plate "108" on the door frame at the left edge, chrome rail with five garments (beige coat, white shirt, grey blazer, camel coat, olive jacket), beige floor, warm-white interior.
[Characters] One bare forearm with medium-brown South Asian skin, from the right frame edge, on the camera side of the rail; the short navy t-shirt sleeve stays at the frame edge.
[Second by second]
0–0.2s: The picture matches the first frame.
0.2–1.2s: The hand gives the rail one firm push away from the camera and lets go; the arm withdraws to the right frame edge.
1.2–3.2s: The rail coasts on its casters about one meter deeper into the unit, garments swaying gently, and rolls to a stop.
3.2–3.6s: Everything settles.
Last 0.4s: Still frame: the rail stands neatly inside the unit with the same five garments.
[Sound] Only quiet caster wheels rolling and hangers clinking softly.
[Constraints] One rail, five garments; light level and color stay constant; clean picture, no subtitles, logos or watermarks.
```

### Shot 2c: Bicycle (4 s; first = 2c-FIRST)
```
[Art style] Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood. Fully consistent with the first frame throughout.
[Camera] The whole clip is 4 seconds, medium-wide from the open doorway; the camera drifts slightly downward, keeping the bicycle slightly left of center. One continuous take.
[Composition and color] Grey bicycle side-on in front of the warm-white back wall, front wheel to the left; black gym bag with two tennis rackets at the lower left; plate "115" on the door frame at the left edge.
[Characters] One bare forearm with medium-brown South Asian skin from the right frame edge, hand on the saddle; the short navy sleeve stays at the frame edge.
[Second by second]
0–0.2s: The picture matches the first frame.
0.2–2.6s: Holding the saddle, the hand tilts the bicycle gently back until its handlebar and saddle rest against the wall; the wheels stay on the floor.
2.6–3.6s: The hand lets go and the arm withdraws to the right frame edge.
Last 0.4s: The bicycle rests against the wall; the gym bag and rackets are unchanged at the lower left.
[Sound] Only a soft tap of the handlebar grip against the wall.
[Constraints] The rackets and gym bag stay still at the lower left the whole time; one bicycle, one bag, two rackets; light level and color stay constant; clean picture, no subtitles, logos or watermarks.
```

### Shot 2d: Toys (4 s; first = 2d-FIRST)
```
[Art style] Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood. Fully consistent with the first frame throughout.
[Camera] The whole clip is 4 seconds, close shot; the camera drifts slightly downward, keeping the box centered. One continuous take.
[Composition and color] Row of three open white cubbies; clear toy box at the front edge of the center cubby; plate "120" above the center cubby.
[Characters] Two hands with medium-brown South Asian skin from the bottom of the frame, short navy sleeves at the bottom edge.
[Second by second]
0–0.2s: The picture matches the first frame.
0.2–2.6s: The hands slide the clear box smoothly all the way into the center cubby; the toys stay in place inside it.
2.6–3.6s: The hands withdraw downward out of the bottom of the frame.
Last 0.4s: The box sits inside the center cubby, toys visible through the clear plastic.
[Sound] Only a soft slide of plastic on a laminated shelf.
[Constraints] Only the cubbies, the box with its toys, the plate and the hands from the first frame; light level and color stay constant; clean picture, no subtitles, logos or watermarks.
```

### Shot 3a: Corridor (4 s; first = 3a-FIRST)
```
[Art style] Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood. Fully consistent with the first frame throughout.
[Camera] The whole clip is 4 seconds; one smooth crane-glide forward and down toward door "203" on the right. One continuous take.
[Composition and color] Long spotless corridor; closed muted steel-blue ribbed shutters on both sides with brushed-steel number plates (right: "201", "202", "203"; left: "211", "212", "213"; nearest first); warm-white walls and ceiling; beige floor; row of warm ceiling lights.
[Characters] An empty corridor.
[Second by second]
0–0.2s: The picture matches the first frame.
0.2–3.6s: The camera glides steadily forward and downward; the doors on the right pass by one after another.
Last 0.4s: The camera slows, low and close to door "203" on the right.
[Sound] Only a quiet, calm room tone.
[Constraints] Every shutter stays closed; the plate numbers stay the same; light level and color stay constant; clean picture, no subtitles, logos or watermarks.
```

### Shot 3b: Padlock (4 s; first = 3b-FIRST, last = 3b-LAST)
```
[Art style] Photorealistic cinematic commercial footage, full-frame cinema camera, 35 mm lens, warm soft key light around 3200 K mixed with soft daylight, calm warm-white and beige palette with muted steel-blue roller doors, shallow depth of field, fine film grain, premium and quiet mood. Fully consistent with the first and last frames throughout.
[Camera] The whole clip is 4 seconds; a slow push-in with a slight downward tilt from the lower half of the door to an extreme close-up of the padlock. One continuous take.
[Composition and color] Lower half of a steel-blue ribbed shutter, steel latch with a closed brass padlock at the bottom of the door, beige floor below.
[Characters] An empty scene.
[Second by second]
0–0.2s: The picture matches the first frame.
0.2–3.4s: The camera pushes in steadily; focus settles on the brass padlock.
Last 0.6s: Completely still; the picture matches the last frame exactly.
[Sound] Only a quiet, calm room tone.
[Constraints] The padlock stays closed and in place; light level and color stay constant; clean picture, no subtitles, logos or watermarks.
```

---

## Cost estimate (check against your Seedance bill; prices change)
Generated seconds: 5 + 4×4 + 4 + 4 = **29 s** at 720p.
- Seedance 2.0 mini (~0.5 CNY/s): about **15 CNY** per full pass.
- With 2 takes of 3a and 3b (recommended for the number plates): about **19 CNY**.
- Seedance 2.5 (~1.5 CNY/s) only if a shot fails on mini.

## Edit plan (Claude, once clips are uploaded)
Use shot 1 from frame 1; trim 2a–2d to their best 2 s; hard cuts; correct color drift against each first frame; upscale 720p → 1080p (lanczos); replace generated audio with a calm music bed plus door/rail/padlock sounds; export 1080×1920 H.264. Optional second version with the Ravel logo and WhatsApp end card added in the edit.
