const { test, expect } = require("@playwright/test");

const TEST_STREAMS = [
  { id: "s1", title: "S1", description: "", tab: "main", image: "", sequence: 1, jobs: [] },
  { id: "s2", title: "S2", description: "", tab: "main", image: "", sequence: 2, jobs: [] },
  { id: "s3", title: "S3", description: "", tab: "main", image: "", sequence: 3, jobs: [] },
  { id: "s4", title: "S4", description: "", tab: "main", image: "", sequence: 4, jobs: [] }
];

async function openStreams(page) {
  await page.goto("/");
  await page.evaluate((data) => localStorage.setItem("planmydays_streams", JSON.stringify(data)), TEST_STREAMS);
  await page.reload();
  await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
  await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
  await page.locator("#streamEditorList .stream-drag-card").first().waitFor();
}

async function getOrder(page) {
  return page.evaluate(() => [...document.querySelectorAll("#streamEditorList .stream-drag-card .editor-title")].map(el => el.textContent.trim()));
}

async function dragHandleTo(page, fromIdx, x, y) {
  const handle = page.locator("#streamEditorList .stream-drag-card").nth(fromIdx).locator(".drag-handle");
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.up();
}

test.describe("stream reorder via mouse", () => {
  test.beforeEach(async ({ page }) => { await openStreams(page); });

  test("drag first stream onto last stream's lower half moves it to the end", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["S1", "S2", "S3", "S4"]);
    const lb = await page.locator("#streamEditorList .stream-drag-card").nth(3).boundingBox();
    await dragHandleTo(page, 0, lb.x + lb.width / 2, lb.y + lb.height * 0.8);
    expect(await getOrder(page)).toEqual(["S2", "S3", "S4", "S1"]);
  });

  test("drag last stream onto first stream's upper half moves it to the start", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["S1", "S2", "S3", "S4"]);
    const fb = await page.locator("#streamEditorList .stream-drag-card").nth(0).boundingBox();
    await dragHandleTo(page, 3, fb.x + fb.width / 2, fb.y + fb.height * 0.2);
    expect(await getOrder(page)).toEqual(["S4", "S1", "S2", "S3"]);
  });
});

test.describe("stream reorder via touch", () => {
  test.beforeEach(async ({ page }) => { await openStreams(page); });

  async function touchDragHandleTo(page, fromIdx, x, y) {
    await page.evaluate(({ fromIdx, x, y }) => {
      const handle = document.querySelectorAll("#streamEditorList .stream-drag-card .drag-handle")[fromIdx];
      const hb = handle.getBoundingClientRect();
      const sx = hb.x + hb.width / 2, sy = hb.y + hb.height / 2;
      const touch = (cx, cy) => new Touch({ identifier: 1, target: handle, clientX: cx, clientY: cy });
      const fire = (type, cx, cy, touches) => {
        handle.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches, changedTouches: [touch(cx, cy)], targetTouches: touches, clientX: cx, clientY: cy }));
      };
      fire("touchstart", sx, sy, [touch(sx, sy)]);
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        fire("touchmove", sx + (x - sx) * i / steps, sy + (y - sy) * i / steps, [touch(sx + (x - sx) * i / steps, sy + (y - sy) * i / steps)]);
      }
      fire("touchend", x, y, []);
    }, { fromIdx, x, y });
  }

  test("touch-drag first stream below the last stream moves it to the end", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["S1", "S2", "S3", "S4"]);
    const lb = await page.locator("#streamEditorList .stream-drag-card").nth(3).boundingBox();
    await touchDragHandleTo(page, 0, lb.x + lb.width / 2, lb.y + lb.height + 30);
    expect(await getOrder(page)).toEqual(["S2", "S3", "S4", "S1"]);
  });

  test("touch-drag stream to bottom does not trigger pull-to-refresh reload", async ({ page }) => {
    await page.evaluate(() => { window.__dndReloadMarker = "alive"; });
    expect(await getOrder(page)).toEqual(["S1", "S2", "S3", "S4"]);
    const lb = await page.locator("#streamEditorList .stream-drag-card").nth(3).boundingBox();
    await touchDragHandleTo(page, 0, lb.x + lb.width / 2, lb.y + lb.height + 30);
    expect(await getOrder(page)).toEqual(["S2", "S3", "S4", "S1"]);
    // pull-to-refresh schedules location.reload() 400ms after touchend when it
    // mistakes the drag for a pull gesture; wait past that window
    await page.waitForTimeout(700);
    const marker = await page.evaluate(() => window.__dndReloadMarker);
    expect(marker).toBe("alive");
  });

  test("touch-drag last stream above the first stream moves it to the start", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["S1", "S2", "S3", "S4"]);
    const fb = await page.locator("#streamEditorList .stream-drag-card").nth(0).boundingBox();
    await touchDragHandleTo(page, 3, fb.x + fb.width / 2, fb.y - 30);
    expect(await getOrder(page)).toEqual(["S4", "S1", "S2", "S3"]);
  });
});
