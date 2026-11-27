Use your built-in image generation to create 5 images for a personal morning AI news web app called "아침 AI 편지" (Morning AI Letter). Save each as PNG in the current folder under `raw/` with exactly these file names. Do not write any other files. After saving, print the list of saved files with their pixel sizes.

COMMON STYLE (put at the start of every prompt):
"A warm, restrained editorial watercolor illustration for a personal morning AI news app. Rounded, simplified shapes, crisp silhouettes, subtle watercolor texture confined inside the shapes, generous negative space, calm and friendly morning mood. Palette: muted teal (#28675F), cream (#F7F5F0), soft apricot (#E8B18C). Minimal detail, readable at small sizes. Absolutely no text, letters, numbers, logos, company marks, or watermarks anywhere."

1. `raw/icon.png` — square 1024x1024. Square app icon: a single large cream envelope with a simple soft-apricot rising sun peeking out from behind its top edge, on a solid flat deep teal background (#28675F) filling the whole canvas edge to edge. Bold simple shapes, strong contrast, no thin lines, no extra objects. Keep the envelope and sun inside the central 60% of the canvas so it survives circular cropping. No outer frame, no rounded-corner border, no drop shadow outside the shapes.

2. `raw/header_light.png` — wide landscape (1536x512 or the closest wide size you support). Header banner. Only in the rightmost 35% of the image: a small ceramic mug with a little steam curl, one open cream envelope leaning against it, and a gentle apricot morning sun low behind them, plus one small leafy sprig. The left 60% must be completely empty, flat, uniform warm off-white (#F7F5F0) for a text overlay — no objects, no paper grain, no gradient blotches there. Whole background flat #F7F5F0, no border.

3. `raw/header_dark.png` — same size and the SAME arrangement as header_light, but for dark mode: whole background flat dark green-black (#151D1B), objects in pale teal (#8CCFC0), muted apricot (#DDA780) and small amounts of soft cream. Left 60% completely empty and uniform #151D1B. No white rectangle, no glow halo, no border.

4. `raw/empty_none.png` — square 1024x1024. Empty-state illustration meaning "no new letters today, all is calm": a small empty wooden letter tray (or a small mailbox with its flag down) with one simple leaf resting beside it and a soft apricot morning light. Centered, compact, clear silhouette. Background: transparent if you can; otherwise a perfectly flat solid #F7F5F0 with no shadow, no ground line, no vignette.

5. `raw/empty_error.png` — square 1024x1024. Empty-state illustration meaning "a short maintenance pause": a closed cream envelope with one small rounded teal wrench resting beside it. Friendly and reassuring — no warning triangle, no broken objects, no lightning, no red. Centered, compact, clear silhouette. Background: transparent if you can; otherwise a perfectly flat solid #F7F5F0 with no shadow, no ground line, no vignette.

Check every image yourself before finishing: if any image contains text-like marks, letters, or logos, regenerate it.
