# Mobile performance audit for IP Heimdall

## What is slowing the site down on phones

### 1. Heavy visual effects on every screen paint
The current UI uses multiple full-screen gradients, a fixed glow layer, `backdrop-filter: blur(12px)` on cards, large shadows, and entrance/hover animations. On mid-range phones these effects increase GPU compositing cost and make scrolling and first render feel heavy.

### 2. Too much UI is rendered immediately
The results section contains many cards and badges even before the user interacts with the page. The DOM is not huge, but for a simple one-screen tool it is still more work than necessary on mobile.

### 3. Duplicate network work for "Мой IP"
The previous flow fetched geolocation for the current user, then immediately triggered a second lookup path for the same IP. On mobile networks this adds extra latency and unnecessary radio wakeups.

### 4. Autoload on startup competes with first paint
The page automatically resolves the current IP on load. That means the browser is doing layout, painting, JavaScript execution, and network requests at the same time.

### 5. The favicon is large
`favicon.ico` is about 424 KB in this repository, which is unusually heavy for a favicon and wastes bandwidth on mobile.

## Changes applied in this branch

### CSS simplification
- Added `contain: layout paint style` to card-like blocks to reduce repaint/layout scope.
- Added `content-visibility: auto` to the results container so off-screen content can be skipped until needed.
- Limited hover transforms to devices that actually support hover.
- Disabled `backdrop-filter`, glow, and heavy shadows on small screens or coarse pointers.
- Added a `prefers-reduced-motion` fallback that disables animations and transitions.

### JavaScript/network simplification
- Added request caching for repeated/self lookups.
- Reworked the "Мой IP" flow to reuse the first lookup instead of triggering a second full pipeline.
- Deferred automatic self-lookup until browser idle time, and skipped it when `navigator.connection.saveData` or a very slow connection is detected.
- Rendered security badges through a `DocumentFragment` to avoid repeated DOM insertions.
- Added a timeout to external fetch requests so the UI is not blocked by long mobile-network stalls.

## Recommended next steps

### DOM
1. **Render fewer cards by default.**
   Show only the essential summary first: IP, country/city, provider, and VPN/proxy status. Put secondary details behind a disclosure block like “More network details”.

   Example:
   - Always visible: IP, country, city, ASN/org, security summary.
   - Collapsed on mobile: timezone, coordinates, postal code, country calling code.

2. **Generate detail cards from data.**
   Instead of hardcoding many repeated card nodes in HTML, keep one template and render only available fields. That reduces static DOM size and keeps the interface more adaptive.

3. **Do not render empty placeholders everywhere.**
   On mobile, empty placeholders like `—` across many cards create visual noise and extra nodes. Hide a card if the provider has no useful value for it.

### CSS
1. **Replace glassmorphism with flat surfaces on mobile.**
   `backdrop-filter` is one of the most expensive visual effects here. Keep the glass look for desktop if you want, but use opaque backgrounds on phones.

2. **Reduce shadows and layered gradients.**
   Prefer one simple background gradient and very small shadows, or none at all on mobile.

3. **Avoid animating many elements.**
   Keep only the spinner. Remove card hover motion and fade/translate entrance animation on touch devices.

4. **Prefer media queries based on capabilities.**
   Use `(pointer: coarse)`, `(hover: none)`, and `prefers-reduced-motion` in addition to width breakpoints.

### JavaScript
1. **Abort stale requests aggressively.**
   If a user submits another IP while a request is in flight, abort the old request instead of just ignoring the result.

2. **Lazy-load optional data.**
   Security enrichment can be a second-stage request triggered after the main geolocation is already painted.

3. **Cache recent IP lookups in memory or `sessionStorage`.**
   This is especially useful when users retry the same address or use the browser back button.

4. **Avoid work during startup.**
   Keep initial JS focused on attaching event listeners. Anything optional should happen after idle or explicit user interaction.

### Images and assets
1. **Shrink `favicon.ico`.**
   Replace it with a generated favicon set optimized for 16x16, 32x32, and 48x48 sizes. A favicon should usually be measured in a few KB, not hundreds.

2. **If you add screenshots or illustrations later, use AVIF/WebP and responsive sizes.**
   Do not ship large PNGs to mobile unnecessarily.

### Network
1. **Use one primary provider per action when possible.**
   Reserve fallback providers for failure states, not the normal path.

2. **Add request deduplication and backoff.**
   Reusing the same in-flight promise for identical IPs prevents duplicate work.

3. **Consider a lightweight edge/backend proxy.**
   A proxy can normalize responses server-side, add caching headers, and prevent the browser from making multiple third-party requests directly.

## Example of an even lighter mobile UI

### Suggested mobile layout
- Search field
- Primary action button
- Small summary card
  - IP
  - Country / city
  - Provider
  - Security verdict
- "Показать подробности" accordion
  - ASN
  - timezone
  - coordinates
  - postal
  - calling code

This keeps the first screen shorter, reduces scrolling, and prioritizes the information users actually need on a phone.
