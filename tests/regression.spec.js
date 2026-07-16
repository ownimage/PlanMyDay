const { test, expect } = require("@playwright/test");
const { startCoverage, stopCoverage, generateCoverage } = require("./coverage");

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
    await startCoverage(page);
    await page.reload();
  });

  test.afterEach(async ({ page }) => {
    await stopCoverage(page);
  });

  test.afterAll(async () => {
    await generateCoverage();
  });

  // ── Main View ──────────────────────────────────────────────

  test.describe("Main View", () => {

    test("loads with date heading", async ({ page }) => {
      await expect(page.locator("h2").first()).toBeVisible();
    });

    test("add card opens job edit modal", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
      await expect(page.locator("#jobEditModalTitle")).toHaveText("Add Job");
    });

    test("can cancel adding an adhoc card", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModal .btn-secondary").filter({ hasText: "Cancel" }).click();
      await expect(page.locator("#jobEditModal")).not.toBeVisible();
    });

    test("can add an adhoc card", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("Test Ad Hoc");
      await page.locator("#jobEditModalBody textarea").first().fill("Test description");
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "hidden" });
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
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
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
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#streamEditModal")).toBeVisible();
      const titleInput = page.locator("#streamEditModalBody input[value=\"Work\"]");
      await expect(titleInput).toBeVisible();
      await titleInput.fill("Work Updated");
      await page.locator("#streamEditModal .btn-success").filter({ hasText: "OK" }).click();
      await page.locator("#streamEditModal").waitFor({ state: "hidden" });
      await expect(page.getByText("Work Updated")).toBeVisible();
    });

    test("can cancel editing a stream", async ({ page }) => {
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#streamEditModal").waitFor({ state: "visible" });
      await page.locator("#streamEditModalBody input[value=\"Work\"]").fill("Cancelled");
      await page.locator("#streamEditModal .btn-secondary").filter({ hasText: "Cancel" }).click();
      await page.locator("#streamEditModal").waitFor({ state: "hidden" });
      await expect(page.locator("#streamEditorList .editor-title").filter({ hasText: "Work" })).toBeVisible();
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

    test("stream edit Remove button uses btn-danger", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "ImgStream", tab: "progress", image: "testimg", sequence: 1, jobs: []
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([{ name: "testimg", data: "" }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).click();
      await expect(page.locator("#streamEditModal")).toBeVisible();
      const removeBtn = page.locator("#streamEditModalBody .btn-danger").filter({ hasText: "Remove" });
      await expect(removeBtn).toBeVisible();
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
      await startCoverage(page);
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
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Choose" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
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
      await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
      await page.reload();
      const tabs = page.locator("button.btn-sm").filter({ hasText: /Progress|Maintenance/ });
      await expect(tabs).toHaveCount(2);
    });

    test("can switch between tabs", async ({ page }) => {
      await seedTodayList(page);
      await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
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
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("AdHocJob");
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "hidden" });
      await page.evaluate(() => {
        const cb = document.querySelector('.job-checkbox');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
    });

    test("skip adhoc confirm setting works", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_skipAdhocConfirm", "true"));
      await page.reload();
      await page.getByText("+ Add card").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("SkipMe");
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "hidden" });
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

  // ── Suffix Start Setting ──────────────────────────────────

  test.describe("Suffix Start Setting", () => {

    test("suffix start dropdown exists in settings after hide done", async ({ page }) => {
      await page.getByTitle("Settings").click();
      const suffixStartSel = page.locator("#suffixStartSelector");
      await expect(suffixStartSel).toBeVisible();
    });

    test("suffix start 0 shows 0-based number on badge", async ({ page }) => {
      await page.evaluate(() => {
        const now = new Date();
        const ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "SuffixJob", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "" }]
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
          jobs: [{ id: "job_1", title: "SuffixPlus1", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "" }]
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
      const progressBadge = page.locator(".badge.bg-primary").filter({ hasText: "progress" });
      await expect(progressBadge.first()).toBeVisible();
      const maintenanceBadge = page.locator(".badge.bg-secondary").filter({ hasText: "maintenance" });
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
      await expect(page.getByText("All jobs completed!")).toBeVisible();
    });
  });

  // ── Settings UI Controls ─────────────────────────────────

  test.describe("Settings UI Controls", () => {

    test.beforeEach(async ({ page }) => {
      await startCoverage(page);
      await page.getByTitle("Settings").click();
    });

    test("theme selector changes theme", async ({ page }) => {
      await page.locator("#themeSelector").selectOption("solar");
      const val = await page.evaluate(() => localStorage.getItem("planmydays_theme"));
      expect(val).toBe("solar");
    });

    test("theme fallback on unknown value", async ({ page }) => {
      await page.evaluate(() => localStorage.setItem("planmydays_theme", "nonexistent"));
      await page.reload();
      await page.getByTitle("Settings").click();
      const linkHref = await page.evaluate(() => {
        const link = document.getElementById("bootstrap-theme-css");
        return link ? link.getAttribute("href") : "";
      });
      expect(linkHref).toContain("darkly");
    });

    test("font size normal removes size class", async ({ page }) => {
      await page.locator("#fontSizeSelector").selectOption("small");
      await page.locator("#fontSizeSelector").selectOption("normal");
      const hasSmall = await page.evaluate(() => document.body.classList.contains("font-size-small"));
      expect(hasSmall).toBe(false);
    });

    test("icon size medium and large change body class", async ({ page }) => {
      await page.locator("#iconSizeSelector").selectOption("medium");
      let hasClass = await page.evaluate(() => document.body.classList.contains("icon-size-medium"));
      expect(hasClass).toBe(true);
      await page.locator("#iconSizeSelector").selectOption("large");
      hasClass = await page.evaluate(() => document.body.classList.contains("icon-size-large"));
      expect(hasClass).toBe(true);
    });

    test("density normal removes compact class", async ({ page }) => {
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
      await page.locator("#showDanger").check();
      await page.locator("#skipAdhocConfirm").waitFor({ state: "visible" });
      await page.locator("#skipAdhocConfirm").check();
      await page.locator("#skipAdhocConfirm").uncheck();
      const val = await page.evaluate(() => localStorage.getItem("planmydays_skipAdhocConfirm"));
      expect(val).toBe("false");
    });

    test("jan1 selector persists value", async ({ page }) => {
      await page.locator("#jan1Selector").selectOption("1");
      const val = await page.evaluate(() => localStorage.getItem("planmydays_jan1"));
      expect(val).toBe("1");
    });

    test("monday selector persists value", async ({ page }) => {
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
      await page.locator("#showDanger").check();
      await page.locator("#skipAdhocConfirm").waitFor({ state: "visible" });
      await page.locator("#skipAdhocConfirm").check();
      const val = await page.evaluate(() => localStorage.getItem("planmydays_skipAdhocConfirm"));
      expect(val).toBe("true");
    });

    test("danger zone toggle shows dev rows in dev mode", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.getByTitle("Settings").click();
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
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
    });

    test("cancel job edit hides modal", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#jobEditModal")).toBeVisible();
      await page.locator("#jobEditModal .btn-secondary").filter({ hasText: "Cancel" }).click();
      await expect(page.locator("#jobEditModal")).not.toBeVisible();
    });

    test("active toggle on job card works", async ({ page }) => {
      const cb = page.locator(".active-toggle").first();
      await cb.check();
      await expect(cb).toBeChecked();
    });

    test("add job with weekends schedule", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("WeekendJob");
      await page.getByText("Change").click();
      await page.locator("#schedWeekends").check();
      await page.locator("#scheduleModal .btn-primary").click();
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      await expect(page.getByText("WeekendJob")).toBeVisible();
    });

    test("add job with monthly schedule", async ({ page }) => {
      await page.getByRole("button", { name: "Add Job" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("MonthlyJob");
      await page.getByText("Change").click();
      await page.locator("#schedMonthly").check();
      await expect(page.locator("#schedMonthlyOptions")).toBeVisible();
      await page.locator("#scheduleModal .btn-primary").click();
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      await expect(page.getByText("MonthlyJob")).toBeVisible();
    });

    test("sleep until input exists in job edit", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#jobSleepUntil")).toBeVisible();
    });

    test("edit job and change schedule time", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobTimeHour").selectOption("14");
      await page.locator("#jobTimeMin").selectOption("30");
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      const badge = page.locator(".badge.bg-secondary").filter({ hasText: "14:30" });
      await expect(badge).toBeVisible();
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
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      const colorInput = page.locator('#imageEditModal input[type="color"]').nth(1);
      await colorInput.fill("#00ff00");
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images"));
        return images[0].data;
      });
      expect(data).toContain("%2300ff00");
    });

    test("line none checkbox clears stroke", async ({ page }) => {
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator('#imageEditModal input[type="checkbox"]').first().check();
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images"));
        return images[0].data;
      });
      expect(data).toContain("none");
    });

    test("fill none checkbox clears fill", async ({ page }) => {
      await page.locator(".card:has-text('EditTest') .btn-primary").first().click();
      await page.locator("#imageEditModal").waitFor({ state: "visible" });
      await page.locator('#imageEditModal input[type="checkbox"]').nth(1).check();
      await page.waitForTimeout(300);
      const data = await page.evaluate(() => {
        const images = JSON.parse(localStorage.getItem("planmydays_images"));
        return images[0].data;
      });
      expect(data).toContain("none");
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
      await expect(okBtn).toBeDisabled();
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
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Choose" }).click();
      await expect(page.locator("#imagePickerModal")).toBeVisible();
    });

    test("selecting image sets name in stream editor", async ({ page }) => {
      await page.locator(".image-picker-item").first().click();
      await page.waitForTimeout(300);
      const name = await page.evaluate(() => editBuffer?.image || "");
      expect(name).toBe("PickMe");
    });

    test("search filters picker items", async ({ page }) => {
      await page.locator(".image-picker-search").fill("PickMeToo");
      await page.locator(".image-picker-item:has-text('PickMeToo')").waitFor({ state: "visible" });
      await expect(page.locator(".image-picker-item").filter({ hasText: /^PickMeToo$/ })).toBeVisible();
      await expect(page.locator(".image-picker-item").filter({ hasText: /^PickMe$/ })).not.toBeVisible();
    });

    test("clear button resets picker search", async ({ page }) => {
      await page.locator(".image-picker-search").fill("PickMeToo");
      await page.getByRole("button", { name: "Clear" }).click();
      await expect(page.locator(".image-picker-item").filter({ hasText: /^PickMe$/ })).toBeVisible();
    });

    test("closing picker with cancel button", async ({ page }) => {
      await page.locator("#imagePickerModal .btn-outline-secondary").last().click();
      await expect(page.locator("#imagePickerModal")).not.toBeVisible();
    });

    test("no image button clears image in editor", async ({ page }) => {
      await page.getByText("No Image").click();
      await page.waitForTimeout(300);
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
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
    });

    test("every day schedule shows correct text", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await expect(page.locator("#jobScheduleText")).toContainText("Every day");
    });

    test("weekdays schedule option", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByText("Change").click();
      await page.locator("#schedWeekdays").check();
      await page.locator("#scheduleModal .btn-primary").click();
      await expect(page.locator("#jobScheduleText")).toContainText("Weekdays");
    });

    test("specific days schedule", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByText("Change").click();
      await page.locator("#schedDays").check();
      await page.locator("#schedDay0").check();
      await page.locator("#schedDay6").check();
      await page.locator("#scheduleModal .btn-primary").click();
      await expect(page.locator("#jobScheduleText")).toContainText("Sun");
      await expect(page.locator("#jobScheduleText")).toContainText("Sat");
    });

    test("monthly schedule option", async ({ page }) => {
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByText("Change").click();
      await page.locator("#schedMonthly").check();
      await page.locator("#schedMonthlyDay").selectOption("15");
      await page.locator("#scheduleModal .btn-primary").click();
      await expect(page.locator("#jobScheduleText")).toContainText("15th");
    });
  });

  // ── Dev Mode UI ─────────────────────────────────────────────

  test.describe("Dev Mode UI", () => {

    test("dev mode today changes date displayed", async ({ page }) => {
      await page.goto("/?dev=true");
      await page.getByTitle("Settings").click();
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
      await page.locator("#imageEditModal .btn-secondary").filter({ hasText: "Cancel" }).click();
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
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Choose" }).click();
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
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.getByRole("button", { name: "Choose" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await page.locator(".image-picker-search").fill("ZZZZNOTHING");
      await expect(page.getByText("No images match your search.")).toBeVisible();
    });
  });

  // ── Ad Hoc Confirm Removal ─────────────────────────────────

  test.describe("Ad Hoc Confirm Removal", () => {

    test("confirming removal deletes adhoc job", async ({ page }) => {
      await page.getByText("+ Add card").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("RemoveMe");
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "hidden" });
      await page.evaluate(() => {
        const cb = document.querySelector('.job-checkbox');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
      });
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmBtn").click();
      await page.waitForTimeout(500);
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
            sequence: 1, sleepUntil: ds, suffix: false, dayType: "dayOfYear", mod: ""
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
            sequence: 1, sleepUntil: ys, suffix: false, dayType: "dayOfYear", mod: ""
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
            sequence: 1, schedule: { type: "weekends" }, suffix: false, dayType: "dayOfYear", mod: ""
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
            sequence: 1, schedule: { type: "weekdays" }, suffix: false, dayType: "dayOfYear", mod: ""
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
            sequence: 1, schedule: { type: "days", days: [todayNum] }, suffix: false, dayType: "dayOfYear", mod: ""
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
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        const todayDate = new Date().getDate();
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "MonthlyJobShow", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "monthly", date: todayDate }, suffix: false, dayType: "dayOfYear", mod: ""
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
      await page.evaluate(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ys = yesterday.getFullYear() + "-" + String(yesterday.getMonth()+1).padStart(2,"0") + "-" + String(yesterday.getDate()).padStart(2,"0");
        const wrongDate = new Date().getDate() === 1 ? 15 : 1;
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Test", tab: "progress", image: "", sequence: 1,
          jobs: [{
            id: "job_1", title: "MonthlyJobHide", active: true, frequency: "daily",
            sequence: 1, schedule: { type: "monthly", date: wrongDate }, suffix: false, dayType: "dayOfYear", mod: ""
          }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify([]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await expect(page.getByText("MonthlyJobHide")).not.toBeVisible();
    });
  });

  // ── Data Danger Zone ───────────────────────────────────────

  test.describe("Data Danger Zone", () => {

    test("regenerate tiles rebuilds the today list", async ({ page }) => {
      await seedTodayList(page);
      await page.reload();
      await page.getByTitle("Settings").click();
      await page.locator("#showDanger").check();
      await page.locator("#regenerateTilesRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Regenerate Today's Tiles" }).click();
      await page.waitForTimeout(800);
      await expect(page.getByText("Report").first()).toBeVisible();
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
      await page.locator("#showDanger").check();
      await page.locator("#clearAllDataRow").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Clear All Data" }).click();
      await expect(page.locator("#deleteConfirmModal")).toBeVisible();
      await page.locator("#deleteConfirmBtn").click();
      await expect(page.locator("#deleteConfirmModal")).not.toBeVisible({ timeout: 5000 });
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
          jobs: [{ id: "job_1", title: "CarryOverJob", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "" }]
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
          jobs: [{ id: "job_1", title: "DomJob", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfMonth", mod: "" }]
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
          jobs: [{ id: "job_1", title: "DowJob", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfWeek", mod: "" }]
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
          jobs: [{ id: "job_1", title: "Jan1Job", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "" }]
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
          jobs: [{ id: "job_1", title: "Mod2", active: true, frequency: "daily", sequence: 1, suffix: true, dayType: "dayOfYear", mod: "2" }]
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
            { id: "job_1", title: "Late", active: true, frequency: "daily", sequence: 1, time: "15:00", suffix: false, dayType: "dayOfYear", mod: "" },
            { id: "job_2", title: "Early", active: true, frequency: "daily", sequence: 2, time: "08:00", suffix: false, dayType: "dayOfYear", mod: "" },
            { id: "job_3", title: "Mid", active: true, frequency: "daily", sequence: 3, time: "12:00", suffix: false, dayType: "dayOfYear", mod: "" }
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
      await page.locator("#showDanger").check();
      await page.locator("#devTodayRow").waitFor({ state: "visible" });
      await expect(page.locator(".flatpickr-input")).toHaveCount(2);
    });
  });

  // ── Top-Level: Streams Editor Interaction ────────────────

  test.describe("Top-Level: Streams Editor", () => {

    test("open streams editor, add stream, cancel edit", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "MyStream", tab: "progress", image: "", sequence: 1, jobs: []
        }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await expect(page.locator("#streamsEditor")).toBeVisible();
      await expect(page.getByText("MyStream")).toBeVisible();
      await page.getByRole("button", { name: "Add Stream" }).click();
      await expect(page.locator("#streamEditModal")).toBeVisible();
      await page.locator("#streamEditModal .btn-secondary").filter({ hasText: "Cancel" }).click();
      await page.locator("#streamEditModal").waitFor({ state: "hidden" });
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
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-primary").filter({ hasText: "Edit" }).click();
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
          jobs: [{ id: "job_1", title: "Task1", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "" }]
        }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).click();
      await expect(page.locator("#jobsEditor")).toBeVisible();
      await expect(page.getByText("Task1")).toBeVisible();
    });

    test("add new job via jobs editor", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Existing", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "" }]
        }]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).click();
      await page.getByRole("button", { name: "Add Job" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.locator("#jobEditModalBody .form-control").first().fill("NewTask");
      await page.locator("#jobEditModal .btn-success").filter({ hasText: "OK" }).click();
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
          jobs: [{ id: "job_1", title: "RegenJob", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "" }]
        }]));
        localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1"]));
        localStorage.setItem("planmydays_last_gen", ys);
        localStorage.setItem("planmydays_completed", JSON.stringify([]));
      });
      await page.reload();
      await page.getByTitle("Settings").click();
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
          jobs: [{ id: "job_1", title: "Report", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "" }]
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "TestImg", data: "" },
          { name: "TestImg2", data: "" }
        ]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Choose" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await expect(page.locator("#imagePickerModal")).toBeVisible();
      await page.locator(".image-picker-item").first().click();
      await page.waitForTimeout(300);
      const img = await page.evaluate(() => jobsBuffer?.image || "");
      expect(img).toBe("TestImg");
    });

    test("selecting image from add job modal is blocked by jobEditModal backdrop", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Existing", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "" }]
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "AddJobImg", data: "" }
        ]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
      await page.getByRole("button", { name: "Add Job" }).click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Choose" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await expect(page.locator("#imagePickerModal")).toBeVisible();
      await page.locator(".image-picker-item").first().click();
      await page.waitForTimeout(300);
      const img = await page.evaluate(() => jobsBuffer?.image || "");
      expect(img).toBe("AddJobImg");
    });

    test("searching images from job edit modal is blocked by jobEditModal backdrop", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_streams", JSON.stringify([{
          id: "stream_1", title: "Work", tab: "progress", image: "", sequence: 1,
          jobs: [{ id: "job_1", title: "Report", active: true, frequency: "daily", sequence: 1, suffix: false, dayType: "dayOfYear", mod: "" }]
        }]));
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "Apple", data: "" },
          { name: "Banana", data: "" }
        ]));
      });
      await page.reload();
      await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
      await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
      await page.locator("#streamEditorList .btn-info").filter({ hasText: "Jobs" }).first().click();
      await page.locator("#jobsList .btn-primary").filter({ hasText: "Edit" }).first().click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Choose" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await page.locator(".image-picker-search").fill("Banana");
      const banana = page.locator(".image-picker-item").filter({ hasText: "Banana" });
      await banana.waitFor({ state: "visible", timeout: 3000 });
      const apple = page.locator(".image-picker-item").filter({ hasText: "Apple" });
      await expect(apple).not.toBeVisible();
    });
  });

  // ── Modal Stacking: Image Picker from Front Page Add Card ─

  test.describe("Modal Stacking: Image Picker from Front Page Add Card", () => {

    test("selecting image from front page add card is blocked by jobEditModal backdrop", async ({ page }) => {
      await page.evaluate(() => {
        localStorage.setItem("planmydays_images", JSON.stringify([
          { name: "FrontImg", data: "" }
        ]));
      });
      await page.reload();
      await page.getByText("+ Add card").click();
      await page.locator("#jobEditModal").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Choose" }).click();
      await page.locator("#imagePickerModal").waitFor({ state: "visible" });
      await expect(page.locator("#imagePickerModal")).toBeVisible();
      await page.locator(".image-picker-item").first().click();
      await page.waitForTimeout(300);
      const img = await page.evaluate(() => jobsBuffer?.image || "");
      expect(img).toBe("FrontImg");
    });
  });
});
