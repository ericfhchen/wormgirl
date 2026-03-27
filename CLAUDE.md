# Worm Girl — Project Guide

> **Read this file before making any changes.** Update it after significant architectural changes.

## Overview

Single-page educational web app with a persistent video player, modular content, and rich-text articles. Built with **Next.js 14 (App Router)**, **Sanity CMS**, and **MUX video streaming**. Deployed on Vercel.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router, React 18, TypeScript |
| Styling | Tailwind CSS 3 + CSS variables, styled-components |
| CMS | Sanity v3 (GROQ queries, Portable Text) |
| Video | MUX HLS streams via hls.js, native HLS for Safari |
| Deployment | Vercel |

## Directory Map

```
src/
├── app/
│   ├── layout.tsx          # Root layout — provider stack wraps everything
│   ├── page.tsx            # Minimal; content driven by layout + contexts
│   ├── globals.css         # Tailwind base + CSS custom properties
│   └── studio/             # Sanity Studio route (/studio)
├── components/
│   ├── VideoPlayerStacked  # Core: stacked <video> elements, idle loop, fade transitions
│   ├── IntroOverlay        # Splash screen with intro video + auto-dismiss
│   ├── Sidebar             # Desktop nav: modules (Roman numerals) + content pages
│   ├── ContentPanel        # Article display (module body or content pages), cross-fade
│   ├── MobileTopMenu       # Mobile menu overlay for content pages
│   ├── MobileModuleBar     # Mobile module carousel at bottom
│   ├── PreLoader           # Full-page loading bar on first visit
│   ├── TruncatedDescription # "See More/Less" text overflow
│   └── ImageCarousel       # Click-to-navigate image carousel
├── context/
│   ├── VideoContext         # Playback state, playModule(), idle/queue system
│   ├── PageStateContext     # Navigation: module vs content page, panel stage
│   ├── ModulesContext       # Fetches modules from Sanity, provides getModule()
│   └── ContentPagesContext  # Fetches about/library pages from Sanity
├── lib/
│   ├── sanity.ts           # Sanity client, GROQ queries, types, fetch helpers
│   ├── timecode.ts         # HH;MM;SS;FF → seconds (30fps)
│   ├── attachHls.ts        # HLS stream attachment with Safari/hls.js fallback
│   └── hooks/
│       ├── useFootnotes    # Footnote registration, scroll-to, highlight
│       ├── useGlossary     # Glossary term registration, scroll-to, highlight
│       └── useIsMobile     # Breakpoint detection (default 768px)
└── schemas/                # Sanity document schemas (module, intro, aboutPage, etc.)
```

## Provider Stack (layout.tsx)

```
ContentPagesProvider
  └── ModulesProvider
        └── VideoProvider
              └── PageStateProvider
                    └── LayoutContent (all visible UI)
```

## Video System — How It Works

### Stacked Architecture
All module videos are rendered as `<video>` elements stacked via absolute positioning. Only the active module has `opacity: 1`; all others are `opacity: 0`. This allows instant switching without destroying/recreating video elements.

**Important**: VideoPlayerStacked renders ALL module videos even when `currentModuleIndex === -1` (intro active). They sit at opacity 0 behind the IntroOverlay so HLS can pre-load. The old `currentIndex === -1` early return was removed to enable this.

### Idle Loop
Each module has a `videoEndTimecode` (HH;MM;SS;FF at 30fps) in Sanity. The last 3 seconds of each video are a baked idle loop. When playback reaches `mainEnd` (timecode - 3s), the player enters **idle mode** and loops between mainEnd → end of video continuously.

### Transitions

