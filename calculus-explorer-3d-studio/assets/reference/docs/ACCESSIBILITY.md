# Accessibility

## What is implemented

- Semantic landmarks: `header`, `nav`, `main`, `section`, `aside`, `footer`; one `h1` per view.
- A skip link to `#main`.
- Visible `:focus-visible` outlines on every interactive control.
- Buttons are real `<button>` elements with `type="button"`; selects are real `<select>`s; the FRQ field is a labelled input.
- `aria-label` on icon-only buttons, the canvas, sliders, selects, and difficulty.
- `aria-pressed` on the Explore/Mastery tabs, focus mode, and toggle buttons.
- `aria-current="true"` on the active unit.
- Practice feedback uses `aria-live="polite"`; readouts use `aria-live="polite"`.
- The mastery progress bar exposes `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- Dialogs are native `<dialog>` elements with `aria-labelledby` and a close button.
- Colour is never the only signal: feedback has text (Correct / Not quite / Hint), the verdict chip says “limit exists” or “no two-sided limit”, and the mastery ring always has a percentage.
- Reduced motion: the settings toggle and `prefers-reduced-motion` both stop CSS animation, camera auto-motion, and Unit 3's ring rotation. Decorative three.js pulses remain, but they are small and non-essential. Unit 8's surface opacity pulse is subtle; if you need stricter motion control, add a check of `window.__CALC3D_REDUCED_MOTION__` in each scene's `update`.

## Keyboard

| Key | Action |
| --- | --- |
| `1`–`8` | Switch unit |
| `E` / `P` | Explore / Mastery |
| `←` / `→` | Previous / next unit |
| `R` | Reset camera |
| `F` | Focus mode |
| `?` | Shortcuts dialog |
| `Esc` | Close overlay/dialog or leave focus |
| `Tab` / `Shift+Tab` | Normal DOM order |

Typing in an input, select, or textarea suppresses the shortcuts.

The 3D canvas is focusable (`tabindex="0"`) so keyboard users can reach it, but the scene does not claim to be fully operable by keyboard; every parameter is available in the dock, and every mathematical result is in the readouts/narration. This is the accessibility fallback for WebGL.

## Contrast

The palette targets readable text on `#050b14`:

- body ink `#e8f0fa` on near-black: high contrast;
- muted `#8aa0b6` for secondary text: used at 10–12 px, still legible;
- teal `#5eead4` and amber `#fbbf24` on dark: strong;
- rose `#fb7185` is used for errors and negative signs with a text label, never alone.

Some micro-labels (8–9 px uppercase) are intentionally small for a dense scientific UI. At 390 px the layout reflows but does not enlarge those labels. If you need classroom-projection sizes, use browser zoom; the layout is fluid.

## Screen readers

- The unit rail is a list of buttons with a full `aria-label` including unit name and mastery percent.
- Readout chips have a label span and a value; both are in the accessibility tree.
- The quiz question is text; formulas are HTML with sub/sup, which screen readers generally announce as part of the text. A full MathML alternative was not provided.
- Canvas content has an `aria-label`, but it is not a substitute for the narration. The narration is the textual equivalent of the scene.
- Toasts are in an `aria-live="polite"` stack.

## Motion and sound

- Sound is opt-out in Settings; audio is only created after a user gesture. Headless tests mute audio.
- The boot veil is decorative and disappears; it is not a blocking dialog.
- There is no autoplay video or looping audio.

## Known limitations

- The 3D canvas has no keyboard camera controls (OrbitControls is pointer-only in this build).
- No high-contrast/forced-colors theme was tested.
- No screen-reader pass was run with VoiceOver/NVDA in this environment; the DOM semantics and labels are present, but that is not the same as a real assistive-technology audit.
- The self-test overlay is a custom modal, not a native `<dialog>`; it traps nothing. `Esc` closes it.
- Focus is not explicitly returned to the trigger after closing the settings/shortcuts dialogs; native `<dialog>` restores focus in current browsers.

If you improve any of these, update this document and add a browser assertion where possible.
