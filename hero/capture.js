async (page) => {
  // README hero, step 1: the real stills the stage animates. Run by hero/capture.sh, once per
  // mode: "after" and "before" shoot the demo app (capture.sh swaps the file in between),
  // "github" shoots the whole PR page, logged out. All at 2x (capture.sh sets it), so the
  // stage can zoom in.
  const OUT = "__OUT__";
  const MODE = "__MODE__";
  const URL = "__URL__";
  const SIZE = { width: 1440, height: 900 };

  await page.setViewportSize(SIZE);
  const rect = async (locator) => {
    const b = await locator.boundingBox();
    if (!b) throw new Error(`${MODE}: ${locator} is not visible`);
    const y = await page.evaluate(() => window.scrollY);
    return { x: Math.round(b.x), y: Math.round(b.y + y), width: Math.round(b.width), height: Math.round(b.height) };
  };

  if (MODE !== "github") {
    await page.goto(URL);
    // The trend text tells the two versions apart, so a stale hot reload can't pass as "before".
    await page.getByText(MODE === "after" ? "vs last month" : "+20.1% from last month").first().waitFor();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    const card = page.getByText("Total Revenue").locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
    const box = await rect(card);
    await page.screenshot({ path: `${OUT}/app-${MODE}.png`, scale: "device" });
    return JSON.stringify({ card: box });
  }

  await page.goto(URL);
  const shots = page.getByRole("heading", { name: "Screenshots" }).first();
  await shots.waitFor();
  // Load every image once; the video's own pixels come from the stage, not this shot.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1000);
  const out = {
    title: await rect(page.locator(".gh-header-title, [data-component='PH_Title']").first()),
    shots: await rect(shots),
    table: await rect(page.locator(".comment-body table, .markdown-body table").first()),
    player: await rect(page.locator("video").first()),
    height: await page.evaluate(() => document.documentElement.scrollHeight)
  };
  await page.screenshot({ path: `${OUT}/github.png`, fullPage: true, scale: "device" });
  return JSON.stringify(out);
}