- **From intro → prelude (module 0)**: Seamless cut, NO fade-to-black. The last frame of the intro clip matches the first frame of the prelude clip. `playModule(0)` does NOT dispatch `SET_MODULE` — it sets `introPreludeRef` (shared ref on VideoContext) and dispatches `SET_PENDING_PRELUDE`. IntroOverlay detects this, suppresses idle-mode entry and loop-back in the intro video, lets it play to its natural end (`handleEnded` event), then dispatches `SET_MODULE(0)` + `PLAY` and instantly removes the overlay (no CSS opacity transition). See "Intro-to-Prelude Transition" section below.
- **From intro → non-prelude module**: IntroOverlay handles the entire transition. Fades inner black overlay to opaque, waits for target video to have decoded frames at position 0, dispatches PLAY, fades entire overlay to opacity 0 to reveal module video. VideoPlayerStacked does nothing (no fade, no seek).
- **Sequential forward** (e.g. Module I → Module II): Instant cut, no fade. Video starts from 0. If from idle, queued via `QUEUE_MODULE` and switches at next loop boundary; `switchFromIdleRef` suppresses fade.
- **Non-sequential jump** (e.g. Module I → Module V): Fade-to-black (300ms overlay in, 20ms hold, 300ms overlay out = ~920ms). New video seeks to mainEnd and enters idle. Dispatched immediately via `SET_MODULE` (no debounce, no queue) so video and content panel fade in sync.
- **Interrupted fade**: If user clicks during a fade-in, overlay smoothly fades back to black, then reveals the new (last-clicked) module. Overlay stays opaque through rapid clicks — only the final module fades in.

### Key Mechanism: renderTick
The opacity of each video is determined during React render using `prevIndexRef` (a ref). When the sequential/fromIdle path updates this ref in `useLayoutEffect`, a `setRenderTick(c => c + 1)` forces a synchronous re-render before paint so the correct video is visible immediately (no flash of old frame).

### Intro-to-Prelude Transition (detailed)

This is the most complex transition and has been a source of multiple bugs. Key constraints:
- The intro clip's last frame matches the prelude clip's first frame (seamless cut)
- If intro is still playing first time through → let it finish completely, then cut
- If intro is already looping → finish the current loop iteration, then cut
- NO fade-to-black — instant overlay removal

**Architecture**:
1. `playModule(0)` from intro sets `introPreludeRef.current = true` synchronously (shared ref on VideoContext), then dispatches `SET_PENDING_PRELUDE` (but NOT `SET_MODULE`). This is critical — dispatching `SET_MODULE` would make VideoPlayerStacked show/play the prelude immediately.
2. IntroOverlay's `useLayoutEffect` watches `videoState.pendingPreludeFromIntro` and sets local `pendingPreludeRef` + `pendingPrelude` state.
3. `handleTimeUpdate` returns early when `pendingPreludeRef.current` is true — this suppresses idle-mode entry (so first playthrough continues past mainEnd) and suppresses loop-back seek (so idle loop plays to natural end).
4. `handleEnded` fires when video reaches actual end → calls `triggerPreludeTransition()`.
5. `triggerPreludeTransition` dispatches `SET_MODULE(0)` + `PLAY`, sets `instantCut = true` (disables CSS transition on overlay), sets `overlayOpacity = 0`, calls `onFinish` after 50ms.

**Critical race condition (fixed)**: `introPreludeRef` MUST be set synchronously before any state dispatch. If set in a useEffect/useLayoutEffect, there's a window where a `timeupdate` event fires and the idle loop code seeks back to mainEnd before the ref is set. The ref lives on VideoContext and is set inside `playModule()` itself, before the dispatch call.

**Known issue**: Clicking the prelude sidebar tab while the intro is already looping can still produce a slight frame jump. The PRELUDE button path is seamless. The sidebar path goes through `playModule()` which sets the ref synchronously, but there's still a narrow race window.

## Navigation Flow

```
Sidebar click → playModule(index) + setModulePage(index, slug)
                    ↓
          VideoContext handles routing:
            • Same module + idle → no-op
            • From intro + prelude → SET_PENDING_PRELUDE only (IntroOverlay handles everything)
            • From intro + non-prelude → SET_MODULE only (IntroOverlay handles PLAY + transition)
            • Idle + sequential forward → QUEUE_MODULE (waits for loop boundary)
            • Idle + non-sequential → immediate SET_MODULE + PLAY
            • Active playback → immediate SET_MODULE + PLAY
                    ↓
          From intro to prelude: IntroOverlay waits for video end → SET_MODULE(0) + PLAY → instant cut
          From intro to other: IntroOverlay fade-to-black → wait for frames → PLAY → fade overlay out
          Otherwise: VideoPlayerStacked useLayoutEffect detects change:
            • Sequential/fromIdle → instant switch (renderTick forces sync re-render)
            • Non-sequential → fade-to-black sequence (~920ms)
            • Interrupted fade → overlay stays/returns to black, restarts for new target
                    ↓
          ContentPanel cross-fade (920ms) runs in parallel, triggered by same tick
```

