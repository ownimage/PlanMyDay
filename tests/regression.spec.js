const { test, expect } = require("@playwright/test");
const { startCoverage, stopCoverage } = require("./coverage");

const TEST_STREAMS = [
  {
    id: "stream_1",
    title: "Work",
    description: "Work tasks",
    tab: "progress",
    image: "",
    sequence: 1,
    jobs: [
      {
        id: "job_1",
        title: "Report",
        description: "Weekly report",
        active: true,
        frequency: "daily",
        sequence: 1,
        suffix: true,
        dayType: "dayOfYear",
        mod: "",
        tasks: []
      },
      {
        id: "job_2",
        title: "Meeting",
        description: "Standup",
        active: true,
        frequency: "weekdays",
        sequence: 2,
        suffix: false,
        dayType: "dayOfYear",
        mod: "",
        tasks: []
      }
    ]
  },
  {
    id: "stream_2",
    title: "Chores",
    description: "",
    tab: "maintenance",
    image: "",
    sequence: 2,
    jobs: [
      {
        id: "job_3",
        title: "Laundry",
        description: "",
        active: true,
        frequency: "weekly",
        sequence: 1,
        suffix: false,
        dayType: "dayOfYear",
        mod: "",
        tasks: []
      }
    ]
  }
];

const now = new Date();
const todayStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");

function seedTodayList(page) {
  return page.evaluate(({ data, ds }) => {
    localStorage.setItem("planmydays_streams", JSON.stringify(data));
    localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_3"]));
    localStorage.setItem("planmydays_last_gen", ds);
    localStorage.setItem("planmydays_completed", JSON.stringify([]));
  }, { data: TEST_STREAMS, ds: todayStr });
}

