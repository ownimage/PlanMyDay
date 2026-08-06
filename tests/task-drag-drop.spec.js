const { test, expect } = require("@playwright/test");

const TEST_STREAMS = [
  {
    id: "stream_1", title: "Main", description: "", tab: "main", image: "", sequence: 1,
    jobs: [{
      id: "job_1", title: "Job1", description: "", active: true, frequency: "daily",
      sequence: 1, time: "", suffix: false, dayType: "dayOfYear", mod: "",
      tasks: [
        { description: "Task A", done: false, note: "" },
        { description: "Task B", done: false, note: "" },
        { description: "Task C", done: false, note: "" },
        { description: "Task D", done: false, note: "" }
      ]
    }]
  }
];

async function openTasks(page) {
  await page.goto("/");
  await page.evaluate((data) => localStorage.setItem("planmydays_streams", JSON.stringify(data)), TEST_STREAMS);
  await page.reload();
  await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
  await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
  await page.locator("#streamEditorList .stream-header-main").first().click();
  await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
  await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
  await page.locator("#jobEditModal").waitFor({ state: "visible" });
  await page.locator("#jobTasks-tab").click();
}

async function getOrder(page) {
  return page.evaluate(() => [...document.querySelectorAll("#jobTasksList .task-desc-input")].map(el => el.value));
}

// Drag via real mouse events so we can release at an arbitrary point (including
// empty space outside the list), matching how a user performs the gesture.
async function dragHandleTo(page, fromIdx, x, y) {
  const handle = page.locator("#jobTasksList .task-drag-card").nth(fromIdx).locator(".drag-handle");
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.up();
}

test.describe("task drag & drop across a 4-task list", () => {
  test.beforeEach(async ({ page }) => {
    await openTasks(page);
  });

  test("drag top task and release below the last card moves it to the end", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["Task A", "Task B", "Task C", "Task D"]);
    const lb = await page.locator("#jobTasksList .task-drag-card").nth(3).boundingBox();
    await dragHandleTo(page, 0, lb.x + lb.width / 2, lb.y + lb.height + 20);
    expect(await getOrder(page)).toEqual(["Task B", "Task C", "Task D", "Task A"]);
  });

  test("drag bottom task and release above the first card moves it to the start", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["Task A", "Task B", "Task C", "Task D"]);
    const fb = await page.locator("#jobTasksList .task-drag-card").nth(0).boundingBox();
    await dragHandleTo(page, 3, fb.x + fb.width / 2, fb.y - 10);
    expect(await getOrder(page)).toEqual(["Task D", "Task A", "Task B", "Task C"]);
  });

  test("drag top task onto the lower half of the last card moves it to the end", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["Task A", "Task B", "Task C", "Task D"]);
    const lb = await page.locator("#jobTasksList .task-drag-card").nth(3).boundingBox();
    await dragHandleTo(page, 0, lb.x + lb.width / 2, lb.y + lb.height * 0.8);
    expect(await getOrder(page)).toEqual(["Task B", "Task C", "Task D", "Task A"]);
  });

  test("drag top task onto the upper half of the second card swaps them", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["Task A", "Task B", "Task C", "Task D"]);
    const sb = await page.locator("#jobTasksList .task-drag-card").nth(1).boundingBox();
    await dragHandleTo(page, 0, sb.x + sb.width / 2, sb.y + sb.height * 0.2);
    expect(await getOrder(page)).toEqual(["Task B", "Task A", "Task C", "Task D"]);
  });

  test("drop highlight sits under the open note, not under the title", async ({ page }) => {
    await page.locator("#jobTasksList .task-note-btn").nth(1).click();
    await expect(page.locator("#taskNoteRow1")).toBeVisible();

    const handle = page.locator("#jobTasksList .task-drag-card").nth(0).locator(".drag-handle");
    const hb = await handle.boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    const note = page.locator("#taskNoteRow1");
    const nb = await note.boundingBox();
    await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height * 0.9, { steps: 8 });

    await expect(note).toHaveClass(/drag-over-bottom/);
    await expect(page.locator("#jobTasksList .task-drag-card").nth(1)).not.toHaveClass(/drag-over-bottom/);
    await page.mouse.up();
  });

  test("dragging under the LAST item with an open note shows highlight under that note", async ({ page }) => {
    await page.locator("#jobTasksList .task-note-btn").nth(3).click();
    await expect(page.locator("#taskNoteRow3")).toBeVisible();

    const handle = page.locator("#jobTasksList .task-drag-card").nth(0).locator(".drag-handle");
    const hb = await handle.boundingBox();
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    const note = page.locator("#taskNoteRow3");
    const nb = await note.boundingBox();
    // Drag into the reserved drop zone below the last item
    await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height + 20, { steps: 8 });

    await expect(note).toHaveClass(/drag-over-bottom/);
    await expect(page.locator("#jobTasksList .task-drag-card").nth(3)).not.toHaveClass(/drag-over-bottom/);
    await page.mouse.up();
  });
});

