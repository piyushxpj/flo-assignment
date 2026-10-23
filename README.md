# Flo Assignment

A Figma-based roleplay interface built with vanilla JavaScript and Vite. Includes a collapsible sidebar, roleplay setup, a purple shader orb, simulated conversations, and a live transcript panel.

Frontend prototype: voice calls, AI responses, screen capture, and grading are not connected.

```sh
npm install
npm run dev
```

Open http://localhost:4190. `npm run build` creates the production bundle.

The app fills the current viewport (100dvh). The sidebar is 290px expanded and 76px collapsed. Navigation scrolls independently on short screens; the account stays pinned at the bottom. On narrow screens the initial state is collapsed. The sidebar preference persists for the browser session.

All 11 navigation destinations support URL hashes, direct links, and browser back/forward. Practice can collapse independently. The profile card is display-only; the account popup is temporarily removed.

The initial canvas is blank, matching Figma. Destination panels are navigation placeholders, ready for application screens; no backend features are implied. Original Figma assets and both Figtree weights are served locally. Navigation uses monochrome masks derived from the original icon shapes, allowing icons and labels to share their active purple and inactive white/gray colors. The bottom glow uses a radial gradient that fades fully to transparent.

The shared selection highlight retargets with an interruptible 240ms transform transition. Icon and text colors transition together over 180ms. Keyboard navigation and reduced-motion preferences disable the movement. Highlight geometry follows sidebar resizing and Practice disclosure changes.

Sidebar width, label fades, icon positioning, and account details now share a 260ms transition. Practice uses a reversible 240ms grid disclosure with a short fade and slide. Closed Practice links are inert and hidden from assistive technology. Both transitions respect reduced motion and keyboard input.

## Roleplay screen

Implements Figma node `791:503`: a 695px column at 172px from the main panel top, a 32px/35px Recoleta heading, Figtree body copy, original 24px scenario icons, dotted card decoration, mascot crop, and composer. The main panel scrolls independently on small screens.

The composer keeps “I want to role play...” fixed and types all six examples at 55ms per character, holds each for 1.6 seconds, then deletes at 30ms per character. It pauses while typing, while focused, on other routes, in background tabs, and for reduced-motion preferences. Scenario cards fill the composer; View All reveals the remaining three prompts. Send stores a scenario in session storage. Live AI roleplay is not connected. Voice dictation uses the browser's SpeechRecognition implementation when available and otherwise provides an explicit fallback.

The heading uses the same **Recoleta Regular DEMO** font as Figma. This local testing font is from Latinotype's author listing at https://www.dafont.com/recoleta.font. A commercial deployment needs the appropriate licensed font from https://www.latinotype.com/typefaces/recoleta.

## Roleplay setup prototype

Click a scenario card, or enter a scenario in the composer and press **Continue**. An inline question card walks through your role, Flo’s role, time budget, and Practice/Graded mode. Choices are suggested locally from common scenario keywords; custom roles and a custom 1–60 minute duration are supported.

- Next advances after a valid answer. Skip uses the first suggested role, 10 minutes, or Practice.
- Back preserves answers. Number keys 1–3 select choices when not typing; 4 focuses the custom answer. Escape closes setup.
- The question card follows Figma node `807:935`, with purple fill-only selections and a compact scenario bar. Its pencil opens the scenario editor; saving a changed scenario restarts the questions with fresh suggestions.
- Review shows the full configuration. Pencil buttons edit a field and Save returns to review.
- Create roleplay saves the configuration to `sessionStorage` under `flo-roleplay-setup` when available, then opens the conversation demo.
- This is a frontend setup prototype. It does not start a voice session, generate roleplay responses, or calculate grades.

Implementation: `roleplay-setup.js`, `roleplay-setup-model.js`, and `roleplay-setup.css`, mounted by `roleplay.js`. Test at http://localhost:4190/#roleplay with `npm run dev`.


## Conversation demo

Implements Figma node `810:1077`. Select a roleplay or enter a scenario, complete the four setup questions, and choose **Create roleplay**. The conversation opens at `#roleplay-call` with the chosen scenario, mode, and time budget. Enter “Interview for a Senior Designer Position in a Startup” to preview the scenario shown in Figma.

The Senior Designer interview uses the 22 fully readable messages from the supplied transcript screenshots, preserving their wording, speaker order, and short acknowledgments. Duplicate screenshots are deduplicated and missing sections are not invented. The setup suggests **Candidate** as your role. Other scenarios retain their five-message sample scripts. The demo streams each message letter by letter, with natural punctuation pauses. Completed messages stay in the conversation, which follows the newest line and fades older messages at the top. Hover over the fade (or tab to it) and select **Show transcript** to split the panel into the live conversation and a full, independently scrollable transcript. The transcript opens at the latest message, contains only messages spoken so far, and follows new text as it streams. Scrolling up pauses following and reveals **Jump to latest**; selecting it or scrolling back to the bottom resumes following. Close it with its close button or Escape. On small screens the panes stack. The first homepage card, **Senior Designer interview**, opens setup with the exact interview title and Candidate role suggestion. Scrolling up pauses automatic following; returning to the bottom resumes it. Reduced-motion mode presents whole messages, and background tabs pause playback. Muting pauses simulated user speech. The microphone control toggles a simulated muted state; **Share screen** shows a clearly labeled mock preview. Neither control requests hardware access. **End the Roleplay** stops the timer and animation and shows a completion screen, with restart and return actions. There is no voice backend, audio capture, real screen sharing, or scoring.

`flo-orb.js` mounts the original Orbkit SHDR-21 Nimbus GLSL in vanilla WebGL, with Flo’s lavender/violet palette and smooth speaking/listening changes. The shader is preserved under `vendor/orbkit/` with its MIT license; its source comes from the same registry used by `npx shadcn@latest add zzzzshawn/orbkit/shdr-21`. Rendering is capped at 30 fps and 2× DPR, pauses when hidden/offscreen, honors reduced motion, and falls back to a purple gradient when WebGL is unavailable.

Validation: `npm run build`; browser check of setup → conversation → end → return, mute/unmute, share/stop-sharing, streaming messages, transcript fade/pill, refresh, and narrow viewport layout.