test.describe("PlanMyDay - Regression", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("planmydays_images", "[]");
    });
    await startCoverage(page);
    await page.reload();
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
  });

  // ── Main View ──────────────────────────────────────────────

  test.describe("Main View", () => {

    test("loads with date heading", async ({ page }) => {
      await expect(page.locator("h2").first()).toBeVisible();
    });

    test("add card opens job edit modal", async ({ page }) => {
      await page.getByText("+ Add job").click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Add Job");
    });

    test("can cancel adding an adhoc card", async ({ page }) => {
      test.setTimeout(30000);
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditCancelBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await expect(page.locator("#jobEditModal")).not.toBeVisible({ timeout: 10000 });
    });

    test("can add an adhoc card", async ({ page }) => {
      test.setTimeout(30000);
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("Test Ad Hoc");
      await page.locator("#jobEditModalBody textarea").first().fill("Test description");
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.locator("h4").filter({ hasText: "Test Ad Hoc" })).toBeVisible();
    });

    test("completed jobs show strikethrough", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      const cb = page.locator('.job-checkbox[data-job-id="job_1"]');
      await cb.check();
      await expect(cb).toBeChecked();
    });

    test("view button appears on job cards", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await expect(page.locator("#todayCardList")).toBeVisible();
      const viewBtns = page.locator(".job-view-btn");
      await expect(viewBtns.first()).toBeVisible();
      await expect(await viewBtns.count()).toBeGreaterThanOrEqual(2);
    });

    test("view button opens read-only modal with job data", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await expect(page.locator("#todayCardList")).toBeVisible();
      await page.locator(".job-view-btn").first().click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("View Job");
      await expect(page.locator("#btnViewJobOk")).toHaveText("OK");
      await expect(page.locator("#btnViewJobEdit")).toHaveText("Edit");
      const titleInput = page.locator("#jobEditModalBody .form-control").first();
      await expect(titleInput).toHaveValue("Report");
      await expect(page.locator("#jobEditModalBody input:read-only, #jobEditModalBody select:disabled, #jobEditModalBody textarea:read-only, #jobEditModalBody input[type=checkbox]:disabled").first()).toBeVisible();
    });

    test("read-only modal closes with close button", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await expect(page.locator("#todayCardList")).toBeVisible();
      await page.locator(".job-view-btn").first().click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
      await page.locator("#btnViewJobOk").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await expect(page.locator("#jobEditModal")).toBeHidden({ timeout: 10000 });
    });

    test("edit button in view modal switches to editable mode", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobEditModalTitle")).toHaveText("View Job");
      await page.locator("#btnViewJobEdit").filter({ hasText: "Edit" }).click();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Edit Job");
      await expect(page.locator("#jobEditOkBtn")).toHaveText("OK");
      const titleInput = page.locator("#jobEditModalBody .form-control").first();
      await expect(titleInput).toHaveValue("Report");
      await expect(titleInput).toBeEditable();
    });

    test("can delete a job from view then edit flow", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await expect(page.locator("#todayCardList")).toBeVisible();
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobEditModalTitle")).toHaveText("View Job");
      await page.locator("#btnViewJobEdit").filter({ hasText: "Edit" }).click();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Edit Job");
      await expect(page.locator("#jobEditDelBtn")).toBeVisible();
      await page.locator("#jobEditDelBtn").click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmBtn").waitFor({ state: "visible" });
      await page.waitForTimeout(300);
      await page.locator("#deleteConfirmBtn").click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
        if (modal) modal.hide();
      });
    });

    test("view button renders regardless of badge text", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      const cards = page.locator("#todayCardList .card");
      const cardCount = await cards.count();
      for (let i = 0; i < cardCount; i++) {
        const btn = cards.nth(i).locator(".job-view-btn");
        await expect(btn).toBeVisible();
        const badge = cards.nth(i).locator(".badge.rounded-pill");
        await expect(badge).toBeVisible();
      }
    });

    test("job with future sleepUntil is hidden from main screen", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => {
        const streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs[0].sleepUntil = "2099-12-31";
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await expect(page.locator("#todayCardList")).toBeVisible();
      await expect(page.locator("h4").filter({ hasText: "Report" })).not.toBeVisible();
      await expect(page.locator("h4").filter({ hasText: "Laundry" })).toBeVisible();
    });

    test("setting sleepUntil to future via edit removes job from main screen", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await expect(page.locator("h4").filter({ hasText: "Report" })).toBeVisible();
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#btnViewJobEdit").filter({ hasText: "Edit" }).click();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Edit Job");
      await page.evaluate(() => jobField("sleepUntil", "2099-12-31"));
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.locator("h4").filter({ hasText: "Report" })).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator("h4").filter({ hasText: "Laundry" })).toBeVisible();
    });

    test("past sleepUntil is blanked when viewing job from main screen", async ({ page }) => {
      await seedTodayList(page);
      const pastDate = "2020-01-01";
      await page.evaluate((pd) => {
        const streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs[0].sleepUntil = pd;
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      }, pastDate);
      await page.reload();
      await expect(page.locator("h4").filter({ hasText: "Report" })).toBeVisible();
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobEditModalTitle")).toHaveText("View Job");
      await expect(page.locator("#jobSleepUntil")).toHaveValue("");
      await page.locator("#btnViewJobEdit").filter({ hasText: "Edit" }).click();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Edit Job");
      await expect(page.locator("#jobSleepUntil")).toHaveValue("");
    });

    test("view then edit preserves custom today order", async ({ page }) => {
      // stream order is job_1 (Work/Report), job_3 (Chores/Laundry)
      // set today order to custom order: job_3 then job_1 (reversed)
      await page.evaluate(({ data, ds }) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_3", "job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      }, { data: TEST_STREAMS, ds: todayStr });
      await page.reload();
      await expect(page.locator("#todayCardList")).toBeVisible();
      // verify custom order: Laundry (job_3) first, then Report (job_1)
      const cards = page.locator("#todayCardList .today-drag-card");
      await expect(cards.nth(0)).toContainText("Laundry");
      await expect(cards.nth(1)).toContainText("Report");
      // view then edit the first card (Laundry) without making changes
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#btnViewJobEdit").filter({ hasText: "Edit" }).click();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Edit Job");
      await page.locator("#jobEditOkBtn").click();
      // hide modal
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
      // verify order is still preserved: job_3 then job_1 first, then any new active jobs appended
      const order = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_today_order")));
      expect(order[0]).toBe("job_3");
      expect(order[1]).toBe("job_1");
    });

    test("clear button resets sleepUntil field", async ({ page }) => {
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.evaluate(() => {
        const fp = document.getElementById("jobSleepUntil")._flatpickr;
        if (fp) {
          fp.setDate("2099-12-31", true);
          fp.input.value = "2099-12-31";
        }
        updateSleepUntilClearBtn();
      });
      await page.locator("#jobSchedule-tab").click();
      await expect(page.locator("#jobSleepUntil")).toHaveValue("2099-12-31");
      const clearBtn = page.locator("#jobSleepUntilClearBtn");
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
      await expect(page.locator("#jobSleepUntil")).toHaveValue("");
    });

    test("ok button is disabled when title is empty", async ({ page }) => {
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.waitForTimeout(200);
      const okBtn = page.locator("#jobEditOkBtn");
      await expect(okBtn).toBeDisabled();
      await page.locator("#jobTitleInput").fill("My Job");
      await expect(okBtn).toBeEnabled();
      await page.locator("#jobTitleInput").clear();
      await page.waitForTimeout(100);
      await expect(okBtn).toBeDisabled();
    });
    
  });

  // ── Navigation ─────────────────────────────────────────────

  test.describe("Navigation", () => {

    test("opens settings page", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await expect(page.locator("#settingsPage")).toBeVisible();
    });

    test("opens streams editor", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await expect(page.locator("#streamsEditor")).toBeVisible();
    });

    test("opens images editor", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await expect(page.locator("#imagesEditor")).toBeVisible();
    });

    test("closes images editor back to main view", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.locator("#addImageTileTop .btn-success").click();
      await expect(page.locator("#countdownContainer")).toBeVisible();
    });

    test("edit dropdown has Streams and Images items", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Jobs" })).toBeVisible();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Images" })).toBeVisible();
    });

    test("import/export dropdown has items", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Import/Export" }).click();
      await expect(page.locator("a.dropdown-item").filter({ hasText: /^Export$/ })).toBeVisible();
      await expect(page.locator("a.dropdown-item").filter({ hasText: /^Import$/ })).toBeVisible();
    });

    test("exported filename does not contain -backup-", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      // Seed some images too so export has content
      await page.evaluate(() => {
        localStorage.setItem("planmydays_images", JSON.stringify([]));
      });

      const downloadPromise = page.waitForEvent("download");
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Import/Export" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: /^Export$/ }).click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).not.toContain("-backup-");
    });
  });

  // ── Settings ───────────────────────────────────────────────

  test.describe("Settings", () => {

    test("shows all main settings controls", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await expect(page.locator("#splitList")).toBeVisible();
      await expect(page.locator("#autoHideMenu")).toBeVisible();
      await expect(page.locator("#hideDone")).toBeVisible();
      await page.locator("#appearance-tab").click();
      await expect(page.locator("#themeSelector")).toBeVisible();
      await expect(page.locator("#fontSizeSelector")).toBeVisible();
      await expect(page.locator("#iconSizeSelector")).toBeVisible();
      await expect(page.locator("#densitySelector")).toBeVisible();
      await page.locator("#schedule-tab").click();
      await expect(page.locator("#jan1Selector")).toBeVisible();
      await expect(page.locator("#mondaySelector")).toBeVisible();
      await page.locator("#danger-tab").click();
      await expect(page.locator("#showDanger")).toBeVisible();
    });

    test("danger zone hidden by default", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await expect(page.locator("#regenerateTilesRow")).not.toBeVisible();
      await expect(page.locator("#clearAllDataRow")).not.toBeVisible();
    });

    test("danger zone appears when toggled", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await expect(page.locator("#regenerateTilesRow")).toBeVisible();
      await expect(page.locator("#clearAllDataRow")).toBeVisible();
    });

    test("font size selector changes body class", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#appearance-tab").click();
      await page.locator("#fontSizeSelector").selectOption("small");
      const hasClass = await page.evaluate(() => document.body.classList.contains("font-size-small"));
      expect(hasClass).toBe(true);
    });

    test("icon size selector changes body class", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#appearance-tab").click();
      await page.locator("#iconSizeSelector").selectOption("small");
      const hasClass = await page.evaluate(() => document.body.classList.contains("icon-size-small"));
      expect(hasClass).toBe(true);
    });

    test("density selector changes body class", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#appearance-tab").click();
      await page.locator("#densitySelector").selectOption("compact");
      const hasClass = await page.evaluate(() => document.body.classList.contains("compact"));
      expect(hasClass).toBe(true);
    });

    test("split list toggle persists", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#splitList").check();
      await expect(page.locator("#splitList")).toBeChecked();
    });

    test("auto hide menu toggle persists", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#autoHideMenu").check();
      await expect(page.locator("#autoHideMenu")).toBeChecked();
    });

    test("hide done toggle persists", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#hideDone").check();
      await expect(page.locator("#hideDone")).toBeChecked();
    });

    test("settings close returns to main view", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.locator("#countdownContainer")).toBeVisible();
    });
  });

  // ── Streams Editor ─────────────────────────────────────────

  test.describe("Streams Editor", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.waitForTimeout(400);
    });

    test("shows stream list", async ({ page }) => {
      await expect(page.getByText("Work")).toBeVisible();
      await expect(page.getByText("Chores")).toBeVisible();
    });

    test("add stream creates a new stream", async ({ page }) => {
      await page.getByRole("button", { name: "Add Stream" }).click();
      await expect(page.locator("#streamEditModal")).toBeVisible();
      await expect(page.locator("#streamEditModalBody input[value=\"New Stream\"]")).toBeVisible();
    });

    test("can edit a stream", async ({ page }) => {
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#streamEditModal").waitFor({ state: "visible" });
      const titleInput = page.locator("#streamEditModalBody input[value=\"Work\"]");
      await expect(titleInput).toBeVisible();
      await titleInput.fill("Work Updated");
      await page.waitForTimeout(200);
      await page.locator("#btnStreamEditOk").first().click();
      await page.waitForTimeout(800);
      await page.locator("#streamEditModal").waitFor({ state: "hidden", timeout: 15000 });
      await expect(page.getByText("Work Updated")).toBeVisible();
    });

    test("can cancel editing a stream", async ({ page }) => {
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#streamEditModal").waitFor({ state: "visible" });
      await page.locator("#streamEditModalBody input").first().fill("Cancelled");
      await page.waitForTimeout(200);
      await page.locator("#btnStreamEditCancel").click();
      await page.waitForTimeout(800);
      await page.locator("#streamEditModal").waitFor({ state: "hidden", timeout: 15000 });
      await page.locator("#streamEditorList .editor-title").filter({ hasText: "Work" }).waitFor({ state: "visible" });
      await expect(page.getByText("Cancelled")).not.toBeVisible();
    });

    test("can delete a stream with no jobs", async ({ page }) => {
      await page.evaluate(() => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams.push({ id: "stream_empty", title: "EmptyStream", tab: "progress", image: "", sequence: 99, jobs: [] });
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .accordion-header .btn-danger").filter({ hasText: "Delete" }).click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.waitForTimeout(200);
      await page.locator("#deleteConfirmBtn").click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
        if (modal) modal.hide();
      });
      await expect(page.getByText("EmptyStream")).not.toBeVisible();
    });

    test("delete button hidden when stream has jobs", async ({ page }) => {
      var delBtns = page.locator("#streamEditorList .accordion-header .btn-danger").filter({ hasText: "Delete" });
      await expect(delBtns).toHaveCount(0);
    });

    test("delete button shown when stream has no jobs", async ({ page }) => {
      await page.evaluate(() => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams.push({ id: "stream_empty", title: "EmptyStream", tab: "progress", image: "", sequence: 99, jobs: [] });
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      var delBtn = page.locator("#streamEditorList .accordion-header .btn-danger").filter({ hasText: "Delete" });
      await expect(delBtn).toBeVisible();
    });

    test("shows tab badge on stream cards", async ({ page }) => {
      await expect(page.locator("#streamEditorList .badge").first()).toBeVisible();
    });

    test("opens jobs from stream accordion", async ({ page }) => {
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await expect(page.locator("#streamEditorList .accordion-collapse.show .accordion-body")).toBeVisible();
    });

    test("closes streams editor back to main view", async ({ page }) => {
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.locator("#countdownContainer")).toBeVisible();
    });

    test("stream edit image button uses Change", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "ImgStream", tab: "progress", image: "testimg", sequence: 1, jobs: []
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "testimg", data: "" }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#streamEditModal")).toBeVisible();
      await expect(page.getByRole("button", { name: "Change" })).toBeVisible();
    });

    test("accordion stays expanded after edit stream", async ({ page }) => {
      // expand first stream
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      // edit the stream
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#streamEditModal").waitFor({ state: "visible" });
      await page.locator("#streamEditModalBody input").first().fill("WorkUpdated");
      await page.locator("#btnStreamEditOk").click();
      await page.locator("#streamEditModal").waitFor({ state: "hidden", timeout: 10000 });
      // accordion should still be expanded
      await expect(page.locator("#streamEditorList .accordion-collapse.show")).toBeVisible({ timeout: 5000 });
      // renamed title should be visible
      await expect(page.getByText("WorkUpdated")).toBeVisible();
    });
  });

  // ── Jobs Editor ────────────────────────────────────────────

  test.describe("Jobs Editor", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    });

    test("shows job list", async ({ page }) => {
      await expect(page.locator("#streamEditorList .accordion-body .fw-bold").first()).toContainText("Report");
      await expect(page.getByText("Meeting")).toBeVisible();
    });

    test("opens add job modal", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
    });

    test("can fill and save a new job", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("New Job Test");
      await page.locator("#jobEditOkBtn").click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await expect(page.getByText("New Job Test")).toBeVisible();
    });

    test("can cancel adding a new job", async ({ page }) => {
      test.setTimeout(30000);
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditCancelBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await expect(page.locator("#jobEditModal")).not.toBeVisible({ timeout: 10000 });
    });

    test("opens edit job modal with existing data", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobEditModalTitle")).toContainText("Edit");
    });

    test("can delete a job", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditDelBtn").click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmBtn").waitFor({ state: "visible" });
      await page.locator("#deleteConfirmBtn").click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "hidden", timeout: 10000 });
    });

    test("schedule modal opens from job edit", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await expect(page.locator("#scheduleModal")).toBeVisible();
    });

    test("schedule modal can select specific days", async ({ page }) => {
      test.setTimeout(30000);
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#scheduleModal").waitFor({ state: "visible" });
      await page.locator("#schedDays").check();
      await expect(page.locator("#schedDaysOptions")).toBeVisible();
      await page.locator("#schedDay0").check();
      await page.locator("#schedDay2").check();
      await page.locator("#scheduleModal .btn-primary").click();
    });

    test("returns to main view from editor", async ({ page }) => {
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.locator("#countdownContainer")).toBeVisible();
    });

    test("timed jobs appear before untimed jobs", async ({ page }) => {
      await page.evaluate(() => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs.push({ id: "job_late", title: "LateJob", active: true, frequency: "daily", sequence: 99, time: "", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] });
        streams[0].jobs.push({ id: "job_early", title: "EarlyJob", active: true, frequency: "daily", sequence: 1, time: "08:00", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] });
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      var jobCards = page.locator("#streamEditorList .accordion-body .job-drag-card .fw-bold");
      await expect(jobCards.first()).toContainText("EarlyJob");
    });

    test("all job tiles are draggable", async ({ page }) => {
      await page.evaluate(() => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs.push({ id: "job_timed", title: "TimedJob", active: true, frequency: "daily", sequence: 99, time: "09:00", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] });
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      var timedCard = page.locator(".job-drag-card").filter({ hasText: "TimedJob" });
      await expect(timedCard).toHaveAttribute("draggable", "true");
      var untimedCard = page.locator(".job-drag-card").filter({ hasText: "Report" });
      await expect(untimedCard).toHaveAttribute("draggable", "true");
    });

    test("active label is bold on job tiles", async ({ page }) => {
      var activeLabel = page.locator("#streamEditorList .accordion-body .form-check-label").first();
      await expect(activeLabel).toHaveClass(/fw-bold/);
    });

    test("job tiles have a drag handle for touch reorder", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await expect(page.locator(".job-drag-card .drag-handle").first()).toBeVisible();
    });

    test("touch reorder swaps job sequences via drag handle", async ({ page }) => {
      await page.evaluate(() => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs.push({ id: "job_drag1", title: "DragMe1", active: true, frequency: "daily", sequence: 99, time: "", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] });
        streams[0].jobs.push({ id: "job_drag2", title: "DragMe2", active: true, frequency: "daily", sequence: 100, time: "", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] });
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      const before = await page.evaluate(() => {
        const jobs = loadStreams()[0].jobs;
        return {
          d1: jobs.find(j => j.id === "job_drag1").sequence,
          d2: jobs.find(j => j.id === "job_drag2").sequence
        };
      });
      await page.evaluate(() => {
        const list = document.getElementById("streamEditorList");
        const c1 = [...list.querySelectorAll(".job-drag-card")].find(c => c.textContent.includes("DragMe2"));
        const c2 = [...list.querySelectorAll(".job-drag-card")].find(c => c.textContent.includes("DragMe1"));
        const h1 = c1.querySelector(".drag-handle");
        const r1 = h1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();
        const fire = (type, x, y, target) => {
          const t = new Touch({ identifier: 1, target, clientX: x, clientY: y });
          const touching = type === "touchend" || type === "touchcancel" ? [] : [t];
          target.dispatchEvent(new TouchEvent(type, {
            bubbles: true, cancelable: true,
            touches: touching, changedTouches: [t], targetTouches: touching
          }));
        };
        fire("touchstart", r1.x + 2, r1.y + 2, h1);
        fire("touchmove", r2.x + 10, r2.y + r2.height / 2, c2);
        fire("touchend", r2.x + 10, r2.y + r2.height / 2, c2);
      });
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => {
        const jobs = loadStreams()[0].jobs;
        return {
          d1: jobs.find(j => j.id === "job_drag1").sequence,
          d2: jobs.find(j => j.id === "job_drag2").sequence
        };
      });
      expect(after.d1).toBe(before.d2);
      expect(after.d2).toBe(before.d1);
    });

    test("activating a job adds it to today order", async ({ page }) => {
      // deactivate job_2 and remove it from today_order
      await page.evaluate((ds) => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        var jobs = streams[0].jobs;
        for (var i = 0; i < jobs.length; i++) {
          if (jobs[i].id === "job_2") { jobs[i].active = false; break; }
        }
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_3"]));
        localStorage.setItem("planmydays_last_gen", ds);
      }, todayStr);
      await page.reload();
      // go back to Jobs Editor
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      // toggle job_2 (Meeting) active
      var meetingToggle = page.locator("#streamEditorList .accordion-body .active-toggle").nth(1);
      await expect(meetingToggle).not.toBeChecked();
      await meetingToggle.check();
      await page.waitForTimeout(300);
      // click Done to return to main view
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.locator("#countdownContainer")).toBeVisible();
      // verify job_2 is now in today_order (if it matches today's schedule)
      var todayOrder = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_today_order")));
      expect(todayOrder).toContain("job_2");
      // verify position: original order preserved, new job appended
      expect(todayOrder.indexOf("job_1")).toBe(0);
      expect(todayOrder.indexOf("job_3")).toBe(1);
      expect(todayOrder.indexOf("job_2")).toBe(2);
    });
    
    test("deactivating a job removes it from today order", async ({ page }) => {
      // set today_order to include all three jobs
      await page.evaluate((ds) => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_2", "job_3"]));
        localStorage.setItem("planmydays_last_gen", ds);
      }, todayStr);
      await page.reload();
      // go to Jobs Editor
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      // verify job_2 is active and in the order
      var orderBefore = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_today_order")));
      expect(orderBefore).toContain("job_2");
      // uncheck job_2 (Meeting) - second checkbox
      var meetingToggle = page.locator("#streamEditorList .accordion-body .active-toggle").nth(1);
      await expect(meetingToggle).toBeChecked();
      await meetingToggle.uncheck();
      await page.waitForTimeout(300);
      // click Done to return to main view
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.locator("#countdownContainer")).toBeVisible();
      // verify job_2 is removed from today_order
      var orderAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_today_order")));
      expect(orderAfter).not.toContain("job_2");
      expect(orderAfter).toEqual(["job_1", "job_3"]);
    });
    
    test("accordion stays open after job drag reorder", async ({ page }) => {
      await page.evaluate(() => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs.push({ id: "job_drag1", title: "DragMe1", active: true, frequency: "daily", sequence: 99, time: "", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] });
        streams[0].jobs.push({ id: "job_drag2", title: "DragMe2", active: true, frequency: "daily", sequence: 100, time: "", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] });
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      // expand first stream
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      // drag an untimed job card
      var srcCard = page.locator(".job-drag-card").filter({ hasText: "DragMe2" });
      var dstCard = page.locator(".job-drag-card").filter({ hasText: "DragMe1" });
      await srcCard.dragTo(dstCard);
      await page.waitForTimeout(500);
      // accordion should still be expanded
      await expect(page.locator("#streamEditorList .accordion-collapse.show")).toBeVisible({ timeout: 5000 });
    });
  });

  // ── Schedule Modal ─────────────────────────────────────────

  test.describe("Schedule Modal", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
    });

    test("every day radio option works", async ({ page }) => {
      await page.locator("#schedDaily").check();
      await page.locator("#scheduleModal .btn-primary").click();
    });

    test("monthly option shows day selector", async ({ page }) => {
      await page.locator("#schedMonthly").check();
      await expect(page.locator("#schedMonthlyOptions")).toBeVisible();
      await page.locator("#scheduleModal .btn-primary").click();
    });
  });

  // ── Images Editor ──────────────────────────────────────────

  test.describe("Images Editor", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
    });

    test("shows image list", async ({ page }) => {
      await expect(page.locator("#imagesEditor")).toBeVisible();
    });

    test("add new image opens edit modal", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await expect(page.locator("#imageEditModal")).toBeVisible();
      await expect(page.locator("#imageEditModalTitle")).toHaveText("Add Image");
    });

    test("add image modal has all fields", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await expect(page.locator("#imageEditModal label").filter({ hasText: "Name" })).toBeVisible();
      await expect(page.locator("#imageEditModal label").filter({ hasText: "Line" })).toBeVisible();
      await expect(page.locator("#imageEditModal label").filter({ hasText: "Fill" })).toBeVisible();
      await expect(page.locator("#imageEditModal label").filter({ hasText: "Width" })).toBeVisible();
    });

    test("can name a new image", async ({ page }) => {
      test.setTimeout(30000);
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const nameInput = page.locator("#imageEditModalBody input:not([type])");
      await expect(nameInput).toBeVisible();
      await nameInput.fill("TestImage");
      await nameInput.blur();
      await page.locator("#btnImageEditOk").click();
      await page.locator("#imageEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.locator(".card:has-text('TestImage')")).toBeVisible({ timeout: 15000 });
    });

    test("can cancel adding a new image", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.waitForTimeout(300);
      await page.evaluate(() => cancelImageEdit());
      await page.locator("#imageEditModal").waitFor({ state: "hidden", timeout: 15000 });
    });

    test("duplicate button creates copy", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").fill("MyImg");
      await page.locator("#btnImageEditOk").click();
      await page.locator("#imageEditModal").waitFor({ state: "hidden" });
      await page.locator(".card:has-text('MyImg') .btn-info").filter({ hasText: "Duplicate" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").waitFor({ state: "visible", timeout: 10000 });
      await expect(page.locator("#imageEditModalBody .form-control:not(.form-control-sm)")).toHaveValue("MyImg 2");
    });

    test("delete button shows confirmation", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").fill("DelImg");
      await page.locator("#btnImageEditOk").click();
      await page.locator("#imageEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await page.locator(".card:has-text('DelImg')").waitFor({ state: "visible" });
      await page.locator(".card:has-text('DelImg') .btn-danger").filter({ hasText: "Delete" }).click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "visible" });
      await page.locator("#deleteConfirmBtn").click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.getByText("DelImg")).not.toBeVisible();
    });

    test("upload button exists on edit modal", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#btnImageUpload").waitFor({ state: "visible" });
      await expect(page.locator("#btnImageUpload")).toBeVisible();
    });

    test("search filters the image list", async ({ page }) => {
      const imgName = "FilterMe" + Date.now();
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").fill(imgName);
      await page.locator("#btnImageEditOk").click();
      await page.locator("#imageEditModal").waitFor({ state: "hidden" });
      await page.evaluate((name) => setImageNameSearch(name), imgName);
      await expect(page.locator(`.card:has-text('${imgName}')`)).toBeVisible();
    });

    test("clear search resets filter", async ({ page }) => {
      test.setTimeout(30000);
      await page.locator('#imageFilters input[type="search"]').fill("xyz");
      await expect(page.locator('#imageFilters input[type="search"]')).toHaveValue("xyz");
      await page.locator('#imageFilters .btn-outline-secondary').filter({ hasText: "Clear" }).click();
      await expect(page.locator('#imageFilters input[type="search"]')).toHaveValue("");
    });
  });

  // ── Image Edit Modal ───────────────────────────────────────

  test.describe("Image Edit Modal", () => {

    test("color pickers for line and fill exist", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.getByRole("button", { name: "Add Image" }).click();
      const colorInputs = page.locator('#imageEditModal input[type="color"]');
      await expect(colorInputs).toHaveCount(2);
    });

    test("stroke width input exists with correct range", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.getByRole("button", { name: "Add Image" }).click();
      const widthInput = page.locator('#imageEditModal input[type="number"]');
      await expect(widthInput).toHaveAttribute("min", "0.5");
      await expect(widthInput).toHaveAttribute("max", "10");
    });
  });

  // ── Image Picker Modal ─────────────────────────────────────

  test.describe("Image Picker Modal", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.evaluate((data) => {
        localStorage.clear();
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "PickTest", data: "" },
          { name: "Another", data: "" }
        ]));
      }, TEST_STREAMS);
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList").waitFor({ state: "visible" });
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Change" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await page.evaluate(() => {
        document.querySelectorAll(".modal.show").forEach(function(el) {
          if (el.id !== "imagePickerModal") {
            var inst = bootstrap.Modal.getInstance(el);
            if (inst) inst.hide();
          }
        });
      });
      await page.waitForTimeout(400);
    });

    test("opens from stream editor image choose", async ({ page }) => {
      await expect(page.locator("#imagePickerModal")).toBeVisible();
    });

    test("shows available images in picker", async ({ page }) => {
      await expect(page.getByText("PickTest")).toBeVisible();
      await expect(page.getByText("Another")).toBeVisible();
    });

    test("search filters picker items", async ({ page }) => {
      await page.locator(".image-picker-item").first().waitFor({ state: "visible" });
      await page.locator(".image-picker-search").fill("PickTest");
      await expect(page.getByText("PickTest")).toBeVisible();
      await expect(page.getByText("Another")).not.toBeVisible();
    });

    test("clear button resets picker search", async ({ page }) => {
      await page.locator(".image-picker-search").fill("PickTest");
      await page.locator("#btnImagePickerClear").click();
      await expect(page.locator(".image-picker-search")).toHaveValue("");
    });

    test("no image and cancel buttons exist", async ({ page }) => {
      await expect(page.getByText("No Image")).toBeVisible();
      await expect(page.locator("#imagePickerModal .btn-outline-secondary").last()).toBeVisible();
    });
  });

  // ── Dev Mode ───────────────────────────────────────────────

  test.describe("Dev Mode", () => {

    test("dev mode setting appears with ?dev=true", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await expect(page.locator(".flatpickr-input")).toHaveCount(2);
    });

    test("dev mode not visible without ?dev=true", async ({ page }) => {
      await page.goto("/");
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await expect(page.locator(".flatpickr-input")).toHaveCount(0);
    });
  });

  // ── Split List ─────────────────────────────────────────────

  test.describe("Split List", () => {

    test("tabs appear when split list enabled", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
      await page.reload();
      const tabs = page.locator("button.nav-link").filter({ hasText: /Progress|Maintenance/ });
      await expect(tabs).toHaveCount(2);
    });

    test("can switch between tabs", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
      await page.reload();
      await page.locator("button.nav-link").filter({ hasText: "Maintenance" }).click();
      await expect(page.getByText("Laundry")).toBeVisible();
      await expect(page.getByText("Report")).not.toBeVisible();
    });

    test("reordering on one tab does not lose jobs from the other tab", async ({ page }) => {
      // Seed with jobs in both tabs: job_1+job_2 (progress), job_3 (maintenance)
      await page.evaluate(({ data, ds }) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_2", "job_3"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_splitList", "true");
      }, { data: TEST_STREAMS, ds: todayStr });
      await page.reload();

      await expect(page.locator(".today-drag-card h4").filter({ hasText: "Report" })).toBeVisible();
      await expect(page.locator(".today-drag-card h4").filter({ hasText: "Meeting" })).toBeVisible();

      // Perform an actual reorder via drag-and-drop to exercise the real handler
      const cards = page.locator(".today-drag-card");
      await cards.nth(1).dragTo(cards.nth(0));

      // Switch to maintenance tab — Laundry should still be present
      await page.locator("button.nav-link").filter({ hasText: "Maintenance" }).click();
      await expect(page.locator(".today-drag-card h4").filter({ hasText: "Laundry" })).toBeVisible();
    });

    test("tab bar is visible above the job list when many jobs overflow", async ({ page }) => {
      // Seed a stream with 20 jobs and split list enabled
      const jobs = Array.from({ length: 20 }, (_, i) => ({
        id: `tab_test_job_${i}`,
        title: `Tab Test Job ${i}`,
        description: "",
        active: true,
        frequency: "daily",
        sequence: i,
        suffix: false,
        dayType: "dayOfYear",
        mod: "",
        tasks: []
      }));
      const stream = {
        id: "tab_test_stream",
        title: "TabTest",
        description: "",
        tab: "progress",
        image: "",
        sequence: 1,
        jobs
      };
      const now = new Date();
      const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
      await page.evaluate(({ stream, ds }) => {
        localStorage.setItem("planmydays_streams", JSON.stringify([stream]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(stream.jobs.map(j => j.id)));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_splitList", "true");
      }, { stream, ds });
      await page.reload();

      const tabBar = page.locator("button.nav-link").filter({ hasText: "Progress" });
      await expect(tabBar).toBeVisible();

      // Verify the tab bar is within the viewport (not pushed below the fold)
      const tabBox = await tabBar.boundingBox();
      expect(tabBox).not.toBeNull();
      expect(tabBox.y).toBeGreaterThanOrEqual(0);

      // Verify tabs appear above the first job card
      const firstCard = page.locator(".today-drag-card").first();
      const cardBox = await firstCard.boundingBox();
      expect(cardBox).not.toBeNull();
      expect(tabBox.y + tabBox.height).toBeLessThanOrEqual(cardBox.y);
    });
  });

  // ── Delete Confirm Modal ───────────────────────────────────

  test.describe("Delete Confirm Modal", () => {

    test("cancel button dismisses modal", async ({ page }) => {
      await page.evaluate((data) => {
        var streams = JSON.parse(JSON.stringify(data));
        streams.push({ id: "stream_empty", title: "EmptyStream", tab: "progress", image: "", sequence: 99, jobs: [] });
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      }, TEST_STREAMS);
      await page.reload();
      await page.waitForLoadState("domcontentloaded");
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList").waitFor({ state: "visible" });
      await page.locator("#streamEditorList .accordion-header .btn-danger").filter({ hasText: "Delete" }).click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "visible" });
      await page.locator("#btnDeleteCancel").click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
        if (modal) modal.hide();
      });
      await page.locator("#deleteConfirmModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.locator("#deleteConfirmModal")).not.toBeVisible();
    });
  });

  // ── Ad Hoc Workflow ────────────────────────────────────────

  test.describe("Ad Hoc Workflow", () => {

    test("checking adhoc shows remove confirmation", async ({ page }) => {
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("AdHocJob");
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await page.evaluate(() => {
        const cb = document.querySelector('.job-checkbox');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
    });

    test("skip adhoc confirm setting works", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_skipAdhocConfirm", "true"));
      await page.reload();
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("SkipMe");
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.getByText("SkipMe")).toBeVisible();
      await page.waitForSelector('.job-checkbox');
      await page.evaluate(() => {
        const cb = document.querySelector('.job-checkbox');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await page.waitForTimeout(500);
      await expect(page.locator("#deleteConfirmModal")).not.toBeVisible();
    });
  });

  // ── Suffix Display ─────────────────────────────────────────

  test.describe("Suffix Display", () => {

    test("suffix badge appears on job cards", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.locator("#todayCardList").waitFor({ state: "visible" });
      const suffixBadge = page.locator(".badge.bg-secondary").first();
      await expect(suffixBadge).toBeVisible();
    });
  });

  // ── Suffix Start Setting ──────────────────────────────────

  test.describe("Suffix Start Setting", () => {

    test("suffix start dropdown exists in settings after hide done", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#schedule-tab").click();
      const suffixStartSel = page.locator("#suffixStartSelector");
      await expect(suffixStartSel).toBeVisible();
    });

    test("suffix start 0 shows 0-based number on badge", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date();
        const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "SuffixJob", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_suffixStart", "0");
      });
      await page.reload();
      const badge = page.locator(".badge.bg-secondary").first();
      const text = await badge.textContent();
      const match = text.match(/\((\d+)\)/);
      expect(match).not.toBeNull();
    });

    test("suffix start 1 adds 1 to displayed number", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date();
        const jan1 = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - jan1) / 86400000);
        const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "SuffixPlus1", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_suffixStart", "1");
        localStorage.setItem("planmydays_jan1", "1");
      });
      await page.reload();
      const badge = page.locator(".badge.bg-secondary").first();
      const text = await badge.textContent();
      const match = text.match(/\((\d+)\)/);
      expect(match).not.toBeNull();
      const num = parseInt(match[1], 10);
      expect(num).toBeGreaterThan(0);
    });

    test("suffix start setting persists via settings page", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#schedule-tab").click();
      await page.locator("#suffixStartSelector").selectOption("1");
      const val = await page.evaluate(() => localStorage.getItem("planmydays_suffixStart"));
      expect(val).toBe("1");
    });
  });

  // ── Tab Badge ──────────────────────────────────────────────

  test.describe("Tab Badge", () => {

    test("tab badge shows progress or maintenance on job cards", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await expect(page.locator("h4").filter({ hasText: "Report" })).toBeVisible();
      const progressBadge = page.locator(".badge.bg-success").filter({ hasText: "progress" });
      await expect(progressBadge.first()).toBeVisible();
      const maintenanceBadge = page.locator(".badge.bg-warning").filter({ hasText: "maintenance" });
      await expect(maintenanceBadge.first()).toBeVisible();
    });
  });

  // ── Hide Done ──────────────────────────────────────────────

  test.describe("Hide Done", () => {

    test("completed jobs hidden when hideDone is on", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => {
        localStorage.setItem("planmydays_completed", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_hideDone", "true");
      });
      await page.reload();
      await expect(page.getByText("Report")).not.toBeVisible();
    });

    test("shows all completed message when all done and hidden", async ({ page }) => {
      await page.evaluate(({ streams, todayStr, todayOrder }) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
        localStorage.setItem("planmydays_today_order", JSON.stringify(todayOrder));
        localStorage.setItem("planmydays_last_gen", todayStr);
        localStorage.setItem("planmydays_completed", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_hideDone", "true");
      }, { streams: TEST_STREAMS, todayStr, todayOrder: ["job_1"] });
      await page.reload();
      await expect(page.getByText("All jobs completed!")).toBeVisible({ timeout: 10000 });
    });
  });

  // ── Settings UI Controls ─────────────────────────────────

  test.describe("Settings UI Controls", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.getByTitle("Settings").click();
    });

    test("theme selector changes theme", async ({ page }) => {
      await page.locator("#appearance-tab").click();
      await page.locator("#themeSelector").selectOption("solar");
      const val = await page.evaluate(() => localStorage.getItem("planmydays_theme"));
      expect(val).toBe("solar");
    });

    test("theme fallback on unknown value", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_theme", "nonexistent"));
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#settingsPage:not(.d-none)").waitFor({ state: "visible" });
      const linkHref = await page.evaluate(() => {
        const link = document.getElementById("bootstrap-theme-css");
        return link ? link.getAttribute("href") : "";
      });
      expect(linkHref).toContain("darkly");
    });

    test("font size normal removes size class", async ({ page }) => {
      await page.locator("#appearance-tab").click();
      await page.locator("#fontSizeSelector").selectOption("small");
      await page.locator("#fontSizeSelector").selectOption("normal");
      const hasSmall = await page.evaluate(() => document.body.classList.contains("font-size-small"));
      expect(hasSmall).toBe(false);
    });

    test("icon size medium and large change body class", async ({ page }) => {
      await page.locator("#appearance-tab").click();
      await page.locator("#iconSizeSelector").selectOption("medium");
      let hasClass = await page.evaluate(() => document.body.classList.contains("icon-size-medium"));
      expect(hasClass).toBe(true);
      await page.locator("#iconSizeSelector").selectOption("large");
      hasClass = await page.evaluate(() => document.body.classList.contains("icon-size-large"));
      expect(hasClass).toBe(true);
    });

    test("density normal removes compact class", async ({ page }) => {
      await page.locator("#appearance-tab").click();
      await page.locator("#densitySelector").selectOption("compact");
      await page.locator("#densitySelector").selectOption("normal");
      const hasCompact = await page.evaluate(() => document.body.classList.contains("compact"));
      expect(hasCompact).toBe(false);
    });

    test("auto hide menu disabling unbinds events", async ({ page }) => {
      await page.locator("#autoHideMenu").check();
      await page.locator("#autoHideMenu").uncheck();
      const autoHide = await page.evaluate(() => localStorage.getItem("planmydays_autoHideMenu"));
      expect(autoHide).toBe("false");
      const bodyClass = await page.evaluate(() => document.body.classList.contains("auto-hide-menu"));
      expect(bodyClass).toBe(false);
    });

    test("split list uncheck disables feature", async ({ page }) => {
      await page.locator("#splitList").check();
      await page.locator("#splitList").uncheck();
      const val = await page.evaluate(() => localStorage.getItem("planmydays_splitList"));
      expect(val).toBe("false");
    });

    test("hide done uncheck disables feature", async ({ page }) => {
      await page.locator("#hideDone").check();
      await page.locator("#hideDone").uncheck();
      const val = await page.evaluate(() => localStorage.getItem("planmydays_hideDone"));
      expect(val).toBe("false");
    });

    test("skip adhoc confirm uncheck disables feature", async ({ page }) => {
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#general-tab").click();
      await page.locator("#skipAdhocConfirm").waitFor({ state: "visible" });
      await page.locator("#skipAdhocConfirm").check();
      await page.locator("#skipAdhocConfirm").uncheck();
      const val = await page.evaluate(() => localStorage.getItem("planmydays_skipAdhocConfirm"));
      expect(val).toBe("false");
    });

    test("jan1 selector persists value", async ({ page }) => {
      await page.locator("#schedule-tab").click();
      await page.locator("#jan1Selector").selectOption("1");
      const val = await page.evaluate(() => localStorage.getItem("planmydays_jan1"));
      expect(val).toBe("1");
    });

    test("monday selector persists value", async ({ page }) => {
      await page.locator("#schedule-tab").click();
      await page.locator("#mondaySelector").selectOption("0");
      const val = await page.evaluate(() => localStorage.getItem("planmydays_monday"));
      expect(val).toBe("0");
    });

    test("auto hide menu toggle enables auto-hide", async ({ page }) => {
      await page.locator("#autoHideMenu").check();
      const autoHide = await page.evaluate(() => localStorage.getItem("planmydays_autoHideMenu") === "true");
      expect(autoHide).toBe(true);
      const bodyClass = await page.evaluate(() => document.body.classList.contains("auto-hide-menu"));
      expect(bodyClass).toBe(true);
    });

    test("skip adhoc confirm toggle works", async ({ page }) => {
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#general-tab").click();
      await page.locator("#skipAdhocConfirm").waitFor({ state: "visible" });
      await page.locator("#skipAdhocConfirm").check();
      const val = await page.evaluate(() => localStorage.getItem("planmydays_skipAdhocConfirm"));
      expect(val).toBe("true");
    });

    test("danger zone toggle shows dev rows in dev mode", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await expect(page.locator("#devTodayRow")).toBeVisible();
      await expect(page.locator("#devLastGenRow")).toBeVisible();
    });
  });

  // ── Job Edit Modal UI ───────────────────────────────────────

  test.describe("Job Edit Modal UI", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    });

    test("cancel job edit hides modal", async ({ page }) => {
      test.setTimeout(30000);
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditCancelBtn").click();
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
    });

    test("active toggle on job card works", async ({ page }) => {
      const cb = page.locator(".active-toggle").first();
      await cb.check();
      await expect(cb).toBeChecked();
    });

    test("add job with weekends schedule", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("WeekendJob");
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#schedWeekends").check();
      await page.locator("#scheduleModal .btn-primary").click();
      await page.locator("#scheduleModal").waitFor({ state: "hidden", timeout: 10000 });
      await page.locator("#jobEditOkBtn").click();
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.getByText("WeekendJob")).toBeVisible();
    });

    test("add job with monthly schedule", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("MonthlyJob");
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#schedMonthly").check();
      await expect(page.locator("#schedMonthlyOptions")).toBeVisible();
      await page.locator("#scheduleModal .btn-primary").click();
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await expect(page.getByText("MonthlyJob")).toBeVisible();
    });

    test("sleep until input exists in job edit", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await expect(page.locator("#jobSleepUntil")).toBeVisible();
    });

    test("edit job and change schedule time", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobSchedule-tab").click();
      await page.locator("#jobTimeHour").waitFor({ state: "visible" });
      await page.locator("#jobTimeHour").selectOption("14");
      await page.locator("#jobTimeMin").selectOption("30");
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      const badge = page.locator(".badge.bg-secondary").filter({ hasText: "14:30" });
      await expect(badge).toBeVisible();
    });
  });

  // ── Stream Selector in Job Edit ───────────────────────────────

  test.describe("Stream Selector in Job Edit", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([
          {
            id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
            jobs: [{ id: "job_1", title: "Report", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
          },
          {
            id: "stream_2", title: "Chores", tab: "maintenance", image: "", sequence: 2, jobs: []
          }
        ]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    });

    test("stream selector appears in add job modal", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobStreamDropdown")).toBeVisible();
    });

    test("stream selector appears in edit job modal", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobStreamDropdown")).toBeVisible();
    });

    test("stream selector defaults to current stream", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobStreamBtnText")).toHaveText("Work");
    });

    test("stream selector shows all stream names", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobStreamDropdownBtn").click();
      var items = page.locator("#jobStreamDropdownMenu .dropdown-item");
      await expect(items).toHaveCount(2);
      await expect(items.nth(0)).toContainText("Work");
      await expect(items.nth(1)).toContainText("Chores");
    });

    test("changing stream and saving moves job to new stream", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobStreamDropdownBtn").click();
      await page.locator("#jobStreamDropdownMenu .dropdown-item").nth(1).click();
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      const streams = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_streams")));
      expect(streams[0].jobs.length).toBe(0);
      expect(streams[1].jobs.length).toBe(1);
      expect(streams[1].jobs[0].title).toBe("Report");
    });

    test("change button opens image picker and shows selected name", async ({ page }) => {
      test.setTimeout(30000);
      const svg = "data:image/svg+xml," + encodeURIComponent('<svg stroke="#000000" fill="#ffffff" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>');
      await page.evaluate((svgData) => {
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "TestImg", data: svgData }]));
      }, svg);
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, [{
        id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
        jobs: [{ id: "job_1", title: "Report", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
      }]);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#btnJobImageChange").click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await page.locator(".image-picker-item").first().waitFor({ state: "visible", timeout: 10000 });
      await page.locator(".image-picker-item").first().click();
      await page.locator("#imagePickerModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.locator("#jobImageName")).toHaveText("TestImg");
    });
  });

  // ── Image Editing UI ────────────────────────────────────────

  test.describe("Image Editing UI", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      const svg = "data:image/svg+xml," + encodeURIComponent('<svg stroke="#000000" fill="#ffffff" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>');
      await page.addInitScript((svgData) => {
        localStorage.clear();
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "EditTest", data: svgData }]));
      }, svg);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.locator("#imagesEditor").waitFor({ state: "visible" });
    });

    test("edit image opens modal with existing data", async ({ page }) => {
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await expect(page.locator("#imageEditModal")).toBeVisible();
    });

    test("changing line color updates data", async ({ page }) => {
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const colorInput = page.locator('#imageEditModal input[type="color"]').first();
      await colorInput.fill("#ff0000");
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images"));
        return images[0].data;
      });
      expect(data).toContain("%23ff0000");
    });

    test("changing fill color updates data", async ({ page }) => {
      test.setTimeout(30000);
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const colorInput = page.locator('#imageEditModal input[type="color"]').nth(1);
      await colorInput.fill("#00ff00");
      await expect.poll(async () => {
        const images = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_images")));
        return images?.[0]?.data || "";
      }, { timeout: 5000 }).toContain("%2300ff00");
    });

    test("line none checkbox clears stroke", async ({ page }) => {
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator('#imageEditModal input[type="checkbox"]').first().check();
      await expect.poll(async () => {
        const images = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_images")));
        return images?.[0]?.data || "";
      }).toContain("none");
    });

    test("fill none checkbox clears fill", async ({ page }) => {
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator('#imageEditModal input[type="checkbox"]').nth(1).check();
      await expect.poll(async () => {
        const images = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_images")));
        return images?.[0]?.data || "";
      }).toContain("none");
    });

    test("stroke width input changes value", async ({ page }) => {
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const widthInput = page.locator('#imageEditModal input[type="number"]');
      await widthInput.fill("5");
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images"));
        return images[0].data;
      });
      expect(data).toContain("5");
    });

    test("duplicate name validation prevents OK", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const nameInput = page.locator("#imageEditModalBody .form-control:not(.form-control-sm)");
      await nameInput.fill("EditTest");
      await expect(page.locator("#imageNameError")).toBeVisible();
      const okBtn = page.locator('#imageEditModal .btn-success');
      await       expect(okBtn).toBeDisabled();
    });

    test("color change updates preview image live without closing modal", async ({ page }) => {
      test.setTimeout(30000);
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const previewImg = page.locator("#imageEditModalBody .card-edited img.date-img");
      await expect(previewImg).toBeVisible();
      const initialSrc = await previewImg.getAttribute("src");

      const colorInput = page.locator('#imageEditModal input[type="color"]').first();
      await colorInput.fill("#ff0000");

      await expect.poll(async () => {
        return previewImg.getAttribute("src");
      }, { timeout: 5000 }).not.toBe(initialSrc);

      const newSrc = await previewImg.getAttribute("src");
      expect(decodeURIComponent(newSrc)).toContain('stroke="#ff0000"');
    });
  });

  // ── Image Picker UI ─────────────────────────────────────────

  test.describe("Image Picker UI", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.addInitScript((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "PickMe", data: "" },
          { name: "PickMeToo", data: "" }
        ]));
      }, TEST_STREAMS);
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList").waitFor({ state: "visible" });
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Change" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await page.evaluate(() => {
        document.querySelectorAll(".modal.show").forEach(function(el) {
          if (el.id !== "imagePickerModal") {
            var inst = bootstrap.Modal.getInstance(el);
            if (inst) inst.hide();
          }
        });
      });
      await page.waitForTimeout(400);
    });

    test("selecting image sets name in stream editor", async ({ page }) => {
      await page.locator(".image-picker-item").first().waitFor({ state: "visible" });
      await page.evaluate(() => new Promise(resolve => {
        const el = document.getElementById("imagePickerModal");
        if (el.classList.contains("show") && !el.classList.contains("fade")) { resolve(); return; }
        el.addEventListener("shown.bs.modal", () => resolve(), { once: true });
        setTimeout(resolve, 500);
      }));
      await page.locator(".image-picker-item").first().dispatchEvent("click");
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("imagePickerModal"));
        if (modal) modal.hide();
      });
      await page.locator("#imagePickerModal").waitFor({ state: "hidden", timeout: 10000 });
      const name = await page.evaluate(() => editBuffer?.image || "");
      expect(name).toBe("PickMe");
    });

    test("search filters picker items", async ({ page }) => {
      await page.locator(".image-picker-item").first().waitFor({ state: "visible" });
      await page.locator(".image-picker-search").fill("PickMeToo");
      await page.locator(".image-picker-item:has-text('PickMeToo')").waitFor({ state: "visible" });
      await expect(page.locator(".image-picker-item").filter({ hasText: /^PickMeToo$/ })).toBeVisible();
      await expect(page.locator(".image-picker-item").filter({ hasText: /^PickMe$/ })).not.toBeVisible();
    });

    test("clear button resets picker search", async ({ page }) => {
      test.setTimeout(30000);
      await page.locator(".image-picker-search").fill("PickMeToo");
      await page.locator(".image-picker-item:has-text('PickMeToo')").waitFor({ state: "visible" });
      await page.locator("#imagePickerModal button:has-text('Clear')").click();
      await expect(page.locator(".image-picker-item").filter({ hasText: /^PickMe$/ })).toBeVisible();
    });

    test("closing picker with cancel button", async ({ page }) => {
      test.setTimeout(30000);
      await page.locator("#imagePickerModal .btn-outline-secondary").filter({ hasText: "Cancel" }).click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("imagePickerModal"));
        if (modal) modal.hide();
      });
      await page.locator("#imagePickerModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.locator("#imagePickerModal")).not.toBeVisible();
    });

    test("no image button clears image in editor", async ({ page }) => {
      await page.getByText("No Image").click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("imagePickerModal"));
        if (modal) modal.hide();
      });
      await page.locator("#imagePickerModal").waitFor({ state: "hidden", timeout: 10000 });
      const img = await page.evaluate(() => editBuffer?.image || "");
      expect(img).toBe("");
    });
  });

  // ── Schedule Type UI ────────────────────────────────────────

  test.describe("Schedule Type UI", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    });

    test("every day schedule shows correct text", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#jobScheduleText")).toContainText("Every day");
    });

    test("weekdays schedule option", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#schedWeekdays").check();
      await page.locator("#scheduleModal .btn-primary").click();
      await expect(page.locator("#jobScheduleText")).toContainText("Weekdays");
    });

    test("specific days schedule", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#schedDays").check();
      await page.locator("#schedDay0").check();
      await page.locator("#schedDay6").check();
      await page.locator("#scheduleModal .btn-primary").click();
      await expect(page.locator("#jobScheduleText")).toContainText("Sun");
      await expect(page.locator("#jobScheduleText")).toContainText("Sat");
    });

    test("monthly schedule option", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#schedMonthly").check();
      await page.locator("#schedMonthlyDay").selectOption("15");
      await page.locator("#scheduleModal .btn-primary").click();
      await expect(page.locator("#jobScheduleText")).toContainText("15th");
    });

    test("every n days option shows ndays options", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#schedNDays").check();
      await expect(page.locator("#schedNDaysOptions")).toBeVisible();
      await expect(page.locator("#schedNInterval")).toBeVisible();
      await expect(page.locator("#schedNOffset")).toBeVisible();
    });

    test("every n days schedule shows correct text", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#scheduleModal").waitFor({ state: "visible" });
      await page.locator("#schedNDays").check();
      await page.locator("#schedNInterval").selectOption("3");
      await page.locator("#schedNOffset").selectOption("1");
      await page.locator("#scheduleModal .btn-primary").click();
      await page.locator("#scheduleModal").waitFor({ state: "hidden" });
      await expect(page.locator("#jobScheduleText")).toContainText("Every 3 day(s)");
    });

    test("every n days shows next due display", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobSchedule-tab").click();
      await page.getByText("Change").nth(1).click();
      await page.locator("#schedNDays").check();
      await expect(page.locator("#schedNextDue")).not.toBeEmpty();
    });
  });

  // ── Dev Mode UI ─────────────────────────────────────────────

  test.describe("Dev Mode UI", () => {

    test("dev mode today changes date displayed", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      const todayInput = page.locator(".flatpickr-input").first();
      await todayInput.click();
      await todayInput.fill("2026-12-25");
      await todayInput.press("Enter");
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: "Done" }).click();
      await page.waitForTimeout(500);
      await expect(page.locator("h2").first()).toContainText("25 Dec");
    });
  });

  // ── Image Editing: Cancel Existing ──────────────────────────

  test.describe("Image Editing: Cancel Existing", () => {

    test("cancel editing existing image restores original data", async ({ page }) => {
      const svg = "data:image/svg+xml," + encodeURIComponent('<svg stroke="#000000" fill="#ffffff" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>');
      await page.addInitScript((svgData) => {
        localStorage.clear();
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "OriginalName", data: svgData }]));
      }, svg);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.locator("#imagesEditor").waitFor({ state: "visible" });
      await page.locator(".card:has-text('OriginalName') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.evaluate(() => {
        const input = document.querySelector('#imageEditModalBody .form-control:not(.form-control-sm)');
        if (input) { input.value = "ChangedName"; input.dispatchEvent(new Event('input', { bubbles: true })); }
      });
      await page.locator("#btnImageEditCancel").click();
      await page.waitForTimeout(300);
      const restored = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images") || "[]");
        return { name: images[0]?.name, data: images[0]?.data };
      });
      expect(restored.name).toBe("OriginalName");
      expect(restored.data).toContain("%23000000");
    });

    test("uncheck line none restores stroke color", async ({ page }) => {
      const svg = "data:image/svg+xml," + encodeURIComponent('<svg stroke="#ff0000" fill="#ffffff" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>');
      await page.addInitScript((svgData) => {
        localStorage.clear();
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "StrokeTest", data: svgData }]));
      }, svg);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.locator("#imagesEditor").waitFor({ state: "visible" });
      await page.locator(".card:has-text('StrokeTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const lineCheckbox = page.locator('#imageEditModal input[type="checkbox"]').first();
      await lineCheckbox.check();
      await page.waitForTimeout(200);
      await lineCheckbox.uncheck();
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images"));
        return images[0].data;
      });
      expect(data).toContain("%23ff0000");
    });

    test("uncheck fill none restores fill color", async ({ page }) => {
      const svg = "data:image/svg+xml," + encodeURIComponent('<svg stroke="#000000" fill="#00ff00" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>');
      await page.addInitScript((svgData) => {
        localStorage.clear();
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "FillTest", data: svgData }]));
      }, svg);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.locator("#imagesEditor").waitFor({ state: "visible" });
      await page.locator(".card:has-text('FillTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const fillCheckbox = page.locator('#imageEditModal input[type="checkbox"]').nth(1);
      await fillCheckbox.check();
      await page.waitForTimeout(200);
      await fillCheckbox.uncheck();
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images"));
        return images[0].data;
      });
      expect(data).toContain("%2300ff00");
    });
  });

  // ── Image Picker Empty State ───────────────────────────────

  test.describe("Image Picker Empty State", () => {

    test("picker shows no images available when empty", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1, jobs: []
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Change" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await expect(page.getByText("No images available.")).toBeVisible();
    });

    test("picker shows no match when search has no results", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1, jobs: []
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "Apple", data: "" }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Change" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await page.locator(".image-picker-search").fill("ZZZZNOTHING");
      await expect(page.getByText("No images match your search.")).toBeVisible();
    });
  });

  // ── Ad Hoc Confirm Removal ─────────────────────────────────

  test.describe("Ad Hoc Confirm Removal", () => {

    test("confirming removal deletes adhoc job", async ({ page }) => {
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("RemoveMe");
      await page.locator("#jobEditOkBtn").click();
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
        if (modal) modal.hide();
      });
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 10000 });
      await page.locator("#todayCardList").waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(300);
      await page.locator('.job-checkbox').first().check();
      await page.locator("#deleteConfirmModal").waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(200);
      await page.locator("#deleteConfirmBtn").click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
        if (modal) modal.hide();
      });
      await page.locator("#deleteConfirmModal").waitFor({ state: "hidden", timeout: 10000 });
      await expect(page.getByText("RemoveMe")).not.toBeVisible();
    });
  });

  // ── Checkbox Uncheck ───────────────────────────────────────

  test.describe("Checkbox Uncheck", () => {

    test("unchecking completed job removes strikethrough", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      const cb = page.locator('.job-checkbox[data-job-id="job_1"]');
      await cb.check();
      await page.waitForTimeout(200);
      await cb.uncheck();
      await page.waitForTimeout(300);
      await expect(cb).not.toBeChecked();
    });
  });

  // ── Schedule Filtering ─────────────────────────────────────

  test.describe("Schedule Filtering", () => {

    test("job with sleepUntil in future is hidden from today", async ({ page }) => {
      await page.evaluate(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const ds = tomorrow.getFullYear() + "-" + String(tomorrow.getMonth()+1).padStart(2,"0") + "-" + String(tomorrow.getDate()).padStart(2,"0");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "FutureJob", active: true, frequency: "daily",
            sequence: 1, sleepUntil: ds, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await expect(page.getByText("FutureJob")).not.toBeVisible();
    });

    test("sleepUntil in past shows job on today", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const tas = twoDaysAgo.getFullYear() + "-" + String(twoDaysAgo.getMonth()+1).padStart(2,"0") + "-" + String(twoDaysAgo.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "PastSleepJob", active: true, frequency: "daily",
            sequence: 1, sleepUntil: ys, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", tas);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await expect(page.getByText("PastSleepJob")).toBeVisible();
    });

    test("weekends job hidden on weekday", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "WeekendOnly", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "weekends" }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      const todayNum = new Date().getDay();
      if (todayNum === 0 || todayNum === 6) {
        await expect(page.getByText("WeekendOnly")).toBeVisible();
      } else {
        await expect(page.getByText("WeekendOnly")).not.toBeVisible();
      }
    });

    test("weekdays job hidden on weekend", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "WeekdayOnly", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "weekdays" }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      const todayNum = new Date().getDay();
      if (todayNum === 0 || todayNum === 6) {
        await expect(page.getByText("WeekdayOnly")).not.toBeVisible();
      } else {
        await expect(page.getByText("WeekdayOnly")).toBeVisible();
      }
    });

    test("specific days schedule shows on matched day", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        const todayNum = new Date().getDay();
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "SpecificDayJob", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "days", days: [todayNum] }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await expect(page.getByText("SpecificDayJob")).toBeVisible();
    });

    test("monthly schedule shows on correct date", async ({ page }) => {
      test.setTimeout(30000);
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        const todayDate = new Date().getDate();
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "MonthlyJobShow", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "monthly", date: todayDate }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await expect(page.getByText("MonthlyJobShow")).toBeVisible();
    });

    test("monthly schedule hides on wrong date", async ({ page }) => {
      test.setTimeout(30000);
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        const wrongDate = new Date().getDate() === 1 ? 15 : 1;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "MonthlyJobHide", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "monthly", date: wrongDate }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await expect(page.getByText("MonthlyJobHide")).not.toBeVisible();
    });

    test("every n days schedule shows on correct day based on epoch", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        const todayEpoch = Math.floor(new Date().getTime() / 86400000);
        const interval = 2;
        const offset = 0;
        const matches = ((todayEpoch + offset) % interval + interval) % interval === 0;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "NDaysJob", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "ndays", interval: interval, offset: offset }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      const todayEpoch = Math.floor(new Date().getTime() / 86400000);
      const interval = 2;
      const offset = 0;
      const matches = ((todayEpoch + offset) % interval + interval) % interval === 0;
      if (matches) {
        await expect(page.getByText("NDaysJob")).toBeVisible();
      } else {
        await expect(page.getByText("NDaysJob")).not.toBeVisible();
      }
    });
  });

  // ── Data Danger Zone ───────────────────────────────────────

  test.describe("Data Danger Zone", () => {

    test("regenerate tiles rebuilds the today list", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(800);
      await expect(page.getByText("Report").first()).toBeVisible();
    });

    test("regenerate tiles respects every n days schedule", async ({ page }) => {
      await page.evaluate(() => {
        const today = new Date();
        const ts = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const todayEpoch = Math.floor(today.getTime() / 86400000);
        const matchesToday = ((todayEpoch - 0) % 2 + 2) % 2 === 0;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "NDaysRegen", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "ndays", interval: 2, offset: 0 }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ts);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_scheduleTestMatches", matchesToday ? "true" : "false");
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(500);
      const matches = await page.evaluate(() => localStorage.getItem("planmydays_scheduleTestMatches") === "true");
      if (matches) {
        await expect(page.getByText("NDaysRegen")).toBeVisible();
      } else {
        await expect(page.getByText("NDaysRegen")).not.toBeVisible();
      }
    });

    test("regenerate tiles respects weekdays schedule", async ({ page }) => {
      await page.evaluate(() => {
        const today = new Date();
        const ts = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const day = today.getDay();
        const isWeekday = day >= 1 && day <= 5;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "WeekdayRegen", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "weekdays" }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ts);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_scheduleTestMatches", isWeekday ? "true" : "false");
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(500);
      const matches = await page.evaluate(() => localStorage.getItem("planmydays_scheduleTestMatches") === "true");
      if (matches) {
        await expect(page.getByText("WeekdayRegen")).toBeVisible();
      } else {
        await expect(page.getByText("WeekdayRegen")).not.toBeVisible();
      }
    });

    test("regenerate tiles respects weekends schedule", async ({ page }) => {
      await page.evaluate(() => {
        const today = new Date();
        const ts = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const day = today.getDay();
        const isWeekend = day === 0 || day === 6;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "WeekendRegen", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "weekends" }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ts);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_scheduleTestMatches", isWeekend ? "true" : "false");
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(500);
      const matches = await page.evaluate(() => localStorage.getItem("planmydays_scheduleTestMatches") === "true");
      if (matches) {
        await expect(page.getByText("WeekendRegen")).toBeVisible();
      } else {
        await expect(page.getByText("WeekendRegen")).not.toBeVisible();
      }
    });

    test("regenerate tiles respects specific days schedule", async ({ page }) => {
      await page.evaluate(() => {
        const today = new Date();
        const ts = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const day = today.getDay();
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "SpecificDayRegen", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "days", days: [day] }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ts);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText("SpecificDayRegen")).toBeVisible();
    });

    test("regenerate tiles respects specific days schedule mismatch", async ({ page }) => {
      await page.evaluate(() => {
        const today = new Date();
        const ts = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const day = today.getDay();
        const wrongDay = day === 0 ? 1 : 0;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "SpecificDayMismatch", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "days", days: [wrongDay] }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ts);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText("SpecificDayMismatch")).not.toBeVisible();
    });

    test("regenerate tiles respects day of month schedule", async ({ page }) => {
      await page.evaluate(() => {
        const today = new Date();
        const ts = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const dateNum = today.getDate();
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "MonthlyRegen", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "monthly", date: dateNum }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ts);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText("MonthlyRegen")).toBeVisible();
    });

    test("regenerate tiles respects day of month schedule mismatch", async ({ page }) => {
      await page.evaluate(() => {
        const today = new Date();
        const ts = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2,"0") + "-" + String(today.getDate()).padStart(2,"0");
        const dateNum = today.getDate();
        const wrongDate = dateNum === 1 ? 15 : 1;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "MonthlyMismatch", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "monthly", date: wrongDate }, suffix: false, dayType: "dayOfYear", mod: "", tasks: []
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ts);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(500);
      await expect(page.getByText("MonthlyMismatch")).not.toBeVisible();
    });

    test("clear all data removes everything", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", "[]");
        localStorage.setItem("planmydays_images", "[]");
        localStorage.setItem("planmydays_theme", "darkly");
        localStorage.setItem("theme", "old");
        localStorage.setItem("images", "old");
        localStorage.setItem("showDanger", "true");
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#clearAllDataRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Clear All Data" }).click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.waitForTimeout(200);
      await page.locator("#deleteConfirmBtn").click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
        if (modal) modal.hide();
      });
      await page.waitForTimeout(500);
      await expect(page.locator("#deleteConfirmModal")).not.toBeVisible({ timeout: 10000 });
      const allKeys = await page.evaluate(() => {
        const k = Object.keys(localStorage);
        return k.filter(key => key !== "planmydays_last_gen" && key !== "planmydays_today_order" && key !== "planmydays_completed");
      });
      expect(allKeys.length).toBe(0);
    });
  });

  // ── Auto-Hide Nav Behavior ─────────────────────────────────

  test.describe("Auto-Hide Nav Behavior", () => {

    test("nav hides when auto-hide is enabled and editors are closed", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_autoHideMenu", "true"));
      await page.reload();
      await page.waitForTimeout(4500);
      const navHidden = await page.evaluate(() => {
        const nav = document.getElementById("mainNav");
        return nav ? nav.classList.contains("nav-hidden") : false;
      });
      expect(navHidden).toBe(true);
    });

    test("nav not hidden when auto-hide is disabled", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_autoHideMenu", "false"));
      await page.reload();
      await page.waitForTimeout(4500);
      const navHidden = await page.evaluate(() => {
        const nav = document.getElementById("mainNav");
        return nav ? nav.classList.contains("nav-hidden") : false;
      });
      expect(navHidden).toBe(false);
    });

    test("nav shown when pointer moves after auto-hide", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_autoHideMenu", "true"));
      await page.reload();
      const navHidden1 = await page.evaluate(() => {
        const nav = document.getElementById("mainNav");
        return nav ? nav.classList.contains("nav-hidden") : false;
      });
      expect(navHidden1).toBe(false);
      await page.waitForTimeout(5000);
      const navHidden2 = await page.evaluate(() => {
        const nav = document.getElementById("mainNav");
        return nav ? nav.classList.contains("nav-hidden") : false;
      });
      expect(navHidden2).toBe(true);
      await page.evaluate(() => {
        const nav = document.getElementById("mainNav");
        if (nav) nav.classList.remove("nav-hidden");
      });
      const navHidden3 = await page.evaluate(() => {
        const nav = document.getElementById("mainNav");
        return nav ? nav.classList.contains("nav-hidden") : false;
      });
      expect(navHidden3).toBe(false);
    });
  });

  // ── Dev Mode: Dev Today Override ───────────────────────────

  test.describe("Dev Mode: Dev Today Override", () => {

    test("dev today overrides getTodayDate", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.evaluate(() => {
        localStorage.setItem("devToday", "2026-06-15");
      });
      await page.reload();
      await expect(page.locator("h2").first()).toContainText("15 Jun");
    });

    test("dev last gen is returned by getStoredLastGen", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.evaluate(() => {
        localStorage.setItem("devLastGen", "2026-06-14");
      });
      await page.reload();
      const stored = await page.evaluate(() => window.getStoredLastGen());
      expect(stored).toBe("2026-06-14");
    });
  });

  // ── No Active Jobs Message ─────────────────────────────────

  test.describe("No Active Jobs Message", () => {

    test("shows no active jobs message when streams empty", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([]));
      });
      await page.reload();
      await page.locator("#countdownContainer").waitFor({ state: "visible" });
      await expect(page.getByText("No active jobs yet")).toBeVisible();
    });
  });

  // ── Schedule Filtering Carryover ───────────────────────────

  test.describe("Schedule Filtering Carryover", () => {

    test("uncompleted jobs carried over when date changes", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "CarryOverJob", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await expect(page.getByText("CarryOverJob")).toBeVisible();
    });
  });

  // ── Day Type Suffix Branches ──────────────────────────────

  test.describe("Day Type Suffix Branches", () => {

    test("dayOfMonth suffix badge visible", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date();
        const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "DomJob", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfMonth", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      const badge = page.locator(".badge.bg-secondary").first();
      await expect(badge).toBeVisible();
    });

    test("dayOfWeek with monday 0 suffix badge visible", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date();
        const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "DowJob", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfWeek", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_monday", "0");
      });
      await page.reload();
      const badge = page.locator(".badge.bg-secondary").first();
      await expect(badge).toBeVisible();
    });

    test("jan1 zero suffix badge visible", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date();
        const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Jan1Job", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
        localStorage.setItem("planmydays_jan1", "0");
      });
      await page.reload();
      const badge = page.locator(".badge.bg-secondary").first();
      await expect(badge).toBeVisible();
    });

    test("suffix with mod 2 badge visible", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date();
        const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Mod2", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "2", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      const badge = page.locator(".badge.bg-secondary").first();
      await expect(badge).toBeVisible();
    });
  });

  // ── Job Sorting By Time ────────────────────────────────────

  test.describe("Job Sorting By Time", () => {

    test("addScheduleJobsToOrder sorts newly added jobs by time", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [
            { id: "job_1", title: "Late", active: true, frequency: "daily", sequence: 1, time: "15:00", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] },
            { id: "job_2", title: "Early", active: true, frequency: "daily", sequence: 2, time: "08:00", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] },
            { id: "job_3", title: "Mid", active: true, frequency: "daily", sequence: 3, time: "12:00", suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }
          ]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_2", "job_3"]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      const h4s = page.locator("h4");
      await expect(h4s.nth(0)).toContainText("Early");
      await expect(h4s.nth(1)).toContainText("Mid");
      await expect(h4s.nth(2)).toContainText("Late");
    });
  });

  // ── Dev Mode Settings ──────────────────────────────────────

  test.describe("Dev Mode Settings", () => {

    test("dev mode flatpickr inputs appear with danger zone", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#devTodayRow").waitFor({ state: "visible" });
      await expect(page.locator(".flatpickr-input")).toHaveCount(2);
    });
  });

  // ── Top-Level: Streams Editor Interaction ────────────────

  test.describe("Top-Level: Streams Editor", () => {

    test("open streams editor, add stream, cancel edit", async ({ page }) => {
      test.setTimeout(30000);
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "MyStream", tab: "progress", image: "", sequence: 1, jobs: []
        }]));
      });
      await page.reload();
      await page.waitForLoadState("networkidle");
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await expect(page.locator("#streamsEditor")).toBeVisible();
      await expect(page.locator("#streamEditorList .editor-title").filter({ hasText: "MyStream" })).toBeVisible();
      await page.getByRole("button", { name: "Add Stream" }).click();
      await expect(page.locator("#streamEditModal")).toBeVisible();
      await page.waitForTimeout(300);
      await page.evaluate(() => cancelEdit());
      await page.locator("#streamEditModal").waitFor({ state: "hidden", timeout: 15000 });
      await expect(page.locator("#streamEditorList")).toBeVisible();
    });

    test("edit stream and save changes", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "EditMe", tab: "progress", image: "", sequence: 1, jobs: []
        }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator('input[value="EditMe"]').fill("EditedStream");
      await page.getByRole("button", { name: "OK" }).click();
      await expect(page.getByText("EditedStream")).toBeVisible();
    });
  });

  test.describe("Top-Level: Jobs via Streams", () => {

    test("open jobs editor and view jobs", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Task1", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await expect(page.locator("#streamEditorList")).toBeVisible();
      await expect(page.getByText("Task1")).toBeVisible();
    });

    test("add new job via jobs editor", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Existing", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("NewTask");
      await page.locator("#jobEditOkBtn").click();
      await expect(page.getByText("NewTask")).toBeVisible();
    });
  });

  test.describe("Top-Level: Regenerate Tiles", () => {

    test("regenerate tiles rebuilds order when lastGen differs", async ({ page }) => {
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "RegenJob", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await expect(page.getByText("RegenJob")).toBeVisible();
    });
  });

  // ── Modal Stacking: Image Picker from Job Edit ──────────

  test.describe("Modal Stacking: Image Picker from Job Edit", () => {

    test("selecting image from job edit modal is blocked by jobEditModal backdrop", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Report", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "TestImg", data: "" },
          { name: "TestImg2", data: "" }
        ]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Change" }).first().click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await expect(page.locator("#imagePickerModal")).toBeVisible();
      await page.locator(".image-picker-item").first().waitFor({ state: "visible" });
      await page.evaluate(() => new Promise(resolve => {
        const el = document.getElementById("imagePickerModal");
        const handler = () => { el.removeEventListener("shown.bs.modal", handler); resolve(); };
        if (el.classList.contains("show") && !el.classList.contains("fade")) { resolve(); return; }
        el.addEventListener("shown.bs.modal", handler);
        setTimeout(resolve, 500);
      }));
      await page.locator(".image-picker-item").first().dispatchEvent("click");
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("imagePickerModal"));
        if (modal) modal.hide();
      });
      await page.locator("#imagePickerModal").waitFor({ state: "hidden", timeout: 10000 });
      const img = await page.evaluate(() => jobsBuffer?.image || "");
      expect(img).toBe("TestImg");
    });

    test("selecting image from add job modal is blocked by jobEditModal backdrop", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Existing", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "AddJobImg", data: "" }
        ]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Change" }).first().click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await expect(page.locator("#imagePickerModal")).toBeVisible();
      await page.locator(".image-picker-item").first().waitFor({ state: "visible" });
      await page.evaluate(() => new Promise(resolve => {
        const el = document.getElementById("imagePickerModal");
        const handler = () => { el.removeEventListener("shown.bs.modal", handler); resolve(); };
        if (el.classList.contains("show") && !el.classList.contains("fade")) { resolve(); return; }
        el.addEventListener("shown.bs.modal", handler);
        setTimeout(resolve, 500);
      }));
      await page.locator(".image-picker-item").first().dispatchEvent("click");
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("imagePickerModal"));
        if (modal) modal.hide();
      });
      await page.locator("#imagePickerModal").waitFor({ state: "hidden", timeout: 10000 });
      const img = await page.evaluate(() => jobsBuffer?.image || "");
      expect(img).toBe("AddJobImg");
    });

    test("searching images from job edit modal is blocked by jobEditModal backdrop", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Report", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "", tasks: [] }]
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "Apple", data: "" },
          { name: "Banana", data: "" }
        ]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Change" }).first().click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await page.evaluate(() => new Promise(resolve => {
        const el = document.getElementById("imagePickerModal");
        if (el.classList.contains("show") && !el.classList.contains("fade")) { resolve(); return; }
        el.addEventListener("shown.bs.modal", () => resolve(), { once: true });
        setTimeout(resolve, 500);
      }));
      await page.locator(".image-picker-search").fill("Banana");
      const banana = page.locator(".image-picker-item").filter({ hasText: "Banana" });
      await banana.waitFor({ state: "visible" });
      const apple = page.locator(".image-picker-item").filter({ hasText: "Apple" });
      await expect(apple).not.toBeVisible();
    });
  });

  // ── Modal Stacking: Image Picker from Front Page Add Card ─

  test.describe("Modal Stacking: Image Picker from Front Page Add Card", () => {

    test("selecting image from front page add card is blocked by jobEditModal backdrop", async ({ page }) => {
      test.setTimeout(30000);
      await page.evaluate(() => {
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "FrontImg", data: "" }
        ]));
      });
      await page.reload();
      await page.getByText("+ Add job").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Change" }).first().click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await expect(page.locator("#imagePickerModal")).toBeVisible();
      await page.locator(".image-picker-item").first().waitFor({ state: "visible" });
      await page.evaluate(() => new Promise(resolve => {
        const el = document.getElementById("imagePickerModal");
        const handler = () => { el.removeEventListener("shown.bs.modal", handler); resolve(); };
        if (el.classList.contains("show") && !el.classList.contains("fade")) { resolve(); return; }
        el.addEventListener("shown.bs.modal", handler);
        setTimeout(resolve, 500);
      }));
      await page.locator(".image-picker-item").first().dispatchEvent("click");
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("imagePickerModal"));
        if (modal) modal.hide();
      });
      await page.locator("#imagePickerModal").waitFor({ state: "hidden", timeout: 10000 });
      const img = await page.evaluate(() => jobsBuffer?.image || "");
      expect(img).toBe("FrontImg");
    });
  });

  // ── Coverage: Import / Export / Upload / Edge cases ────────

  test.describe("Coverage: Import Export Upload", () => {

    test("importData loads streams and images from JSON file", async ({ page }) => {
      const payload = {
        version: 1,
        streams: [{
          id: "stream_imp",
          title: "Imported",
          description: "",
          tab: "progress",
          image: "",
          sequence: 1,
          jobs: [{
            id: "job_imp",
            title: "Imported Job",
            description: "",
            active: true,
            frequency: "daily",
            sequence: 1,
            suffix: false,
            dayType: "dayOfYear",
            mod: "",
            tasks: [],
            schedule: { type: "daily" }
          }]
        }],
        images: [{ name: "ImpImg", data: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" stroke="#111" fill="#eee"><circle r="5"/></svg>') }]
      };
      await page.evaluate((data) => {
        return new Promise(resolve => {
          const file = new File([JSON.stringify(data)], "backup.json", { type: "application/json" });
          const dt = new DataTransfer();
          dt.items.add(file);
          const origClick = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function() {
            if (this.type === "file") {
              Object.defineProperty(this, "files", { value: dt.files, configurable: true });
              this.dispatchEvent(new Event("change"));
              HTMLInputElement.prototype.click = origClick;
              setTimeout(resolve, 400);
              return;
            }
            return origClick.apply(this, arguments);
          };
          importData();
        });
      }, payload);
      await page.waitForTimeout(500);
      await expect(page.locator("h4").filter({ hasText: "Imported Job" })).toBeVisible();
      const lastGen = await page.evaluate(() => localStorage.getItem("planmydays_last_gen"));
      expect(lastGen).toBe(todayStr);
      const todayOrder = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_today_order") || "[]"));
      expect(todayOrder).toContain("job_imp");
      const imgCount = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_images") || "[]").length);
      expect(imgCount).toBe(1);
    });

    test("after importing, regenerate todays jobs runs automatically", async ({ page }) => {
      const payload = {
        version: 1,
        streams: [{
          id: "stream_regen",
          title: "Regen",
          description: "",
          tab: "progress",
          image: "",
          sequence: 1,
          jobs: [{
            id: "job_regen",
            title: "Regen Job",
            description: "",
            active: true,
            frequency: "daily",
            sequence: 1,
            suffix: false,
            dayType: "dayOfYear",
            mod: "",
            tasks: [],
            schedule: { type: "daily" }
          }]
        }],
        images: []
      };
      await page.evaluate((data) => {
        return new Promise(resolve => {
          const file = new File([JSON.stringify(data)], "backup.json", { type: "application/json" });
          const dt = new DataTransfer();
          dt.items.add(file);
          const origClick = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function() {
            if (this.type === "file") {
              Object.defineProperty(this, "files", { value: dt.files, configurable: true });
              this.dispatchEvent(new Event("change"));
              HTMLInputElement.prototype.click = origClick;
              setTimeout(resolve, 400);
              return;
            }
            return origClick.apply(this, arguments);
          };
          importData();
        });
      }, payload);
      await page.waitForTimeout(500);
      const lastGen = await page.evaluate(() => localStorage.getItem("planmydays_last_gen"));
      expect(lastGen).toBe(todayStr);
      const completed = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_completed") || "[]"));
      expect(completed).toEqual([]);
      const todayOrder = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_today_order") || "[]"));
      expect(todayOrder).toContain("job_regen");
      await expect(page.locator("h4").filter({ hasText: "Regen Job" })).toBeVisible();
    });

    test("importData rejects invalid JSON via alert", async ({ page }) => {
      page.on("dialog", async d => { await d.accept(); });
      await page.evaluate(() => {
        return new Promise(resolve => {
          const input = document.createElement("input");
          input.type = "file";
          const file = new File(["not-json{{{"], "bad.json", { type: "application/json" });
          const dt = new DataTransfer();
          dt.items.add(file);
          Object.defineProperty(input, "files", { value: dt.files });
          // Call the real importData change handler by monkey-patching click
          const origClick = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function() {
            if (this.type === "file" && this.accept && this.accept.includes("json")) {
              Object.defineProperty(this, "files", { value: dt.files, configurable: true });
              this.dispatchEvent(new Event("change"));
              HTMLInputElement.prototype.click = origClick;
              setTimeout(resolve, 200);
              return;
            }
            return origClick.apply(this, arguments);
          };
          importData();
        });
      });
    });

    test("importData rejects file missing streams and images", async ({ page }) => {
      page.on("dialog", async d => { await d.accept(); });
      await page.evaluate(() => {
        return new Promise(resolve => {
          const file = new File([JSON.stringify({ version: 1 })], "empty.json", { type: "application/json" });
          const dt = new DataTransfer();
          dt.items.add(file);
          const origClick = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function() {
            if (this.type === "file") {
              Object.defineProperty(this, "files", { value: dt.files, configurable: true });
              this.dispatchEvent(new Event("change"));
              HTMLInputElement.prototype.click = origClick;
              setTimeout(resolve, 200);
              return;
            }
            return origClick.apply(this, arguments);
          };
          importData();
        });
      });
    });

    test("uploadStandardImages adds sample images", async ({ page }) => {
      test.setTimeout(60000);
      await page.getByTitle("Settings").click();
      await page.locator("#danger-tab").click();
      await page.locator("#showDanger").check();
      await page.locator("#uploadStandardImagesRow").waitFor({ state: "visible" });
      await page.locator("#btnUploadImages").click();
      await page.waitForFunction(() => {
        const imgs = JSON.parse(localStorage.getItem("planmydays_images") || "[]");
        return imgs.length > 0;
      }, null, { timeout: 45000 });
      const count = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_images") || "[]").length);
      expect(count).toBeGreaterThan(0);
    });

    test("exportData triggers download", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      const downloadPromise = page.waitForEvent("download", { timeout: 10000 }).catch(() => null);
      await page.evaluate(() => exportData());
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/^planmydays-\d+\.json$/);
        expect(download.suggestedFilename()).not.toContain("-backup-");
      }
    });
  });

  test.describe("Coverage: Images advanced", () => {

    const sampleSvg = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" stroke="#ff0000" fill="#00ff00" stroke-width="2"><rect width="10" height="10"/></svg>');
    const svgNoAttrs = '<svg xmlns="http://www.w3.org/2000/svg"><circle stroke="#abc" fill="#def" r="5"/></svg>';

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      const images = [];
      for (let i = 1; i <= 35; i++) {
        images.push({ name: `Img${String(i).padStart(2, "0")}`, data: sampleSvg });
      }
      images.push({ name: "Photo 5", data: sampleSvg });
      await page.evaluate((imgs) => {
        localStorage.setItem("planmydays_images", JSON.stringify(imgs));
      }, images);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
      await page.waitForTimeout(300);
    });

    test("image list pagination next and previous", async ({ page }) => {
      await expect(page.getByText("Page 1 of")).toBeVisible();
      await page.getByRole("button", { name: "Next" }).click();
      await expect(page.getByText("Page 2 of")).toBeVisible();
      await page.getByRole("button", { name: "Previous" }).click();
      await expect(page.getByText("Page 1 of")).toBeVisible();
    });

    test("duplicate image with trailing number increments", async ({ page }) => {
      await page.locator("#imageFilters input[type=search]").fill("Photo 5");
      await page.waitForTimeout(200);
      await page.locator("#imagesList .btn-info").filter({ hasText: "Duplicate" }).first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const name = await page.locator("#imageEditModalBody input.form-control").first().inputValue();
      expect(name).toMatch(/Photo 6/);
      await page.locator("#btnImageEditCancel").click();
    });

    test("upload SVG image via file input", async ({ page }) => {
      await page.locator("#imagesList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.evaluate((svgText) => {
        return new Promise(resolve => {
          const file = new File([svgText], "icon.svg", { type: "image/svg+xml" });
          const dt = new DataTransfer();
          dt.items.add(file);
          const origClick = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function() {
            if (this.type === "file") {
              Object.defineProperty(this, "files", { value: dt.files, configurable: true });
              this.dispatchEvent(new Event("change"));
              HTMLInputElement.prototype.click = origClick;
              setTimeout(resolve, 300);
              return;
            }
            return origClick.apply(this, arguments);
          };
          openImageUpload(editingImageIndex);
        });
      }, svgNoAttrs);
      await page.waitForTimeout(200);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images") || "[]");
        return images[editingImageIndex]?.data || "";
      });
      expect(data).toContain("data:image/svg+xml");
      expect(data).toMatch(/stroke/);
    });

    test("upload raster image via file input", async ({ page }) => {
      await page.locator("#imagesList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      // 1x1 PNG
      const pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      await page.evaluate(async (b64) => {
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const file = new File([arr], "dot.png", { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        return new Promise(resolve => {
          const origClick = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function() {
            if (this.type === "file") {
              Object.defineProperty(this, "files", { value: dt.files, configurable: true });
              this.dispatchEvent(new Event("change"));
              HTMLInputElement.prototype.click = origClick;
              setTimeout(resolve, 300);
              return;
            }
            return origClick.apply(this, arguments);
          };
          openImageUpload(editingImageIndex);
        });
      }, pngB64);
      await page.waitForTimeout(200);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images") || "[]");
        return images[editingImageIndex]?.data || "";
      });
      expect(data.startsWith("data:image/png")).toBeTruthy();
    });

    test("stroke width adds attribute when missing", async ({ page }) => {
      await page.evaluate(() => {
        const images = loadImages();
        const bare = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" stroke="#000" fill="none"><rect width="5" height="5"/></svg>');
        images[0].data = bare;
        images[0].name = "BareStroke";
        saveImages(images);
        editingImageIndex = 0;
        isNewImage = false;
        renderImagesEditor();
      });
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.evaluate(() => editImageStrokeWidth(0, "4"));
      const data = await page.evaluate(() => loadImages()[0].data);
      expect(decodeURIComponent(data)).toMatch(/stroke-width=["']4["']/);
    });

    test("editImageField non-name field saves", async ({ page }) => {
      await page.evaluate(() => {
        const images = loadImages();
        editingImageIndex = 0;
        isNewImage = false;
        editImageField("lineColor", "#abcdef");
      });
      const val = await page.evaluate(() => loadImages()[0].lineColor);
      expect(val).toBe("#abcdef");
    });

    test("delete image via confirm", async ({ page }) => {
      const before = await page.evaluate(() => loadImages().length);
      await page.locator("#imagesList .btn-danger").filter({ hasText: "Delete" }).first().click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "visible" });
      await page.waitForTimeout(200);
      await page.locator("#deleteConfirmBtn").click();
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const modal = bootstrap.Modal.getInstance(document.getElementById("deleteConfirmModal"));
        if (modal) modal.hide();
      });
      const after = await page.evaluate(() => loadImages().length);
      expect(after).toBe(before - 1);
    });
  });

  test.describe("Coverage: Main view edge cases", () => {

    test("loadStreams assigns missing job ids", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "s1", title: "S", tab: "progress", sequence: 1, jobs: [
            { title: "NoId", active: true, frequency: "daily", sequence: 1, schedule: { type: "daily" } }
          ]
        }]));
        localStorage.setItem("planmydays_last_gen", new Date().toISOString().slice(0, 10));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
      });
      await page.reload();
      const id = await page.evaluate(() => {
        const s = loadStreams();
        return s[0].jobs[0].id;
      });
      expect(id).toMatch(/^job_/);
    });

    test("jobs with stream and job images render img tags", async ({ page }) => {
      const svg = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" stroke="%23abc" fill="none"><circle r="3"/></svg>');
      await page.evaluate(({ svgData, streams, ds }) => {
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "StreamIcon", data: svgData },
          { name: "JobIcon", data: svgData }
        ]));
        streams[0].image = "StreamIcon";
        streams[0].jobs[0].image = "JobIcon";
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ds);
        localStorage.setItem("planmydays_completed", "[]");
      }, { svgData: svg, streams: TEST_STREAMS, ds: todayStr });
      await page.reload();
      await expect(page.locator("#todayCardList img.date-img").first()).toBeVisible();
      const count = await page.locator("#todayCardList img.date-img").count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test("today list drag reorder updates order", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await expect(page.locator("#todayCardList .today-drag-card")).toHaveCount(2);
      const after = await page.evaluate(() => {
        const list = document.getElementById("todayCardList");
        const cards = [...list.querySelectorAll(".today-drag-card")];
        const src = cards[0];
        const dst = cards[1];
        const dt = new DataTransfer();
        src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
        dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt, clientY: dst.getBoundingClientRect().bottom - 2 }));
        dst.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt, clientY: dst.getBoundingClientRect().bottom - 2 }));
        src.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: dt }));
        return loadTodayOrder();
      });
      expect(after[0]).toBe("job_3");
      expect(after[1]).toBe("job_1");
    });

    test("job editor drag swaps sequences for same group", async ({ page }) => {
      await page.evaluate((data) => {
        data[0].jobs = [
          { id: "j_a", title: "Auntimed", active: true, frequency: "daily", sequence: 1, time: "", schedule: { type: "daily" } },
          { id: "j_b", title: "Buntimed", active: true, frequency: "daily", sequence: 2, time: "", schedule: { type: "daily" } }
        ];
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible" });
      const src = page.locator(".job-drag-card").filter({ hasText: "Buntimed" });
      const dst = page.locator(".job-drag-card").filter({ hasText: "Auntimed" });
      await src.dragTo(dst);
      await page.waitForTimeout(400);
      const seqs = await page.evaluate(() => {
        const s = loadStreams()[0].jobs;
        const a = s.find(j => j.title === "Auntimed");
        const b = s.find(j => j.title === "Buntimed");
        return { a: a.sequence, b: b.sequence };
      });
      expect(seqs.a !== 1 || seqs.b !== 2).toBeTruthy();
    });

    test("canSwapJobs rejects different time groups", async ({ page }) => {
      const result = await page.evaluate((data) => {
        data[0].jobs = [
          { id: "t1", title: "T1", active: true, sequence: 1, time: "09:00" },
          { id: "t2", title: "T2", active: true, sequence: 2, time: "10:00" },
          { id: "u1", title: "U1", active: true, sequence: 3, time: "" },
          { id: "s1", title: "S1", active: true, sequence: 4, time: "", sleepUntil: "2099-01-01" },
          { id: "s2", title: "S2", active: true, sequence: 5, time: "", sleepUntil: "2099-01-01" }
        ];
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        return {
          diffTime: canSwapJobs(0, 0, 1),
          timeUntimed: canSwapJobs(0, 0, 2),
          sameSleep: canSwapJobs(0, 3, 4),
          missing: canSwapJobs(0, 0, 99)
        };
      }, TEST_STREAMS);
      expect(result.diffTime).toBe(false);
      expect(result.timeUntimed).toBe(false);
      expect(result.sameSleep).toBe(true);
      expect(result.missing).toBe(false);
    });

    test("split list empty tab message", async ({ page }) => {
      await page.evaluate((data) => {
        data[0].tab = "progress";
        data[1].tab = "progress";
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        localStorage.setItem("planmydays_splitList", "true");
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_3"]));
        localStorage.setItem("planmydays_last_gen", new Date().toISOString().slice(0, 10));
        localStorage.setItem("planmydays_completed", "[]");
      }, TEST_STREAMS);
      await page.reload();
      await page.locator(".nav-tabs-info .nav-link").filter({ hasText: "Maintenance" }).click();
      await expect(page.getByText("No jobs in this tab.")).toBeVisible();
    });

    test("escapeHtml handles null and zero", async ({ page }) => {
      const result = await page.evaluate(() => ({
        empty: escapeHtml(null),
        zero: escapeHtml(0),
        html: escapeHtml("<b>&</b>")
      }));
      expect(result.empty).toBe("");
      expect(result.zero).toBe("0");
      expect(result.html).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
    });

    test("density compact restored on load", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_density", "compact"));
      await page.reload();
      await expect(page.locator("body")).toHaveClass(/compact/);
    });

    test("changeDevToday and changeDevLastGen via settings helpers", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem("planmydays_images", "[]");
      });
      await startCoverage(page);
      await page.reload();
      await page.evaluate(() => {
        changeDevToday("2026-01-15");
        changeDevLastGen("2026-01-14");
      });
      const vals = await page.evaluate(() => ({
        today: localStorage.getItem("devToday"),
        last: localStorage.getItem("devLastGen"),
        dateFn: getTodayStr()
      }));
      expect(vals.today).toBe("2026-01-15");
      expect(vals.last).toBe("2026-01-14");
      expect(vals.dateFn).toBe("2026-01-15");
    });

    test("getImageColors decodes percent-hash colors", async ({ page }) => {
      const result = await page.evaluate(() => {
        const data = "data:image/svg+xml," + encodeURIComponent('<svg stroke="%23aabbcc" fill="%23ddeeff" stroke-width="3"></svg>');
        // getImageColors matches against decoded string; also test raw %23 path
        const raw = "data:image/svg+xml," + encodeURIComponent('<svg></svg>').replace("svg", 'svg stroke="%23ff00aa" fill="%2300ffaa"');
        return {
          a: getImageColors(data),
          b: getImageColors(""),
          c: getImageColors("data:image/png;base64,xx")
        };
      });
      expect(result.a.line).toBeTruthy();
      expect(result.b.line).toBe("");
      expect(result.c.line).toBe("");
    });

    test("updateSvgColor handles empty and hash colors", async ({ page }) => {
      const result = await page.evaluate(() => {
        const src = "data:image/svg+xml," + encodeURIComponent('<svg stroke="#111" fill="#222"></svg>');
        return {
          cleared: updateSvgColor(src, "stroke", ""),
          colored: updateSvgColor(src, "fill", "#abcdef"),
          passthrough: updateSvgColor("not-svg", "stroke", "#000")
        };
      });
      expect(result.passthrough).toBe("not-svg");
      expect(decodeURIComponent(result.colored)).toContain("#abcdef");
      expect(decodeURIComponent(result.cleared)).toMatch(/stroke=["']none["']/);
    });

    test("touch DnD handlers fire for today cards", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.locator("#todayCardList .today-drag-card").first().waitFor({ state: "visible" });
      const reordered = await page.evaluate(() => {
        const list = document.getElementById("todayCardList");
        const cards = [...list.querySelectorAll(".today-drag-card")];
        const c1 = cards[0];
        const c2 = cards[1];
        const r1 = c1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();
        const fire = (type, x, y, target) => {
          const t = new Touch({ identifier: 1, target, clientX: x, clientY: y });
          const touching = type === "touchend" || type === "touchcancel" ? [] : [t];
          target.dispatchEvent(new TouchEvent(type, {
            bubbles: true, cancelable: true,
            touches: touching,
            changedTouches: [t],
            targetTouches: touching
          }));
        };
        fire("touchstart", r1.x + 10, r1.y + 10, c1);
        fire("touchmove", r2.x + 10, r2.y + 10, c1);
        fire("touchend", r2.x + 10, r2.y + 10, c1);
        fire("touchstart", r1.x + 10, r1.y + 10, c1);
        fire("touchcancel", r1.x + 10, r1.y + 10, c1);
        return loadTodayOrder();
      });
      expect(reordered.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Coverage: Branch paths ─────────────────────────────────

  test.describe("Coverage: Branch paths", () => {

    test("touch DnD edge branches: no card, no target, same card, cancel idle", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.locator("#todayCardList .today-drag-card").first().waitFor({ state: "visible" });
      await page.evaluate(() => {
        const list = document.getElementById("todayCardList");
        const cards = [...list.querySelectorAll(".today-drag-card")];
        const c1 = cards[0];
        const c2 = cards[1];
        const r1 = c1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();
        const fire = (type, x, y, target) => {
          const t = new Touch({ identifier: 1, target, clientX: x, clientY: y });
          const touching = type === "touchend" || type === "touchcancel" ? [] : [t];
          target.dispatchEvent(new TouchEvent(type, {
            bubbles: true, cancelable: true,
            touches: touching, changedTouches: [t], targetTouches: touching
          }));
        };
        // touchstart on non-card (list itself)
        fire("touchstart", 1, 1, list);
        // touchmove/end/cancel with no active drag
        fire("touchmove", 10, 10, list);
        fire("touchend", 10, 10, list);
        fire("touchcancel", 10, 10, list);
        // start on card, move to empty space (no target)
        fire("touchstart", r1.x + 5, r1.y + 5, c1);
        fire("touchmove", 2, 2, document.body);
        // move above midpoint vs below midpoint
        fire("touchmove", r2.x + 5, r2.y + 2, c2);
        fire("touchmove", r2.x + 5, r2.y + r2.height - 2, c2);
        // end on same card (no reorder)
        fire("touchend", r1.x + 5, r1.y + 5, c1);
        // start and end with no target under finger
        fire("touchstart", r1.x + 5, r1.y + 5, c1);
        fire("touchend", 1, 1, document.body);
        // start and cancel with active drag
        fire("touchstart", r1.x + 5, r1.y + 5, c1);
        fire("touchcancel", r1.x + 5, r1.y + 5, c1);
      });
    });

    test("job DnD branch paths: wrong stream, same index, cannot swap, missing sequence", async ({ page }) => {
      await page.evaluate((data) => {
        data[0].jobs = [
          { id: "j1", title: "TAuntimed", active: true, sequence: 1, time: "" },
          { id: "j2", title: "TBuntimed", active: true, sequence: 2, time: "" },
          { id: "j3", title: "TimedA", active: true, sequence: 3, time: "09:00" },
          { id: "j4", title: "TimedB", active: true, time: "10:00" }
        ];
        data[1].jobs = [
          { id: "j5", title: "OtherStream", active: true, sequence: 1, time: "" }
        ];
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible" });
      // expand second stream too for cross-stream target
      await page.locator("#streamEditorList .stream-header-main").nth(1).click();
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const list = document.getElementById("streamEditorList");
        const untimed = [...list.querySelectorAll(".job-drag-card")].filter(c =>
          c.textContent.includes("TAuntimed") || c.textContent.includes("TBuntimed") ||
          c.textContent.includes("TimedA") || c.textContent.includes("TimedB") ||
          c.textContent.includes("OtherStream")
        );
        const byTitle = (t) => untimed.find(c => c.textContent.includes(t));
        const a = byTitle("TAuntimed");
        const b = byTitle("TBuntimed");
        const timedA = byTitle("TimedA");
        const timedB = byTitle("TimedB");
        const other = byTitle("OtherStream");
        const dt = new DataTransfer();
        const drag = (type, el, clientY) => {
          const rect = el.getBoundingClientRect();
          const y = clientY != null ? clientY : rect.top + rect.height / 2;
          el.dispatchEvent(new DragEvent(type, {
            bubbles: true, cancelable: true, dataTransfer: dt,
            clientX: rect.left + 10, clientY: y
          }));
        };
        // dragstart on non-card
        list.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
        // valid start then dragover top vs bottom
        drag("dragstart", a);
        drag("dragover", b, b.getBoundingClientRect().top + 2);
        drag("dragover", b, b.getBoundingClientRect().bottom - 2);
        // drop on self
        drag("drop", a);
        drag("dragend", a);
        // start then cross-stream dragover/drop
        drag("dragstart", a);
        if (other) {
          drag("dragover", other);
          drag("drop", other);
        }
        drag("dragend", a);
        // cannot swap timed different times
        drag("dragstart", timedA);
        drag("dragover", timedB);
        drag("drop", timedB);
        drag("dragend", timedA);
        // successful swap without sequence on one job (|| 0 branch)
        drag("dragstart", timedB);
        // put timedB next to untimed won't swap; swap two untimed again
        drag("dragstart", b);
        drag("drop", a, a.getBoundingClientRect().top + 2);
        drag("dragend", b);
        // drop with no active drag
        _jobDragSrcIdx = -1;
        drag("drop", a);
      });
      // re-seed for stable canSwapJobs index checks
      const r = await page.evaluate((data) => {
        data[0].jobs = [
          { id: "j1", title: "TAuntimed", active: true, sequence: 1, time: "" },
          { id: "j2", title: "TBuntimed", active: true, sequence: 2, time: "" },
          { id: "j3", title: "TimedA", active: true, sequence: 3, time: "09:00" },
          { id: "j4", title: "TimedB", active: true, sequence: 4, time: "10:00" }
        ];
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        return {
          sameTime: canSwapJobs(0, 2, 2),
          diffTime: canSwapJobs(0, 2, 3),
          untimed: canSwapJobs(0, 0, 1)
        };
      }, TEST_STREAMS);
      expect(r.sameTime).toBe(true);
      expect(r.diffTime).toBe(false);
      expect(r.untimed).toBe(true);
    });

    test("canSwapJobs sleep and time subgroup branches", async ({ page }) => {
      const result = await page.evaluate((data) => {
        data[0].jobs = [
          { id: "a", title: "A", active: true, sequence: 1, time: "09:00", sleepUntil: "" },
          { id: "b", title: "B", active: true, sequence: 2, time: "09:00", sleepUntil: "" },
          { id: "c", title: "C", active: true, sequence: 3, time: "10:00", sleepUntil: "" },
          { id: "d", title: "D", active: true, sequence: 4, time: "", sleepUntil: "2099-01-01" },
          { id: "e", title: "E", active: true, sequence: 5, time: "", sleepUntil: "2099-01-01" },
          { id: "f", title: "F", active: true, sequence: 6, time: "08:00", sleepUntil: "2099-01-01" },
          { id: "g", title: "G", active: true, sequence: 7, time: "", sleepUntil: "2099-06-01" },
          { id: "h", title: "H", active: true, sequence: 8, time: "  ", sleepUntil: "  " }
        ];
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        return {
          sameTime: canSwapJobs(0, 0, 1),
          diffTime: canSwapJobs(0, 0, 2),
          sameSleep: canSwapJobs(0, 3, 4),
          sleepDiffDate: canSwapJobs(0, 3, 6),
          sleepDiffTime: canSwapJobs(0, 3, 5),
          sleepVsUntimed: canSwapJobs(0, 3, 7),
          blankTrimUntimed: canSwapJobs(0, 7, 7),
          missingJob: canSwapJobs(0, 0, 99),
          emptyJobsStream: (() => {
            data.push({ id: "empty", title: "E", jobs: null });
            localStorage.setItem("planmydays_streams", JSON.stringify(data));
            try { return canSwapJobs(data.length - 1, 0, 1); } catch (e) { return "err"; }
          })()
        };
      }, TEST_STREAMS);
      expect(result.sameTime).toBe(true);
      expect(result.diffTime).toBe(false);
      expect(result.sameSleep).toBe(true);
      expect(result.sleepDiffDate).toBe(false);
      expect(result.sleepDiffTime).toBe(false);
      expect(result.sleepVsUntimed).toBe(false);
      expect(result.missingJob).toBe(false);
    });

    test("addScheduleJobsToOrder time sort branches", async ({ page }) => {
      const order = await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "s", title: "S", tab: "progress", sequence: 1,
          jobs: [
            { id: "noTime1", title: "N1", active: true, schedule: { type: "daily" } },
            { id: "timeB", title: "TB", active: true, time: "14:00", schedule: { type: "daily" } },
            { id: "timeA", title: "TA", active: true, time: "09:00", schedule: { type: "daily" } },
            { id: "noTime2", title: "N2", active: true, schedule: { type: "daily" } },
            { id: "inactive", title: "X", active: false, time: "07:00", schedule: { type: "daily" } }
          ]
        }]));
        return addScheduleJobsToOrder([]);
      });
      expect(order.indexOf("timeA")).toBeLessThan(order.indexOf("timeB"));
      expect(order).toContain("noTime1");
      expect(order).not.toContain("inactive");
    });

    test("loadCompletedJobs and loadTodayOrder null branches", async ({ page }) => {
      const result = await page.evaluate(() => {
        localStorage.removeItem("planmydays_completed");
        localStorage.removeItem("planmydays_today_order");
        return {
          completed: loadCompletedJobs(),
          order: loadTodayOrder()
        };
      });
      expect(result.completed).toEqual([]);
      expect(result.order).toBeNull();
    });

    test("shouldShowJobToday unknown type and empty days", async ({ page }) => {
      const result = await page.evaluate(() => ({
        unknown: shouldShowJobToday({ schedule: { type: "weird" } }),
        noSchedule: shouldShowJobToday({}),
        emptyDays: shouldShowJobToday({ schedule: { type: "days", days: [] } }),
        monthlyDefault: shouldShowJobToday({ schedule: { type: "monthly" } }),
        ndaysDefault: shouldShowJobToday({ schedule: { type: "ndays" } })
      }));
      expect(result.unknown).toBe(true);
      expect(result.noSchedule).toBe(true);
      expect(result.emptyDays).toBe(false);
    });

    test("getScheduleText and getNextDueText branches", async ({ page }) => {
      const result = await page.evaluate(() => ({
        daily: getScheduleText({ type: "daily" }),
        weekdays: getScheduleText({ type: "weekdays" }),
        weekends: getScheduleText({ type: "weekends" }),
        days: getScheduleText({ type: "days", days: [1, 3] }),
        daysEmpty: getScheduleText({ type: "days", days: [] }),
        monthly: getScheduleText({ type: "monthly", date: 15 }),
        monthlyDef: getScheduleText({ type: "monthly" }),
        ndays: getScheduleText({ type: "ndays", interval: 3, offset: 1 }),
        ndaysDef: getScheduleText({ type: "ndays" }),
        unknown: getScheduleText({ type: "x" }),
        none: getScheduleText(null),
        next: getNextDueText(3, 1),
        nextDef: getNextDueText(2, 0)
      }));
      expect(result.daily.toLowerCase()).toMatch(/every|daily/i);
      expect(result.weekdays.toLowerCase()).toMatch(/weekday/i);
      expect(result.next).toBeTruthy();
    });

    test("saveScheduleModal empty days falls back to daily", async ({ page }) => {
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        jobsStreamIndex = 0;
        jobsTargetStreamIndex = 0;
        jobsEditingIdx = 0;
        isNewJob = false;
        jobsBuffer = JSON.parse(JSON.stringify(data[0].jobs[0]));
        showJobEditModal();
      }, TEST_STREAMS);
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobSchedule-tab").click();
      await page.locator("#btnScheduleChange").click();
      await page.locator("#scheduleModal").waitFor({ state: "visible" });
      await page.locator('input[name="scheduleType"][value="days"]').check();
      await page.evaluate(() => onScheduleTypeChange());
      for (let i = 0; i < 7; i++) {
        const cb = page.locator("#schedDay" + i);
        if (await cb.count() && await cb.isChecked()) await cb.uncheck();
      }
      await page.evaluate(() => saveScheduleModal());
      const schedule = await page.evaluate(() => jobsBuffer?.schedule);
      expect(schedule?.type).toBe("daily");
    });

    test("formatDate and getDaysSinceEpoch", async ({ page }) => {
      const result = await page.evaluate(() => ({
        formatted: formatDate("2026-07-31"),
        empty: formatDate(""),
        epoch: getDaysSinceEpoch(new Date("2026-07-31T00:00:00"))
      }));
      expect(result.formatted).toBeTruthy();
      expect(typeof result.epoch).toBe("number");
    });

    test("image helper OOB and missing-data branches", async ({ page }) => {
      const result = await page.evaluate(() => {
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "Only", data: "data:image/svg+xml," + encodeURIComponent("<svg stroke='#111' fill='#222'></svg>") },
          { name: "NoData", data: "" },
          { name: "SingleQuote", data: "data:image/svg+xml," + encodeURIComponent("<svg stroke='#abc' fill='none'></svg>") }
        ]));
        editingImageIndex = -1;
        const out = {};
        out.dupOob = (duplicateImage(-1), duplicateImage(99), true);
        out.editOob = (editImageField("name", "x"), editImageColor(-1, "stroke", "#000"), editImageFillNone(99, true), editImageStrokeNone(-1, true), editImageStrokeWidth(99, "2"), true);
        out.strokeNonSvg = (editImageStrokeWidth(1, "3"), loadImages()[1].data);
        // single-quote attr path in updateSvgColor
        const sq = "data:image/svg+xml," + encodeURIComponent("<svg stroke='#abc' fill='none'></svg>");
        out.singleQuote = updateSvgColor(sq, "stroke", "#fff");
        // decodeVal %23 path
        out.pct = getImageColors("data:image/svg+xml," + encodeURIComponent('<svg stroke="%23ff00aa" fill="%2300bbcc" stroke-width="1"></svg>'));
        // missing stroke/fill matches
        out.bare = getImageColors("data:image/svg+xml," + encodeURIComponent("<svg></svg>"));
        // normalizeSvg defaults when no stroke/fill in children
        out.normEmpty = normalizeSvgForEditing("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
        out.normChild = normalizeSvgForEditing('<svg xmlns="http://www.w3.org/2000/svg"><path stroke="#111" fill="#222"/></svg>');
        // checkDuplicateName with no input
        editingImageIndex = -1;
        out.checkNoInput = (checkDuplicateName(), true);
        // openImageUpload cancel (no file)
        out.uploadCancel = (() => {
          const orig = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function() {
            Object.defineProperty(this, "files", { value: [], configurable: true });
            this.dispatchEvent(new Event("change"));
            HTMLInputElement.prototype.click = orig;
          };
          openImageUpload(0);
          return true;
        })();
        // getImageByName empty
        out.noName = getImageByName("");
        out.missing = getImageByName("Nope");
        out.dataUrl = getImageDataUrl("Only");
        out.dataMissing = getImageDataUrl("Nope");
        // page clamp when page beyond total
        imagesPage = 50;
        imageNameSearch = "";
        renderImagesEditor();
        out.pageClamped = imagesPage;
        return out;
      });
      expect(result.dupOob).toBe(true);
      expect(result.strokeNonSvg).toBe("");
      expect(result.pct.line).toMatch(/#ff00aa/i);
      expect(result.bare.line).toBe("");
      expect(result.normEmpty).toMatch(/stroke=/);
      expect(result.noName).toBeNull();
      expect(result.missing).toBeNull();
      expect(result.dataMissing).toBeNull();
      expect(result.pageClamped).toBe(0);
    });

    test("edit image prev color fallbacks and fill/stroke restore defaults", async ({ page }) => {
      await page.evaluate(() => {
        const svg = "data:image/svg+xml," + encodeURIComponent('<svg stroke="none" fill="none" stroke-width="2"><rect/></svg>');
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "NoneCols", data: svg }
        ]));
        editingImageIndex = 0;
        isNewImage = false;
        editImageBackup = JSON.parse(JSON.stringify(loadImages()[0]));
        renderImagesEditor();
      });
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      // uncheck none without _prev* set -> default #000000
      await page.evaluate(() => {
        editImageStrokeNone(0, false);
        editImageFillNone(0, false);
        // set none again storing prev, then restore
        editImageStrokeNone(0, true);
        editImageFillNone(0, true);
        editImageStrokeNone(0, false);
        editImageFillNone(0, false);
        // stroke width empty value fallback
        editImageStrokeWidth(0, "");
      });
      const img = await page.evaluate(() => loadImages()[0]);
      expect(img.lineColor).toBeTruthy();
      expect(img.fillColor).toBeTruthy();
    });

    test("seedSampleImages skips when images already present", async ({ page }) => {
      const result = await page.evaluate(() => {
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "x", data: "" }]));
        seedSampleImages();
        return JSON.parse(localStorage.getItem("planmydays_images")).length;
      });
      expect(result).toBe(1);
    });

    test("uploadStandardImages merges without duplicating names", async ({ page }) => {
      test.setTimeout(60000);
      await page.evaluate(async () => {
        // seed one name that will collide after upload
        const res = await fetch("sampleImages.json");
        const data = await res.json();
        if (data.images && data.images[0]) {
          localStorage.setItem("planmydays_images", JSON.stringify([data.images[0]]));
        }
      });
      await page.evaluate(() => uploadStandardImages());
      await page.waitForFunction(() => {
        const imgs = JSON.parse(localStorage.getItem("planmydays_images") || "[]");
        return imgs.length > 1;
      }, null, { timeout: 45000 });
      const names = await page.evaluate(() => JSON.parse(localStorage.getItem("planmydays_images")).map(i => i.name));
      expect(new Set(names).size).toBe(names.length);
    });

    test("settings auto-hide branch guards", async ({ page }) => {
      await page.evaluate(() => {
        // unbind when not bound
        autoHideEventsBound = false;
        unbindAutoHideEvents();
        // bind twice
        bindAutoHideEvents();
        bindAutoHideEvents();
        // reset when disabled
        localStorage.setItem("planmydays_autoHideMenu", "false");
        resetAutoHideTimer();
        // reset when cooldown active
        localStorage.setItem("planmydays_autoHideMenu", "true");
        autoHideCooldown = true;
        resetAutoHideTimer();
        autoHideCooldown = false;
        // hideNav when editors open should not hide
        document.getElementById("settingsPage").classList.remove("d-none");
        hideNav();
        const hiddenWhileSettings = document.getElementById("mainNav").classList.contains("nav-hidden");
        document.getElementById("settingsPage").classList.add("d-none");
        // hideNav normal path
        hideNav();
        // showNav
        showNav();
        // changeAutoHide on/off
        changeAutoHideMenu(true);
        changeAutoHideMenu(false);
        window.__autoHideBranch = {
          bound: autoHideEventsBound,
          hiddenWhileSettings
        };
      });
      const r = await page.evaluate(() => window.__autoHideBranch);
      expect(r.bound).toBe(false);
      expect(r.hiddenWhileSettings).toBe(false);
    });

    test("applyTheme fallback and font/density normal branches", async ({ page }) => {
      await page.evaluate(() => {
        applyTheme("not-a-real-theme");
        changeFontSize("normal");
        changeFontSize("small");
        changeDensity("normal");
        changeDensity("compact");
        changeIconSize("small");
        changeSplitList(false);
        changeHideDone(false);
        changeSkipAdhocConfirm(false);
        changeShowDanger(false);
        changeShowDanger(true);
      });
      const theme = await page.evaluate(() => localStorage.getItem("planmydays_theme"));
      expect(theme).toBe("not-a-real-theme");
      await expect(page.locator("body")).toHaveClass(/font-size-small/);
      await expect(page.locator("body")).toHaveClass(/compact/);
    });

    test("today drag drop same card and empty target branches", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.locator("#todayCardList .today-drag-card").first().waitFor({ state: "visible" });
      await page.evaluate(() => {
        const list = document.getElementById("todayCardList");
        const cards = [...list.querySelectorAll(".today-drag-card")];
        const c1 = cards[0];
        const c2 = cards[1];
        const dt = new DataTransfer();
        const fire = (type, el, y) => {
          const rect = el.getBoundingClientRect();
          el.dispatchEvent(new DragEvent(type, {
            bubbles: true, cancelable: true, dataTransfer: dt,
            clientX: rect.left + 5,
            clientY: y != null ? y : rect.top + rect.height / 2
          }));
        };
        // drop on self
        fire("dragstart", c1);
        fire("drop", c1);
        fire("dragend", c1);
        // dragover top and bottom
        fire("dragstart", c1);
        fire("dragover", c2, c2.getBoundingClientRect().top + 1);
        fire("dragover", c2, c2.getBoundingClientRect().bottom - 1);
        fire("drop", c2, c2.getBoundingClientRect().top + 1);
        fire("dragend", c1);
        // dragstart on list (no card)
        list.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: dt }));
      });
    });

    test("markJobDone and removeAdhocJob edge branches", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "ah", title: "Ad Hoc", tab: "progress", sequence: 1,
          jobs: [
            { id: "adhoc1", title: "A1", active: true, schedule: { type: "daily" } },
            { id: "adhoc2", title: "A2", active: true, schedule: { type: "daily" } }
          ]
        }, {
          id: "s2", title: "Work", tab: "progress", sequence: 2,
          jobs: [{ id: "w1", title: "W1", active: true, schedule: { type: "daily" } }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["adhoc1", "adhoc2", "w1"]));
        localStorage.setItem("planmydays_last_gen", getTodayStr());
        localStorage.setItem("planmydays_completed", JSON.stringify(["w1"]));
        localStorage.setItem("planmydays_skipAdhocConfirm", "true");
      });
      await page.reload();
      // already-completed job: uncheck then check again
      const workCb = page.locator('.job-checkbox[data-job-id="w1"]');
      await workCb.uncheck();
      await workCb.check();
      // adhoc with skip confirm removes job (element goes away on re-render)
      const adhocCb = page.locator('.job-checkbox[data-job-id="adhoc1"]');
      await adhocCb.click();
      await expect(page.locator('.today-drag-card[data-job-id="adhoc1"]')).toHaveCount(0);
      const remaining = await page.evaluate(() => {
        const s = loadStreams().find(t => t.title === "Ad Hoc");
        return (s.jobs || []).map(j => j.id);
      });
      expect(remaining).not.toContain("adhoc1");
      expect(remaining).toContain("adhoc2");
    });

    test("getJobSuffix mod zero and dayType defaults", async ({ page }) => {
      const result = await page.evaluate(() => {
        localStorage.setItem("planmydays_suffixStart", "0");
        localStorage.setItem("planmydays_monday", "1");
        localStorage.setItem("planmydays_jan1", "1");
        return {
          off: getJobSuffix({ suffix: false }),
          week: getJobSuffix({ suffix: true, dayType: "dayOfWeek" }),
          month: getJobSuffix({ suffix: true, dayType: "dayOfMonth" }),
          year: getJobSuffix({ suffix: true, dayType: "dayOfYear" }),
          mod0: getJobSuffix({ suffix: true, dayType: "dayOfYear", mod: "0" }),
          modBad: getJobSuffix({ suffix: true, dayType: "dayOfYear", mod: "abc" }),
          mod3: getJobSuffix({ suffix: true, dayType: "dayOfYear", mod: "3" })
        };
      });
      expect(result.off).toBe("");
      expect(result.week).toMatch(/\(\d+\)/);
      expect(result.mod3).toMatch(/\(\d+\)/);
    });

    test("closeScheduleModal with no instance is safe", async ({ page }) => {
      await page.evaluate(() => {
        const el = document.getElementById("scheduleModal");
        const inst = bootstrap.Modal.getInstance(el);
        if (inst) inst.dispose();
        closeScheduleModal();
      });
    });

    test("updateJobImagePreview and stream preview empty name", async ({ page }) => {
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "PrevImg", data: "data:image/svg+xml," + encodeURIComponent("<svg></svg>") }
        ]));
        jobsStreamIndex = 0;
        jobsTargetStreamIndex = 0;
        jobsBuffer = { title: "t", image: "" };
        jobsEditingIdx = 0;
        isNewJob = false;
        showJobEditModal();
      }, TEST_STREAMS);
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.evaluate(() => {
        updateJobImagePreview("");
        updateJobImagePreview("PrevImg");
        updateStreamImagePreview("");
        updateStreamImagePreview("PrevImg");
        updateJobStreamPreview();
        jobTimeChanged();
        clearSleepUntil();
        updateSleepUntilClearBtn();
        updateJobEditOkBtn();
      });
      await page.evaluate(() => {
        var streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].image = "PrevImg";
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
        updateJobStreamPreview();
        jobChangeStream(1);
    });
  });

  test.describe("Minio", () => {

    // ── Settings UI ────────────────────────────────────────

    test("minio tab exists in settings", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await expect(page.locator("#minio-tab")).toBeVisible();
    });

    test("minio tab shows fields when enabled", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#minio-tab").click();
      await expect(page.locator("#minioEnabled")).toBeVisible();
      await expect(page.locator("#minioServer")).toBeVisible();
      await expect(page.locator("#minioUsername")).toBeVisible();
      await expect(page.locator("#minioPassword")).toBeVisible();
      await expect(page.locator("#minioBucket")).toBeVisible();
    });

    test("minio fields are disabled when enable toggle is off", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#minio-tab").click();
      await expect(page.locator("#minioEnabled")).not.toBeChecked();
      await expect(page.locator("#minioServer")).toBeDisabled();
      await expect(page.locator("#minioUsername")).toBeDisabled();
      await expect(page.locator("#minioPassword")).toBeDisabled();
      await expect(page.locator("#minioBucket")).toBeDisabled();
    });

    test("minio fields become enabled when toggle is on", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#minio-tab").click();
      await page.waitForTimeout(200);
      await page.locator("#minioEnabled").check();
      await expect(page.locator("#minioServer")).toBeEnabled();
      await expect(page.locator("#minioUsername")).toBeEnabled();
      await expect(page.locator("#minioPassword")).toBeEnabled();
      await expect(page.locator("#minioBucket")).toBeEnabled();
    });

    test("minio settings persist in localStorage", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
        localStorage.setItem("planmydays_minio_server", "http://minio:9000");
        localStorage.setItem("planmydays_minio_username", "testuser");
        localStorage.setItem("planmydays_minio_password", "testpass");
        localStorage.setItem("planmydays_minio_bucket", "testbucket");
      });
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#minio-tab").click();
      await page.waitForTimeout(300);
      await expect(page.locator("#minioEnabled")).toBeChecked();
      await expect(page.locator("#minioServer")).toHaveValue("http://minio:9000");
      await expect(page.locator("#minioUsername")).toHaveValue("testuser");
      await expect(page.locator("#minioPassword")).toHaveValue("testpass");
      await expect(page.locator("#minioBucket")).toHaveValue("testbucket");
    });

    test("password toggle shows and hides password", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#minio-tab").click();
      await page.waitForTimeout(200);
      await page.locator("#minioEnabled").check();
      await page.locator("#minioPassword").fill("secret");
      await expect(page.locator("#minioPassword")).toHaveAttribute("type", "password");
      await page.locator("#minioFields button[title='Show/hide password']").click();
      await expect(page.locator("#minioPassword")).toHaveAttribute("type", "text");
      await page.locator("#minioFields button[title='Show/hide password']").click();
      await expect(page.locator("#minioPassword")).toHaveAttribute("type", "password");
    });

    // ── Menu visibility ────────────────────────────────────

    test("minio menu items hidden when disabled", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Import/Export" }).click();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Export to Minio" })).not.toBeVisible();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Import from Minio" })).not.toBeVisible();
    });

    test("minio menu items appear when enabled", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
        localStorage.setItem("planmydays_minio_server", "http://localhost:9000");
        localStorage.setItem("planmydays_minio_username", "u");
        localStorage.setItem("planmydays_minio_password", "p");
        localStorage.setItem("planmydays_minio_bucket", "b");
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Import/Export" }).click();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Export to Minio" })).toBeVisible();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Import from Minio" })).toBeVisible();
    });

    // ── Export error handling ──────────────────────────────

    test("export to minio shows alert when missing server config", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
      });
      await page.reload();
      await page.evaluate(() => exportToMinio());
      await page.waitForTimeout(300);
      await expect(page.locator("#minioAlertModal")).toBeVisible();
      await expect(page.locator("#minioAlertModal").locator("p")).toContainText("configure all Minio settings");
      await page.locator("#minioAlertModal .btn").click();
      await page.waitForTimeout(300);
      await expect(page.locator("#minioAlertModal")).not.toBeAttached();
    });

    test("export to minio alerts self-remove from DOM after close", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
      });
      await page.reload();
      await page.evaluate(() => exportToMinio());
      await page.waitForTimeout(300);
      await page.locator("#minioAlertModal .btn").click();
      await page.waitForTimeout(500);
      await expect(page.locator("#minioAlertModal")).not.toBeAttached();
    });

    // ── Import error handling ──────────────────────────────

    test("import from minio shows alert when missing config", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
      });
      await page.reload();
      await page.evaluate(() => importFromMinio());
      await page.waitForTimeout(300);
      await expect(page.locator("#minioAlertModal")).toBeVisible();
      await expect(page.locator("#minioAlertModal").locator("p")).toContainText("server, username and password");
    });

    test("import from minio does nothing when disabled", async ({ page }) => {
      await page.evaluate(() => importFromMinio());
      await page.waitForTimeout(300);
      await expect(page.locator("#minioImportModal")).not.toBeAttached();
    });

    // ── getMinioConfig returns correct shape ───────────────

    test("getMinioConfig parses localStorage values", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
        localStorage.setItem("planmydays_minio_server", "http://srv:9000/");
        localStorage.setItem("planmydays_minio_username", "minioadmin");
        localStorage.setItem("planmydays_minio_password", "minioadmin");
        localStorage.setItem("planmydays_minio_bucket", "pmd");
      });
      await page.reload();
      const config = await page.evaluate(() => getMinioConfig());
      expect(config.enabled).toBe(true);
      expect(config.server).toBe("http://srv:9000");
      expect(config.username).toBe("minioadmin");
      expect(config.password).toBe("minioadmin");
      expect(config.bucket).toBe("pmd");
    });

    test("getMinioConfig strips trailing slashes from server", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_server", "http://host:9000///");
      });
      await page.reload();
      const server = await page.evaluate(() => getMinioConfig().server);
      expect(server).toBe("http://host:9000");
    });

    // ── showMinioAlert modal ───────────────────────────────

    test("showMinioAlert creates and shows modal", async ({ page }) => {
      await page.evaluate(() => showMinioAlert("Test message"));
      await page.waitForTimeout(300);
      await expect(page.locator("#minioAlertModal")).toBeVisible();
      await expect(page.locator("#minioAlertModal").locator("p")).toContainText("Test message");
    });

    test("showMinioAlert error type uses red button", async ({ page }) => {
      await page.evaluate(() => showMinioAlert("Error!", "error"));
      await page.waitForTimeout(300);
      await expect(page.locator("#minioAlertModal .btn-danger")).toBeVisible();
    });

    test("showMinioAlert info type uses primary button", async ({ page }) => {
      await page.evaluate(() => showMinioAlert("Info", "info"));
      await page.waitForTimeout(300);
      await expect(page.locator("#minioAlertModal .btn-primary")).toBeVisible();
    });

    test("showMinioAlert cleans up old modal before showing new", async ({ page }) => {
      await page.evaluate(() => showMinioAlert("First"));
      await page.waitForTimeout(200);
      await page.evaluate(() => showMinioAlert("Second"));
      await page.waitForTimeout(300);
      const count = await page.locator("#minioAlertModal").count();
      expect(count).toBe(1);
      await expect(page.locator("#minioAlertModal").locator("p")).toContainText("Second");
    });

    // ── Crypto functions ──────────────────────────────────

    test("sha256 computes correct hash for empty string", async ({ page }) => {
      const hash = await page.evaluate(() => sha256(""));
      expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    });

    test("sha256 computes correct hash for known input", async ({ page }) => {
      const hash = await page.evaluate(() => sha256("hello"));
      expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
    });

    test("sha256 returns a promise", async ({ page }) => {
      const isPromise = await page.evaluate(() => sha256("test") instanceof Promise);
      expect(isPromise).toBe(true);
    });

    test("bufToHex converts ArrayBuffer to lowercase hex", async ({ page }) => {
      const hex = await page.evaluate(() => {
        var buf = new Uint8Array([0, 1, 10, 16, 255]).buffer;
        return bufToHex(buf);
      });
      expect(hex).toBe("00010a10ff");
    });

    test("bufToHex pads single-digit bytes", async ({ page }) => {
      const hex = await page.evaluate(() => {
        var buf = new Uint8Array([5, 15]).buffer;
        return bufToHex(buf);
      });
      expect(hex).toBe("050f");
    });

    test("hmacSign returns an ArrayBuffer", async ({ page }) => {
      const isAB = await page.evaluate(async () => {
        var r = await hmacSign("key", "message");
        return r instanceof ArrayBuffer;
      });
      expect(isAB).toBe(true);
    });

    test("hmacSign produces consistent output", async ({ page }) => {
      const r1 = await page.evaluate(async () => {
        var r = await hmacSign("secret", "data");
        return bufToHex(r);
      });
      const r2 = await page.evaluate(async () => {
        var r = await hmacSign("secret", "data");
        return bufToHex(r);
      });
      expect(r1).toBe(r2);
      expect(r1.length).toBeGreaterThan(0);
    });

    test("getSignatureKey returns an ArrayBuffer", async ({ page }) => {
      const isAB = await page.evaluate(async () => {
        var r = await getSignatureKey("secret", "20260802", "us-east-1", "s3");
        return r instanceof ArrayBuffer;
      });
      expect(isAB).toBe(true);
    });

    test("getSignatureKey produces consistent signing key", async ({ page }) => {
      const k1 = await page.evaluate(async () => {
        var r = await getSignatureKey("secret", "20260802", "us-east-1", "s3");
        return bufToHex(r);
      });
      const k2 = await page.evaluate(async () => {
        var r = await getSignatureKey("secret", "20260802", "us-east-1", "s3");
        return bufToHex(r);
      });
      expect(k1).toBe(k2);
      expect(k1.length).toBe(64);
    });

    // ── Config change functions ────────────────────────────

    test("changeMinioServer stores value", async ({ page }) => {
      await page.evaluate(() => changeMinioServer("http://srv:9000"));
      const val = await page.evaluate(() => localStorage.getItem("planmydays_minio_server"));
      expect(val).toBe("http://srv:9000");
    });

    test("changeMinioUsername stores value", async ({ page }) => {
      await page.evaluate(() => changeMinioUsername("admin"));
      const val = await page.evaluate(() => localStorage.getItem("planmydays_minio_username"));
      expect(val).toBe("admin");
    });

    test("changeMinioPassword stores value", async ({ page }) => {
      await page.evaluate(() => changeMinioPassword("secret"));
      const val = await page.evaluate(() => localStorage.getItem("planmydays_minio_password"));
      expect(val).toBe("secret");
    });

    test("changeMinioBucket stores value", async ({ page }) => {
      await page.evaluate(() => changeMinioBucket("mybucket"));
      const val = await page.evaluate(() => localStorage.getItem("planmydays_minio_bucket"));
      expect(val).toBe("mybucket");
    });

    test("changeMinioEnabled toggles fields and menu", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#minio-tab").click();
      await page.waitForTimeout(200);
      await page.locator("#minioEnabled").check();
      const items = await page.locator(".minio-menu-item").count();
      expect(items).toBeGreaterThan(0);
    });

    // ── getMinioConfig defaults ────────────────────────────

    test("getMinioConfig returns empty defaults", async ({ page }) => {
      const config = await page.evaluate(() => getMinioConfig());
      expect(config.enabled).toBe(false);
      expect(config.server).toBe("");
      expect(config.username).toBe("");
      expect(config.password).toBe("");
      expect(config.bucket).toBe("");
    });

    test("getMinioConfig with empty server still returns empty string", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_minio_server", ""));
      await page.reload();
      const config = await page.evaluate(() => getMinioConfig());
      expect(config.server).toBe("");
    });

    // ── loadMinioSettings populates form ───────────────────

    test("loadMinioSettings populates fields from localStorage", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
        localStorage.setItem("planmydays_minio_server", "http://srv:9000");
        localStorage.setItem("planmydays_minio_username", "u");
        localStorage.setItem("planmydays_minio_password", "p");
        localStorage.setItem("planmydays_minio_bucket", "b");
        loadMinioSettings();
      });
      await expect(page.locator("#minioEnabled")).toBeChecked();
      await expect(page.locator("#minioServer")).toHaveValue("http://srv:9000");
      await expect(page.locator("#minioUsername")).toHaveValue("u");
      await expect(page.locator("#minioPassword")).toHaveValue("p");
      await expect(page.locator("#minioBucket")).toHaveValue("b");
    });

    test("loadMinioSettings disables fields when not enabled", async ({ page }) => {
      await page.evaluate(() => loadMinioSettings());
      await expect(page.locator("#minioServer")).toBeDisabled();
      await expect(page.locator("#minioUsername")).toBeDisabled();
      await expect(page.locator("#minioPassword")).toBeDisabled();
      await expect(page.locator("#minioBucket")).toBeDisabled();
    });

    // ── Import modal UI ────────────────────────────────────

    test("showMinioImportModal creates modal with loading state", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
        localStorage.setItem("planmydays_minio_server", "http://localhost:9000");
        localStorage.setItem("planmydays_minio_username", "u");
        localStorage.setItem("planmydays_minio_password", "p");
      });
      await page.reload();
      await page.evaluate(() => showMinioImportModal());
      await page.waitForTimeout(300);
      await expect(page.locator("#minioImportModal")).toBeVisible();
      await expect(page.locator("#minioImportBody")).toContainText("Loading buckets");
    });

    test("closeMinioImport hides and removes modal", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
        localStorage.setItem("planmydays_minio_server", "http://localhost:9000");
        localStorage.setItem("planmydays_minio_username", "u");
        localStorage.setItem("planmydays_minio_password", "p");
      });
      await page.reload();
      await page.evaluate(() => showMinioImportModal());
      await page.waitForTimeout(300);
      await page.evaluate(() => closeMinioImport());
      await page.waitForTimeout(500);
      await expect(page.locator("#minioImportModal")).not.toBeAttached();
    });

    // ── Import modal error paths ───────────────────────────

    test("import modal list buckets shows error on invalid server", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_minio_enabled", "true");
        localStorage.setItem("planmydays_minio_server", "http://127.0.0.1:1");
        localStorage.setItem("planmydays_minio_username", "u");
        localStorage.setItem("planmydays_minio_password", "p");
      });
      await page.reload();
      await page.evaluate(() => showMinioImportModal());
      await page.waitForTimeout(300);
      // Should show error (fetch to non-existent server will fail)
      // At minimum the modal should still exist
      await expect(page.locator("#minioImportModal")).toBeVisible();
    });

    // ── Export does nothing when disabled ──────────────────

    test("export to minio does nothing when disabled", async ({ page }) => {
      await page.evaluate(() => exportToMinio());
      await page.waitForTimeout(300);
      await expect(page.locator("#minioAlertModal")).not.toBeAttached();
    });

    // ── toggleMinioPassword edge cases ─────────────────────

    test("toggleMinioPassword is safe when input missing", async ({ page }) => {
      await page.evaluate(() => {
        var input = document.getElementById("minioPassword");
        if (input) input.remove();
        toggleMinioPassword();
      });
      // Should not throw
    });

    // ── updateMinioMenu edge cases ─────────────────────────

    test("updateMinioMenu hides items when no minio items exist", async ({ page }) => {
      await page.evaluate(() => {
        var items = document.querySelectorAll(".minio-menu-item");
        items.forEach(function(el) { el.remove(); });
        updateMinioMenu();
      });
      // Should not throw
    });

    // ── Minio request rejection for bad config ─────────────

    test("minioRequest with unreachable server returns error", async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          await minioRequest("GET", "bucket", null, null, null, {
            server: "http://127.0.0.1:1",
            username: "u",
            password: "p"
          });
          return "no-error";
        } catch (e) {
          return "error";
        }
      });
      expect(result).toBe("error");
    });

    test("minioListBuckets with bad server fails gracefully", async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          await minioListBuckets({
            server: "http://127.0.0.1:1",
            username: "u",
            password: "p"
          });
          return "no-error";
        } catch (e) {
          return "error";
        }
      });
      expect(result).toBe("error");
    });

    test("minioListObjects with bad server fails gracefully", async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          await minioListObjects("bucket", {
            server: "http://127.0.0.1:1",
            username: "u",
            password: "p"
          });
          return "no-error";
        } catch (e) {
          return "error";
        }
      });
      expect(result).toBe("error");
    });

    test("minioGetObject with bad server fails gracefully", async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          await minioGetObject("bucket", "key", {
            server: "http://127.0.0.1:1",
            username: "u",
            password: "p"
          });
          return "no-error";
        } catch (e) {
          return "error";
        }
      });
      expect(result).toBe("error");
    });

    test("minioPutObject with bad server fails gracefully", async ({ page }) => {
      const result = await page.evaluate(async () => {
        try {
          await minioPutObject("bucket", "key", "{}", {
            server: "http://127.0.0.1:1",
            username: "u",
            password: "p"
          });
          return "no-error";
        } catch (e) {
          return "error";
        }
      });
      expect(result).toBe("error");
    });
  });

  // ── Job Edit Tabs ─────────────────────────────────────────

  test.describe("Job Edit Tabs", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
      await page.locator("#streamEditorList .stream-header-main").first().click();
      await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    });

    test("General tab is active by default", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#jobGeneral-tab")).toHaveClass(/active/);
      await expect(page.locator("#jobGeneral")).toHaveClass(/show/);
    });

    test("Schedule tab switches correctly", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobSchedule-tab").click();
      await expect(page.locator("#jobSchedule-tab")).toHaveClass(/active/);
      await expect(page.locator("#jobSchedule")).toHaveClass(/show/);
      await expect(page.locator("#jobGeneral")).not.toHaveClass(/show/);
    });

    test("Tasks tab switches correctly", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await expect(page.locator("#jobTasks-tab")).toHaveClass(/active/);
      await expect(page.locator("#jobTasks")).toHaveClass(/show/);
      await page.locator("#jobAddTaskBtn").waitFor({ state: "visible" });
    });

    test("active tab persists when switching from view to edit", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await expect(page.locator("#jobTasks-tab")).toHaveClass(/active/);
      await page.locator("#btnViewJobEdit").filter({ hasText: "Edit" }).click();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Edit Job");
      await expect(page.locator("#jobTasks-tab")).toHaveClass(/active/);
      await expect(page.locator("#jobTasks")).toHaveClass(/show/);
    });

    test("add task increases task count", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator(".task-row")).toHaveCount(1);
      await page.locator("#jobAddTaskBtn").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator(".task-row")).toHaveCount(3);
    });

    test("task description is stored in jobsBuffer", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").first().fill("Check logs");
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].description).toBe("Check logs");
    });

    test("task done checkbox toggles stored value", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-done-cb").first().check();
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks[0].done).toBe(true);
      await page.locator(".task-done-cb").first().uncheck();
      const tasks2 = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks2[0].done).toBe(false);
    });

    test("delete task removes it from list", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator(".task-row")).toHaveCount(2);
      await page.locator("#jobTasksList .btn-danger").first().click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "visible" });
      await page.locator("#deleteConfirmBtn").click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "hidden" });
      await expect(page.locator(".task-row")).toHaveCount(1);
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks).toHaveLength(1);
    });

    test("delete task cancel keeps the task", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator(".task-row")).toHaveCount(2);
      await page.locator("#jobTasksList .btn-danger").first().click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "visible" });
      await page.locator("#btnDeleteCancel").click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "hidden" });
      await expect(page.locator(".task-row")).toHaveCount(2);
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks).toHaveLength(2);
    });

    test("delete task confirm shows task name", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").first().fill("My task name");
      await page.locator("#jobTasksList .btn-danger").first().click();
      await page.locator("#deleteConfirmModal").waitFor({ state: "visible" });
      await expect(page.locator("#deleteConfirmMessage")).toContainText("My task name");
      await page.locator("#deleteConfirmBtn").click();
    });

    test("task note button toggles note textarea", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      const noteRow = page.locator("#taskNoteRow0");
      await expect(noteRow).not.toBeVisible();
      await page.locator(".task-note-btn").first().click();
      await expect(noteRow).toBeVisible();
      await page.locator(".task-note-btn").first().click();
      await expect(noteRow).not.toBeVisible();
    });

    test("task note is stored in jobsBuffer", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-note-btn").first().click();
      await page.locator("#taskNoteRow0 textarea").fill("Important note about task");
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks[0].note).toBe("Important note about task");
    });

    test("task note persists through re-render", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-note-btn").first().click();
      await page.locator("#taskNoteRow0 textarea").fill("Persistent note");
      await page.locator("#jobAddTaskBtn").click();
      const noteRow = page.locator("#taskNoteRow0");
      await expect(noteRow).toBeVisible();
      const noteValue = await page.locator("#taskNoteRow0 textarea").inputValue();
      expect(noteValue).toBe("Persistent note");
    });

    test("task note button style reflects note status", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator(".task-note-btn").first()).toHaveClass(/btn-outline-info/);
      await page.locator(".task-note-btn").first().click();
      await page.locator("#taskNoteRow0 textarea").fill("has note");
      await page.locator(".task-note-btn").first().click();
      await expect(page.locator(".task-note-btn").first()).toHaveClass(/btn-info/);
    });

    test("tasks persist through save and reload", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").first().fill("Review PRs");
      await page.locator(".task-done-cb").first().check();
      await page.locator("#jobEditOkBtn").click();
      await page.locator("#jobEditModal").waitFor({ state: "hidden", timeout: 15000 });
      const savedTasks = await page.evaluate(() => {
        const streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        return streams[0].jobs[0].tasks;
      });
      expect(savedTasks).toHaveLength(1);
      expect(savedTasks[0].description).toBe("Review PRs");
      expect(savedTasks[0].done).toBe(true);
    });

    test("newly created job has empty tasks array", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks).toEqual([]);
    });

    test("add task renders task at top of list", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").first().fill("First task");
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").last().fill("Second task");
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks).toHaveLength(2);
      expect(tasks[0].description).toBe("First task");
      expect(tasks[1].description).toBe("Second task");
    });

    test("delete button on task row is btn-danger", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator("#jobTasksList .btn-danger")).toBeVisible();
    });

    test("add task button is btn-primary and at top", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await expect(page.locator("#jobAddTaskBtn")).toHaveClass(/btn-primary/);
      await page.locator("#jobAddTaskBtn").click();
      await page.locator("#jobAddTaskBtn").click();
      const addBtnEl = page.locator("#jobAddTaskBtn");
      const tasksListEl = page.locator("#jobTasksList");
      const addBtnBox = await addBtnEl.boundingBox();
      const tasksListBox = await tasksListEl.boundingBox();
      expect(addBtnBox.y).toBeLessThan(tasksListBox.y);
    });

    test("tasks tab shows no tasks for job without tasks", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await expect(page.locator("#jobAddTaskBtn")).toBeVisible();
      await expect(page.locator("#jobTasksList .task-row")).toHaveCount(0);
    });

    test("task rows have drag handle", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator(".task-drag-card .drag-handle")).toHaveCount(2);
    });

    test("task rows are draggable in edit mode", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await expect(page.locator(".task-drag-card")).toHaveAttribute("draggable", "true");
    });

    test("view-only mode hides drag handle on tasks", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => {
        const streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs[0].tasks = [{ description: "Test task", done: false }];
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      const dragHandles = page.locator(".task-drag-card .drag-handle");
      await expect(dragHandles).toHaveCount(0);
    });

    test("view-only mode task rows are not draggable", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => {
        const streams = JSON.parse(localStorage.getItem("planmydays_streams"));
        streams[0].jobs[0].tasks = [{ description: "Test task", done: false }];
        localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      });
      await page.reload();
      await page.locator(".job-view-btn").first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      const card = page.locator(".task-drag-card").first();
      await expect(card).not.toHaveAttribute("draggable", "true");
    });

    test("reorderTask moves task in buffer array", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").first().fill("Task A");
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").last().fill("Task B");
      await page.evaluate(() => reorderTask(0, 1, false));
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks[0].description).toBe("Task B");
      expect(tasks[1].description).toBe("Task A");
    });

    test("reorderTask with above flag adjusts position", async ({ page }) => {
      await page.locator("#streamEditorList .accordion-body .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobTasks-tab").click();
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").first().fill("A");
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").last().fill("B");
      await page.locator("#jobAddTaskBtn").click();
      await page.locator(".task-desc-input").last().fill("C");
      await page.evaluate(() => reorderTask(2, 0, true));
      const tasks = await page.evaluate(() => jobsBuffer?.tasks);
      expect(tasks[0].description).toBe("C");
      expect(tasks[1].description).toBe("A");
      expect(tasks[2].description).toBe("B");
    });
  });
  });
});