test.describe("task touch drag & drop across a 4-task list", () => {
  test.beforeEach(async ({ page }) => {
    await openTasks(page);
  });

  // Drive the touch handlers directly (they are always attached). Touch events
  // are retargeted to the element that received touchstart, so we dispatch every
  // event on the handle while moving the reported coordinates.
  async function touchDragHandleTo(page, fromIdx, x, y) {
    await page.evaluate(({ fromIdx, x, y }) => {
      const handle = document.querySelectorAll("#jobTasksList .task-drag-card .drag-handle")[fromIdx];
      const hb = handle.getBoundingClientRect();
      const sx = hb.x + hb.width / 2, sy = hb.y + hb.height / 2;
      const touch = (cx, cy) => new Touch({ identifier: 1, target: handle, clientX: cx, clientY: cy });
      const fire = (type, cx, cy, touches) => {
        handle.dispatchEvent(new TouchEvent(type, {
          bubbles: true, cancelable: true,
          touches, changedTouches: [touch(cx, cy)], targetTouches: touches,
          clientX: cx, clientY: cy
        }));
      };
      fire("touchstart", sx, sy, [touch(sx, sy)]);
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        fire("touchmove", sx + (x - sx) * i / steps, sy + (y - sy) * i / steps, [touch(sx + (x - sx) * i / steps, sy + (y - sy) * i / steps)]);
      }
      fire("touchend", x, y, []);
    }, { fromIdx, x, y });
  }

  test("touch-drag top task and release below the last card appends it", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["Task A", "Task B", "Task C", "Task D"]);
    const lb = await page.locator("#jobTasksList .task-drag-card").nth(3).boundingBox();
    await touchDragHandleTo(page, 0, lb.x + lb.width / 2, lb.y + lb.height + 20);
    expect(await getOrder(page)).toEqual(["Task B", "Task C", "Task D", "Task A"]);
  });

  test("touch-drag bottom task and release above the first card prepends it", async ({ page }) => {
    expect(await getOrder(page)).toEqual(["Task A", "Task B", "Task C", "Task D"]);
    const fb = await page.locator("#jobTasksList .task-drag-card").nth(0).boundingBox();
    await touchDragHandleTo(page, 3, fb.x + fb.width / 2, fb.y - 10);
    expect(await getOrder(page)).toEqual(["Task D", "Task A", "Task B", "Task C"]);
  });

  test("touch drop highlight sits under the open note, not under the title", async ({ page }) => {
    await page.locator("#jobTasksList .task-note-btn").nth(1).click();
    await expect(page.locator("#taskNoteRow1")).toBeVisible();

    const hb = await page.locator("#jobTasksList .task-drag-card").nth(0).locator(".drag-handle").boundingBox();
    const nb = await page.locator("#taskNoteRow1").boundingBox();
    const sx = hb.x + hb.width / 2, sy = hb.y + hb.height / 2;
    const tx = nb.x + nb.width / 2, ty = nb.y + nb.height * 0.9;

    await page.evaluate(({ sx, sy, tx, ty }) => {
      const handle = document.querySelectorAll("#jobTasksList .task-drag-card .drag-handle")[0];
      const touch = (cx, cy) => new Touch({ identifier: 1, target: handle, clientX: cx, clientY: cy });
      const fire = (type, cx, cy, touches) => {
        handle.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches, changedTouches: [touch(cx, cy)], targetTouches: touches, clientX: cx, clientY: cy }));
      };
      fire("touchstart", sx, sy, [touch(sx, sy)]);
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const x = sx + (tx - sx) * i / steps, y = sy + (ty - sy) * i / steps;
        fire("touchmove", x, y, [touch(x, y)]);
      }
    }, { sx, sy, tx, ty });

    await expect(page.locator("#taskNoteRow1")).toHaveClass(/drag-over-bottom/);
    await expect(page.locator("#jobTasksList .task-drag-card").nth(1)).not.toHaveClass(/drag-over-bottom/);

    await page.evaluate(({ tx, ty }) => {
      const handle = document.querySelectorAll("#jobTasksList .task-drag-card .drag-handle")[0];
      const touch = (cx, cy) => new Touch({ identifier: 1, target: handle, clientX: cx, clientY: cy });
      handle.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, touches: [], changedTouches: [touch(tx, ty)], targetTouches: [], clientX: tx, clientY: ty }));
    }, { tx, ty });
  });
});
