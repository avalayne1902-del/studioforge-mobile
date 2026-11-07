# StudioForge — Mobile Product Ad Studio

A local-first, single-page video ad editor intended for Android Chrome and modern desktop browsers.

## What it does
- Loads a video from the device (no upload/server).
- Edits brand, headline, benefit text and CTA.
- Previews the visual treatment.
- Exports landscape 16:9, vertical 9:16 or square 1:1.
- Trims by start/end time.
- Mixes optional user-supplied music.
- Renders locally through Canvas + MediaRecorder.
- Can share the rendered file through the device share sheet.
- PWA shell can be installed when hosted over HTTPS.

## Run on Android
1. Extract this ZIP on the phone.
2. To use as a simple local page, open `index.html` in a browser if your file manager allows it. Some browsers restrict media recording on `file://`.
3. For install/offline PWA support, host the folder on any HTTPS static host. No backend is needed.
4. Open the HTTPS page in Chrome, then use Chrome menu → Add to Home screen.

## Browser / format notes
- Chrome on Android commonly records WebM (VP8/VP9). MP4 recording depends on browser/device support.
- This is a local renderer, not a cloud video-generation model. There are no per-render AI credits, but processing speed, resolution and duration are limited by device memory, thermal conditions and battery.
- Keep the screen awake and the tab open during rendering.
- For long source files, trim to a shorter segment first.
- Exported video uses the canvas composition; source audio is mixed with optional background music where Web Audio is available.

## Quality and claim safety
Do not use unverified specifications, materials, warranties, shipping claims, discounts, compatibility or customer testimonials. Product claims should be checked before publication.
