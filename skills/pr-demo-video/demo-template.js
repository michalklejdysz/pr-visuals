async (page) => {
  // Copy to .pr-visuals/out/<branch>/demo.js and fill in OUTPUT, START_URL and the scenes.
  // Run from the repo root: playwright-cli -s=demo run-code --filename .pr-visuals/out/<branch>/demo.js
  // The file must stay a single arrow function with no trailing semicolon.
  const OUTPUT = "/absolute/path/to/repo/.pr-visuals/out/<branch>/demo.webm";
  const START_URL = "http://localhost:5173/";
  const SIZE = { width: 1440, height: 900 };
  const ACCENT = "#4f46e5"; // from .pr-visuals/config.md
  // GitHub's inline player shows the video at about 60 %, so text is sized for that.
  const TEXT = { callout: 20, ticketTitle: 30, ticketBody: 20, ticketMeta: 16 };

  const escape = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const measure = async (locator, what) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error(`${what}: target is not visible`);
    return box;
  };

  // A title card between scenes: showChapter("Title", { description: "One line" }). Playwright's
  // default of 2 s is too short to read, hence 2.5 s.
  const showChapter = (title, options) => page.screencast.showChapter(title, { duration: 2500, ...options });

  // A numbered card on the side of the element with the most free space, an arrow from the
  // card to the element and a dashed ring around it. Pass `at: { x, y }` to place the card
  // yourself when the automatic spot covers something.
  const CARD = { width: 420, height: 60, gap: 120 };
  let step = 0;
  const callout = async (locator, text, { duration = text.split(" ").length > 4 ? 3500 : 3000, at } = {}) => {
    step += 1;
    const box = await measure(locator, `callout ${step}: "${text}"`);
    const midY = box.y + box.height / 2;
    const space = {
      left: box.x,
      right: SIZE.width - (box.x + box.width),
      below: SIZE.height - (box.y + box.height)
    };
    const side = Object.keys(space).reduce((a, b) => (space[a] >= space[b] ? a : b));
    const clampY = (y) => Math.min(Math.max(y, 16), SIZE.height - CARD.height - 16);
    const clampX = (x) => Math.min(Math.max(x, 16), SIZE.width - CARD.width - 16);
    const card = at ?? {
      left: { x: clampX(box.x - CARD.gap - CARD.width), y: clampY(midY - CARD.height / 2) },
      right: { x: clampX(box.x + box.width + CARD.gap), y: clampY(midY - CARD.height / 2) },
      below: { x: clampX(box.x + box.width / 2 - CARD.width / 2), y: clampY(box.y + box.height + CARD.gap / 2) }
    }[side];
    // Arrow from the card's nearest edge to the ring's nearest edge.
    const from = {
      x: Math.min(Math.max(box.x + box.width / 2, card.x), card.x + CARD.width),
      y: Math.min(Math.max(midY, card.y), card.y + CARD.height)
    };
    const to = {
      x: Math.min(Math.max(from.x, box.x - 6), box.x + box.width + 6),
      y: Math.min(Math.max(from.y, box.y - 6), box.y + box.height + 6)
    };
    await page.screencast.showOverlay(
      `<div style="position:absolute;left:${box.x - 6}px;top:${box.y - 6}px;width:${box.width + 12}px;height:${box.height + 12}px;border:2px dashed ${ACCENT};border-radius:10px"></div>
       <svg style="position:absolute;inset:0;width:100%;height:100%;overflow:visible">
         <defs><marker id="tip" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${ACCENT}"/></marker></defs>
         <line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${ACCENT}" stroke-width="3" marker-end="url(#tip)"/>
       </svg>
       <div style="position:absolute;left:${card.x}px;top:${card.y}px;width:${CARD.width}px;min-height:${CARD.height}px;box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:10px 16px;background:#fff;border:2px solid ${ACCENT};border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,.18);font:600 ${TEXT.callout}px/1.3 system-ui,sans-serif;color:#0f172a">
         <span style="flex:none;width:32px;height:32px;border-radius:50%;background:${ACCENT};color:#fff;display:grid;place-items:center;font-size:${TEXT.callout - 4}px">${step}</span>
         <span>${escape(text)}</span>
       </div>`,
      { duration }
    );
  };

  // The "look" moment: a dark screen with a spotlight on the changed component (a whole card or
  // panel, not a single word). It opens at `start` ms, holds, then the dark lifts.
  // Overlays animate only opacity and transform: the screencast drops frames whenever Chrome
  // has to repaint (animated size, shadow or blur), and the video stutters.
  const SPOT = { open: 700, lift: 500, hold: 1800 };
  const spotlight = (box, start, total, hold) => {
    const pad = 20;
    const at = (ms) => `${((ms / total) * 100).toFixed(2)}%`;
    const place = `position:absolute;left:${box.x - pad}px;top:${box.y - pad}px;width:${box.width + pad * 2}px;height:${box.height + pad * 2}px;border-radius:18px`;
    return `<style>
        @keyframes pv-dim { 0%, ${at(start)} { opacity: 0 } ${at(start + SPOT.open)}, ${at(start + SPOT.open + hold)} { opacity: 1 } 100% { opacity: 0 } }
        @keyframes pv-ring { 0%, ${at(start)} { opacity: 0; transform: scale(.9) } ${at(start + SPOT.open)}, ${at(start + SPOT.open + hold)} { opacity: 1; transform: none } 100% { opacity: 0; transform: none } }
      </style>
      <div style="${place};box-shadow:0 0 0 4000px rgba(15,23,42,.55);animation:pv-dim ${total}ms ease-in-out both"></div>
      <div style="${place};box-shadow:0 0 0 3px ${ACCENT}, 0 0 40px 6px ${ACCENT};animation:pv-ring ${total}ms cubic-bezier(.2, .8, .2, 1) both"></div>`;
  };
  const reveal = async (locator, { hold = SPOT.hold } = {}) => {
    const box = await measure(locator, "reveal");
    const total = SPOT.open + hold + SPOT.lift;
    await page.screencast.showOverlay(spotlight(box, 0, total, hold), { duration: total });
  };

  // The ticket the change implements, as a card over the blurred app: id, title and acceptance
  // criteria. Reading time grows with the list. `done` ticks every criterion, for the closing
  // card. `reveal: locator` hands straight over to the spotlight in the same overlay, so the
  // screen stays dark between the two.
  const readingTime = (criteria) => 2500 + 1500 * criteria.length;
  const showTicket = async ({ id, title, criteria }, { done = false, duration, reveal: target, hold = SPOT.hold } = {}) => {
    const box = target && (await measure(target, "showTicket reveal"));
    const read = duration ?? readingTime(criteria);
    const total = box ? read + SPOT.open + hold + SPOT.lift : read;
    const at = (ms) => `${((ms / total) * 100).toFixed(2)}%`;
    const items = criteria
      .map(
        (text, i) => `<li style="display:flex;gap:14px;align-items:flex-start;padding:12px 0;border-top:1px solid #e2e8f0">
          <span style="flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:${TEXT.ticketMeta}px;color:#fff;background:${done ? "#16a34a" : ACCENT}">${done ? "✓" : i + 1}</span>
          <span>${escape(text)}</span></li>`
      )
      .join("");
    // With a spotlight, the backdrop hands its darkness to it: the blur clears as the spot opens.
    const backEnd = box
      ? `${at(read)} { opacity: 1 } ${at(read + SPOT.open)}, 100% { opacity: 0 }`
      : `${at(read - 350)} { opacity: 1 } 100% { opacity: 0 }`;
    await page.screencast.showOverlay(
      `<style>
        @keyframes pv-card { 0% { opacity: 0; transform: translateY(12px) } ${at(300)}, ${at(read - 350)} { opacity: 1; transform: none } ${at(read)}, 100% { opacity: 0; transform: none } }
        @keyframes pv-back { 0% { opacity: 0 } ${at(300)} { opacity: 1 } ${backEnd} }
      </style>
      ${box ? spotlight(box, read, total, hold) : ""}
      <div style="position:absolute;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);animation:pv-back ${total}ms ease-in-out both"></div>
      <div style="position:absolute;inset:0;display:grid;place-items:center">
        <div style="width:760px;box-sizing:border-box;background:#fff;border-radius:18px;padding:32px 36px;box-shadow:0 24px 60px rgba(0,0,0,.35);font:500 ${TEXT.ticketBody}px/1.45 system-ui,sans-serif;color:#0f172a;animation:pv-card ${total}ms ease-out both">
          <div style="display:flex;gap:12px;align-items:center;font-size:${TEXT.ticketMeta}px;color:#64748b">
            <span style="padding:4px 12px;border-radius:7px;background:${ACCENT};color:#fff;font-weight:700">${escape(id)}</span>
            <span>${done ? "Done: every criterion shown" : "Acceptance criteria"}</span>
          </div>
          <div style="margin:16px 0 12px;font-size:${TEXT.ticketTitle}px;font-weight:700">${escape(title)}</div>
          <ol style="list-style:none;margin:0;padding:0">${items}</ol>
        </div>
      </div>`,
      { duration: total }
    );
  };

  // The recording draws no cursor, so a click gets an expanding ring where it lands.
  const clickPulse = async (locator) => {
    const box = await measure(locator, "clickPulse");
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.screencast.showOverlay(
      `<style>@keyframes pv-pulse { 0% { transform: scale(0); opacity: .9 } 100% { transform: scale(1); opacity: 0 } }</style>
       <div style="position:absolute;left:${x - 32}px;top:${y - 32}px;width:64px;height:64px;box-sizing:border-box;border-radius:50%;border:3px solid ${ACCENT};animation:pv-pulse 500ms ease-out both"></div>`,
      { duration: 500 }
    );
    await locator.click();
  };

  // Everything the viewer shouldn't see goes before start(): first load, language, dismissing banners.
  await page.setViewportSize(SIZE);
  await page.goto(START_URL);
  await page.waitForLoadState("networkidle");

  await page.screencast.start({ path: OUTPUT, size: SIZE });

  // With a ticket: open on it, spotlight what changed, one callout per criterion the UI can
  // show, close on the ticked list. Without a ticket, open on a showChapter about the change
  // and skip the closing card.
  const TICKET = {
    id: "ABC-123",
    title: "What the ticket asks for",
    criteria: ["First acceptance criterion", "Second acceptance criterion"]
  };
  await showTicket(TICKET, { reveal: page.locator("the changed component") });

  // Criterion 1
  // await callout(page.getByText("New thing"), "The new thing, 3–6 words");

  // Criterion 2: an interaction first
  // await clickPulse(page.getByRole("button", { name: "Open" }));
  // await page.waitForTimeout(800); // let animations settle before measuring
  // await callout(page.getByText("Result"), "What it proves");

  // More than three criteria or more than one screen: put a showChapter before each group.

  await showTicket(TICKET, { done: true, duration: 4000 });
  await page.screencast.stop();
}