## PreLoader → IntroOverlay Handoff

PreLoader is rendered OUTSIDE the provider stack (in layout.tsx). It communicates with IntroOverlay via a custom DOM event:
- IntroOverlay dispatches `window.dispatchEvent(new Event('intro-video-ready'))` when `handleCanPlay` fires
- PreLoader listens for both `window.load` AND `intro-video-ready` before completing the progress bar past 90%

PreLoader completes past 90% and fades out once both signals arrive.

## Sanity Data Model

| Document | Key Fields |
|----------|------------|
| **module** | title, slug, order, timeline, video (mux), videoEndTimecode, articleHeading, body (blockContent), glossary[], footnotes[], tabImage |
| **intro** | video, videoEndTimecode, buttonLabel |
| **aboutPage** | title, slug, content (blockContent) |
| **libraryPage** | title, slug, description, sound[], books[] |
| **blockContent** | Portable Text with marks: strong, em, smallCaps, footnoteRef, glossaryRef |

## Git Branches

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | Production | Stable release |
| `feature/single-video-timestamps` | **Active** | Current work: video timecode & transition fixes |
| `feature/midpoint-exit-logic` | In-flight | Midpoint exit behavior |
| `feature/wiggle-idle-effect` | In-flight | Idle visual effect |

## Current Issues & Recent Fixes

### Fixed: Intro-to-prelude seamless transition (2026-03-26)
**Problem**: Clicking prelude from intro produced frame flashes, the prelude video was already playing mid-stream, and the transition had visible fades instead of a seamless cut.
**Root causes**: (1) `SET_MODULE(0)` dispatched on click caused VideoPlayerStacked to immediately show/play the prelude. (2) `waitForVideoReady` polling caused delays. (3) CSS opacity transition caused visible fade when frames should match seamlessly. (4) `pendingPreludeRef` set in useEffect had race condition with idle loop timeupdate events.
**Fix**: `playModule(0)` from intro now only dispatches `SET_PENDING_PRELUDE` (not `SET_MODULE`). `introPreludeRef` shared on VideoContext is set synchronously before dispatch. IntroOverlay suppresses idle entry/loop-back, waits for `ended` event, then dispatches `SET_MODULE(0)` + `PLAY` with instant overlay removal (no CSS transition).

### Fixed: First-frame flash on module switch (2026-03-26)
**Problem**: When navigating to next module (sequential or from idle), the old video's frame flashed for 1-2 frames before the new video appeared.
**Root cause**: `prevIndexRef` (a ref) was updated in `useLayoutEffect` but refs don't trigger re-renders. The first render painted with `inTransition = true` showing the old video, and no state update forced a re-render before browser paint.
**Fix**: Added `setRenderTick(c => c + 1)` in the sequential/fromIdle branch to force a synchronous re-render before paint, so the opacity calculation sees the updated `prevIndexRef` immediately.

### Fixed: Non-sequential transition desync & missing fade (2026-03-26)
**Problem**: Three related issues with non-sequential module switching:
1. **No fade from idle**: `flushQueuedModule` always set `switchFromIdleRef=true`, causing non-sequential idle jumps to use the instant-switch path instead of fade-to-black.
2. **350ms debounce desync**: Active playback transitions debounced `SET_MODULE` by 350ms, but `setModulePage` (content panel) fired immediately — content faded while video lagged.
3. **Multi-second idle lag**: Non-sequential clicks from idle used `QUEUE_MODULE`, waiting up to 3s for the idle loop boundary before switching.
**Fix**: Removed debounce entirely. Non-sequential from idle now dispatches `SET_MODULE` immediately (only sequential forward still queues). `flushQueuedModule` only sets `switchFromIdleRef=true` for sequential jumps.

