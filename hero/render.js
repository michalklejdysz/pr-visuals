async (page) => {
  // README hero, step 3: one screenshot per frame of stage.html. Run by hero/render.sh.
  const STAGE = "__STAGE__";
  const FRAMES = "__FRAMES__";
  const FPS = __FPS__, FROM = __FROM__, TO = __TO__;

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(STAGE);
  await page.evaluate(() => window.ready);
  const duration = await page.evaluate(() => window.DURATION);
  const last = Math.round(Math.min(TO, duration) * FPS);
  for (let f = Math.round(FROM * FPS); f < last; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    await page.screenshot({ path: `${FRAMES}/${String(f).padStart(5, "0")}.jpg`, type: "jpeg", quality: 92 });
  }
  return JSON.stringify({ duration, frames: last });
}
