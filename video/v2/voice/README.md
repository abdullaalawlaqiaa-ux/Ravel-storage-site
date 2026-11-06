# Voiceover

Offline TTS: piper-tts with the `ar_JO-kareem-medium` voice (from the
k2-fsa/sherpa-onnx `tts-models` GitHub release). Not committed (67 MB).

- `lines2.py`: diacritized phrases with their start time and latest end time
- `gen2.py`: synthesizes each phrase, trims silence, speeds up (max 1.3x) to fit

The voice is Jordanian Arabic, not Gulf. For a true Gulf voice, replace with an
ElevenLabs (or recorded) track using the same phrase timings.