### Fixed: Next Chapter button showing during intro (2026-03-26)
**Problem**: After VideoPlayerStacked was changed to render videos during intro (for pre-loading), the Next Chapter button appeared when `currentIndex === -1` because `videoState.isIdle` starts as `true`.
**Fix**: Added `currentIndex >= 0` guard to the Next Chapter button render condition.

### Fixed: Pre-rendered module videos for HLS pre-loading (2026-03-26)
**Problem**: Module videos only rendered after `SET_MODULE` dispatched, causing slow HLS loading during transitions.
**Fix**: Removed the `currentIndex === -1` early return from VideoPlayerStacked. All module videos now render at opacity 0 from page load, allowing HLS to pre-buffer.

### Fixed: PreLoader sync with intro video (2026-03-27)
**Problem**: PreLoader faded out before intro video was ready, showing a black screen.
**Fix**: PreLoader now waits for both `window.load` AND `intro-video-ready` custom DOM event (dispatched by IntroOverlay on `canPlay`) before completing past 90%.

### Bug: Sequential module transition skips last frames when timecode is set (2026-03-27)
**Status**: OPEN
**Symptoms**: Modules WITH `videoEndTimecode` skip ~4-5 frames at the end of the idle loop when transitioning to the next sequential module. Modules WITHOUT timecodes transition seamlessly from the true last frame.
**Root cause**: In `VideoPlayerStacked.handleTimeUpdate`, the `nearEnd` check (`dur - ct < 0.15`) triggers `flushQueuedModule()` 150ms (~4.5 frames at 30fps) before the video's actual last frame. This threshold exists for the normal idle loop seek-back (where cutting a few frames early is invisible since the loop is seamless), but it also catches the queued module flush — causing the transition to happen before the last frame is shown.
**Location**: `VideoPlayerStacked.tsx` lines ~420-431 (the `nearEnd` block inside idle mode handling in `handleTimeUpdate`).
**Proposed fix**: When `videoState.queuedModuleIndex !== null` and we're in the `nearEnd` zone, do NOT flush. Instead, skip the seek-back too (don't loop) and let the video play to its natural end. `handleEnded` (lines ~458-481) already calls `flushQueuedModule()` and fires at the true last frame. The change is roughly:
```js
if (nearEnd) {
    if (videoState.queuedModuleIndex !== null) {
        // Don't flush here AND don't seek back — let video play to actual end.
        // handleEnded will flush at the true last frame.
        return
    }
    // Normal loop-back seek (no queued module)
    // ... existing seek code ...
}
```
**Risk**: `handleEnded` might not fire reliably with HLS streams on all browsers. If this is a problem, tighten the nearEnd threshold for the queued case (e.g., `dur - ct < 0.02` = ~1 frame) as a fallback, or use `requestVideoFrameCallback` to detect the actual last frame.
**Additional note**: There may also be a frame-accuracy issue in `timecodeToSeconds` — frame `ff / 30` produces floating-point values (e.g., frame 15 = 0.5 exactly, but frame 7 = 0.2333...). This could cause `mainEnd` to not align perfectly with actual frame boundaries, making the idle loop start/end points slightly off. This is a secondary concern — the primary fix is the nearEnd flush timing.

## Debug Tools

- Press **`d`** key on the video player or intro overlay to toggle a debug overlay showing video state, timecodes, readyState, etc.

## Environment Variables

```
NEXT_PUBLIC_SANITY_PROJECT_ID
NEXT_PUBLIC_SANITY_DATASET
NEXT_PUBLIC_SANITY_API_VERSION
SANITY_API_READ_TOKEN
SANITY_API_WRITE_TOKEN
NEXT_PUBLIC_SANITY_TOKEN
SANITY_PREVIEW_SECRET
MUX_TOKEN_ID
MUX_TOKEN_SECRET
```

## Conventions

- Single-page app: no route-based navigation. All navigation via context state.
- Mobile breakpoint: 768px (md in Tailwind).
- Video URLs: `https://stream.mux.com/{playbackId}.m3u8`
- Timecodes in Sanity: `HH;MM;SS;FF` format at 30fps (semicolons as delimiters).
- Content panel stages: `hidden` → `peek` → `expanded` (mobile slides up; desktop is side panel).
- Inter-component signals outside provider stack use custom DOM events (e.g., `intro-video-ready`).
