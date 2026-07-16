const { test, expect } = require("@playwright/test");

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
        mod: ""
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
        mod: ""
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
        mod: ""
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
    await page.evaluate(() => localStorage.clear());
  });

  // ── Main View ──────────────────────────────────────────────

  test.describe("Main View", () => {

    test("loads with date heading", async ({ page }) => {
      await expect(page.locator("h2").first()).toBeVisible();
    });

    test("add card form toggles", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await expect(page.locator("#addCardForm")).toBeVisible();
      await expect(page.locator("#newCardTitle")).toBeVisible();
    });

    test("can cancel adding an adhoc card", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await page.locator("#addCardForm .btn-secondary").click();
      await expect(page.locator("#addCardForm")).not.toBeVisible();
    });

    test("can add an adhoc card", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await page.locator("#newCardTitle").fill("Test Ad Hoc");
      await page.locator("#newCardDesc").fill("Test description");
      await page.locator("#addCardForm .btn-primary").filter({ hasText: "Add" }).click();
      await expect(page.locator("h4").filter({ hasText: "Test Ad Hoc" })).toBeVisible();
    });

    test("completed jobs show strikethrough", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      const cb = page.locator('.job-checkbox[data-job-id="job_1"]');
      await cb.check();
      await expect(cb).toBeChecked();
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
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
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
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Streams" })).toBeVisible();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Images" })).toBeVisible();
    });

    test("import/export dropdown has items", async ({ page }) => {
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Import/Export" }).click();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Export" })).toBeVisible();
      await expect(page.locator("a.dropdown-item").filter({ hasText: "Import" })).toBeVisible();
    });
  });

  // ── Settings ───────────────────────────────────────────────

  test.describe("Settings", () => {

    test("shows all main settings controls", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await expect(page.locator("#themeSelector")).toBeVisible();
      await expect(page.locator("#fontSizeSelector")).toBeVisible();
      await expect(page.locator("#iconSizeSelector")).toBeVisible();
      await expect(page.locator("#densitySelector")).toBeVisible();
      await expect(page.locator("#splitList")).toBeVisible();
      await expect(page.locator("#autoHideMenu")).toBeVisible();
      await expect(page.locator("#hideDone")).toBeVisible();
      await expect(page.locator("#jan1Selector")).toBeVisible();
      await expect(page.locator("#mondaySelector")).toBeVisible();
      await expect(page.locator("#showDanger")).toBeVisible();
    });

    test("danger zone hidden by default", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await expect(page.locator("#regenerateTilesRow")).not.toBeVisible();
      await expect(page.locator("#clearAllDataRow")).not.toBeVisible();
    });

    test("danger zone appears when toggled", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#showDanger").check();
      await expect(page.locator("#regenerateTilesRow")).toBeVisible();
      await expect(page.locator("#clearAllDataRow")).toBeVisible();
    });

    test("font size selector changes body class", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#fontSizeSelector").selectOption("small");
      const hasClass = await page.evaluate(() => document.body.classList.contains("font-size-small"));
      expect(hasClass).toBe(true);
    });

    test("icon size selector changes body class", async ({ page }) => {
      await page.getByTitle("Settings").click();
      await page.locator("#iconSizeSelector").selectOption("small");
      const hasClass = await page.evaluate(() => document.body.classList.contains("icon-size-small"));
      expect(hasClass).toBe(true);
    });

    test("density selector changes body class", async ({ page }) => {
      await page.getByTitle("Settings").click();
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

    test("exports data as downloadable file", async ({ page }) => {
      await page.getByTitle("Settings").click();
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 5000 }),
        page.getByText("Export Data").click()
      ]);
      expect(download.suggestedFilename()).toMatch(/^planmydays-backup-/);
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
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
    });

    test("shows stream list", async ({ page }) => {
      await expect(page.getByText("Work")).toBeVisible();
      await expect(page.getByText("Chores")).toBeVisible();
    });

    test("add stream creates a new stream", async ({ page }) => {
      await page.getByRole("button", { name: "Add Stream" }).click();
      await expect(page.locator("#singleStreamEditor")).toBeVisible();
      await expect(page.locator('input[value="New Stream"]')).toBeVisible();
    });

    test("can edit a stream", async ({ page }) => {
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#singleStreamEditor")).toBeVisible();
      const titleInput = page.locator('input[value="Work"]');
      await expect(titleInput).toBeVisible();
      await titleInput.fill("Work Updated");
      await page.getByRole("button", { name: "OK" }).click();
      await expect(page.getByText("Work Updated")).toBeVisible();
    });

    test("can cancel editing a stream", async ({ page }) => {
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator('input[value="Work"]').fill("Cancelled");
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Work")).toBeVisible();
      await expect(page.getByText("Cancelled")).not.toBeVisible();
    });

    test("can delete a stream", async ({ page }) => {
      await page.locator("#streamEditorList .btn-danger").filter({ hasText: "Delete" }).first().click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmBtn").click();
      await expect(page.getByText("Work")).not.toBeVisible();
    });

    test("shows tab badge on stream cards", async ({ page }) => {
      await expect(page.locator("#streamEditorList .badge").first()).toBeVisible();
    });

    test("opens jobs editor from stream", async ({ page }) => {
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
      await expect(page.locator("#jobsEditor")).toBeVisible();
    });

    test("closes streams editor back to main view", async ({ page }) => {
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.locator("#countdownContainer")).toBeVisible();
    });
  });

  // ── Jobs Editor ────────────────────────────────────────────

  test.describe("Jobs Editor", () => {

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
      await page.locator("#jobsEditor").waitFor({ state: "visible" });
    });

    test("shows job list", async ({ page }) => {
      await expect(page.locator("#jobsList .fw-bold").first()).toContainText("Report");
      await expect(page.getByText("Meeting")).toBeVisible();
    });

    test("opens add job modal", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
    });

    test("can fill and save a new job", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("New Job Test");
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      await page.locator("#jobsList").waitFor({ state: "visible" });
      await expect(page.getByText("New Job Test")).toBeVisible();
    });

    test("can cancel adding a new job", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModal .btn-secondary").filter({ hasText: "Cancel" }).click();
      await expect(page.locator("#jobEditModal")).not.toBeVisible();
    });

    test("opens edit job modal with existing data", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
      await expect(page.locator("#jobEditModalTitle")).toContainText("Edit");
    });

    test("can delete a job", async ({ page }) => {
      await page.locator("#jobsList .btn-danger").filter({ hasText: "Delete" }).first().click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmBtn").click();
    });

    test("schedule modal opens from job edit", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByText("Change").click();
      await expect(page.locator("#scheduleModal")).toBeVisible();
    });

    test("schedule modal can select specific days", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByText("Change").click();
      await page.locator("#schedDays").check();
      await expect(page.locator("#schedDaysOptions")).toBeVisible();
      await page.locator("#schedDay0").check();
      await page.locator("#schedDay2").check();
      await page.locator("#scheduleModal .btn-primary").click();
    });

    test("returns to streams from jobs editor", async ({ page }) => {
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.locator("#streamsEditor")).toBeVisible();
    });
  });

  // ── Schedule Modal ─────────────────────────────────────────

  test.describe("Schedule Modal", () => {

    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByText("Change").click();
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
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const nameInput = page.locator("#imageEditModalBody input:not([type])");
      await nameInput.waitFor({ state: "visible" });
      await nameInput.fill("TestImage");
      await page.locator("#imageEditModal .btn-success").click();
      await expect(page.getByText("TestImage").first()).toBeVisible();
    });

    test("can cancel adding a new image", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModal .btn-secondary").filter({ hasText: "Cancel" }).click();
      await expect(page.locator("#imageEditModal")).not.toBeVisible();
    });

    test("duplicate button creates copy", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").fill("MyImg");
      await page.locator("#imageEditModal .btn-success").click();
      await page.locator("#imageEditModal").waitFor({ state: "hidden" });
      await page.locator(".card:has-text('MyImg') .btn-info").filter({ hasText: "Duplicate" }).click();
      await expect(page.locator("#imageEditModalBody .form-control:not(.form-control-sm)")).toHaveValue("MyImg 2");
    });

    test("delete button shows confirmation", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").fill("DelImg");
      await page.locator("#imageEditModal .btn-success").click();
      await page.locator("#imageEditModal").waitFor({ state: "hidden" });
      await page.locator(".card:has-text('DelImg') .btn-danger").filter({ hasText: "Delete" }).click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmBtn").click();
      await expect(page.getByText("DelImg")).not.toBeVisible();
    });

    test("upload button exists on edit modal", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await expect(page.locator("#imageEditModal .btn-primary").filter({ hasText: "Upload" })).toBeVisible();
    });

    test("search filters the image list", async ({ page }) => {
      await page.getByRole("button", { name: "Add Image" }).click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").waitFor({ state: "visible" });
      await page.locator("#imageEditModalBody .form-control:not(.form-control-sm)").fill("FilterMe");
      await page.locator("#imageEditModal .btn-success").click();
      await page.locator("#imageEditModal").waitFor({ state: "hidden" });
      await page.locator('#imageFilters input[type="search"]').fill("FilterMe");
      await expect(page.getByText("FilterMe")).toBeVisible();
    });

    test("clear search resets filter", async ({ page }) => {
      await page.locator('#imageFilters input[type="search"]').fill("xyz");
      await page.getByRole("button", { name: "Clear" }).click();
      const searchVal = await page.locator('#imageFilters input[type="search"]').inputValue();
      expect(searchVal).toBe("");
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
      await page.goto("/");
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
        localStorage.setItem("images", JSON.stringify([
          { name: "PickTest", data: "" },
          { name: "Another", data: "" }
        ]));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Choose" }).click();
    });

    test("opens from stream editor image choose", async ({ page }) => {
      await expect(page.locator("#imagePickerModal")).toBeVisible();
    });

    test("shows available images in picker", async ({ page }) => {
      await expect(page.getByText("PickTest")).toBeVisible();
      await expect(page.getByText("Another")).toBeVisible();
    });

    test("search filters picker items", async ({ page }) => {
      await page.locator(".image-picker-search").fill("PickTest");
      await expect(page.getByText("PickTest")).toBeVisible();
      await expect(page.getByText("Another")).not.toBeVisible();
    });

    test("clear button resets picker search", async ({ page }) => {
      await page.locator(".image-picker-search").fill("PickTest");
      await page.getByRole("button", { name: "Clear" }).click();
      const val = await page.locator(".image-picker-search").inputValue();
      expect(val).toBe("");
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
      await page.locator("#showDanger").check();
      await expect(page.locator(".flatpickr-input")).toHaveCount(2);
    });

    test("dev mode not visible without ?dev=true", async ({ page }) => {
      await page.goto("/");
      await page.getByTitle("Settings").click();
      await page.locator("#showDanger").check();
      await expect(page.locator(".flatpickr-input")).toHaveCount(0);
    });
  });

  // ── Split List ─────────────────────────────────────────────

  test.describe("Split List", () => {

    test("tabs appear when split list enabled", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => localStorage.setItem("splitList", "true"));
      await page.reload();
      const tabs = page.locator("button.btn-sm").filter({ hasText: /Progress|Maintenance/ });
      await expect(tabs).toHaveCount(2);
    });

    test("can switch between tabs", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => localStorage.setItem("splitList", "true"));
      await page.reload();
      await page.locator("button.btn-sm").filter({ hasText: "Maintenance" }).click();
      await expect(page.getByText("Laundry")).toBeVisible();
      await expect(page.getByText("Report")).not.toBeVisible();
    });
  });

  // ── Delete Confirm Modal ───────────────────────────────────

  test.describe("Delete Confirm Modal", () => {

    test("cancel button dismisses modal", async ({ page }) => {
      await page.evaluate((data) => {
        localStorage.setItem("planmydays_streams", JSON.stringify(data));
      }, TEST_STREAMS);
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-danger").filter({ hasText: "Delete" }).first().click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmModal [data-bs-dismiss='modal']").click();
      await expect(page.locator("#deleteConfirmModal")).not.toBeVisible();
    });
  });

  // ── Ad Hoc Workflow ────────────────────────────────────────

  test.describe("Ad Hoc Workflow", () => {

    test("checking adhoc shows remove confirmation", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await page.locator("#newCardTitle").fill("AdHocJob");
      await page.locator("#addCardForm .btn-primary").filter({ hasText: "Add" }).click();
      const cb = page.locator('.job-checkbox').first();
      await cb.check({ force: true });
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
    });

    test("skip adhoc confirm setting works", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("skipAdhocConfirm", "true"));
      await page.reload();
      await page.getByText("+ Add card").click();
      await page.locator("#newCardTitle").fill("SkipMe");
      await page.locator("#addCardForm .btn-primary").filter({ hasText: "Add" }).click();
      await expect(page.getByText("SkipMe")).toBeVisible();
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
      const suffixBadge = page.locator(".badge.bg-secondary").first();
      await expect(suffixBadge).toBeVisible();
    });
  });

  // ── Hide Done ──────────────────────────────────────────────

  test.describe("Hide Done", () => {

    test("completed jobs hidden when hideDone is on", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => {
        localStorage.setItem("planmydays_completed", JSON.stringify(["job_1"]));
        localStorage.setItem("hideDone", "true");
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
        localStorage.setItem("hideDone", "true");
      }, { streams: TEST_STREAMS, todayStr, todayOrder: ["job_1"] });
      await page.reload();
      await expect(page.getByText("All jobs completed!")).toBeVisible();
    });
  });
});
