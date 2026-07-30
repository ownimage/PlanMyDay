const { test, expect } = require("@playwright/test");
const path = require("path");

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
        description: "Standup meeting",
        active: true,
        frequency: "weekdays",
        sequence: 2,
        suffix: false,
        dayType: "dayOfYear",
        mod: ""
      },
      {
        id: "job_4",
        title: "Code Review",
        description: "Review pull requests",
        active: true,
        frequency: "weekdays",
        sequence: 3,
        suffix: true,
        dayType: "dayOfYear",
        mod: "2"
      }
    ]
  },
  {
    id: "stream_2",
    title: "Chores",
    description: "Household tasks",
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
      },
      {
        id: "job_5",
        title: "Dishes",
        description: "Wash the dishes",
        active: true,
        frequency: "daily",
        sequence: 2,
        suffix: false,
        dayType: "dayOfYear",
        mod: ""
      }
    ]
  },
  {
    id: "stream_3",
    title: "Fitness",
    description: "",
    tab: "progress",
    image: "",
    sequence: 3,
    jobs: [
      {
        id: "job_6",
        title: "Morning Run",
        description: "Run 5km",
        active: false,
        frequency: "daily",
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

const SCREENSHOT_DIR = path.resolve(__dirname, "..", "screenshots");

test.describe("PlanMyDay - Screenshots", () => {

  test.describe.configure({ mode: "serial" });

  async function setTheme(page) {
    await page.evaluate(() => {
      const link = document.getElementById("bootstrap-theme-css");
      if (link) link.href = "https://cdn.jsdelivr.net/npm/bootswatch@5.3.3/dist/superhero/bootstrap.min.css";
      document.documentElement.setAttribute("data-bs-theme", "dark");
      localStorage.setItem("theme", "superhero");
    });
  }

  function seedMainView(page) {
    return page.evaluate(({ data, ds }) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
      localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_2", "job_4", "job_3", "job_5", "job_6"]));
      localStorage.setItem("planmydays_last_gen", ds);
      localStorage.setItem("planmydays_completed", JSON.stringify([]));
    }, { data: TEST_STREAMS, ds: todayStr });
  }

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => { localStorage.clear(); });
  });

  test("main view", async ({ page }) => {
    await seedMainView(page);
    await page.reload();
    await setTheme(page);
    await page.waitForSelector(".today-drag-card");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "main-view.png"), fullPage: false });
  });

  test("main view - split list progress", async ({ page }) => {
    await seedMainView(page);
    await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
    await page.reload();
    await setTheme(page);
    await page.waitForSelector(".today-drag-card");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "main-view-split-progress.png"), fullPage: false });
  });

  test("main view - split list maintenance", async ({ page }) => {
    await seedMainView(page);
    await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
    await page.reload();
    await setTheme(page);
    await page.waitForSelector(".today-drag-card");
    await page.locator("button.nav-link").filter({ hasText: "Maintenance" }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "main-view-split-maintenance.png"), fullPage: false });
  });

  test("main view - hide done", async ({ page }) => {
    await seedMainView(page);
    await page.evaluate(() => {
      localStorage.setItem("planmydays_completed", JSON.stringify(["job_1", "job_3"]));
      localStorage.setItem("planmydays_hideDone", "true");
    });
    await page.reload();
    await setTheme(page);
    await page.waitForSelector(".today-drag-card");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "main-view-hide-done.png"), fullPage: false });
  });

  test("add card modal", async ({ page }) => {
    await seedMainView(page);
    await page.reload();
    await setTheme(page);
    await page.getByText("+ Add job").click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "main-screen-add-job.png"), fullPage: false });
  });

  test("settings", async ({ page }) => {
    await page.reload();
    await setTheme(page);
    await page.getByTitle("Settings").click();
    await page.waitForSelector("#settingsPage:not(.d-none)");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "settings.png"), fullPage: false });
  });

  test("settings - danger zone", async ({ page }) => {
    await page.reload();
    await setTheme(page);
    await page.getByTitle("Settings").click();
    await page.waitForSelector("#settingsPage:not(.d-none)");
    await page.locator("#danger-tab").click();
    await page.locator("#showDanger").check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "settings-danger.png"), fullPage: false });
  });

  test("streams editor", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await setTheme(page);
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
    await page.waitForSelector("#streamEditorList .card");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "edit-streams.png"), fullPage: false });
  });

  test("add stream modal", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await setTheme(page);
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
    await page.waitForSelector("#streamEditorList .card");
    await page.getByRole("button", { name: "Add Stream" }).click();
    await page.locator("#streamEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "add-stream.png"), fullPage: false });
  });

  test("jobs editor", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await setTheme(page);
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
    await page.waitForSelector("#streamEditorList .card");
    await page.locator("#streamEditorList .card").first().getByRole("button", { name: "Jobs" }).click();
    await page.waitForSelector("#jobsList .card");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "stream-job-list.png"), fullPage: false });
  });

  test("add job modal", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await setTheme(page);
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
    await page.waitForSelector("#streamEditorList .card");
    await page.locator("#streamEditorList .card").first().getByRole("button", { name: "Jobs" }).click();
    await page.waitForSelector("#jobsList .card");
    await page.getByRole("button", { name: "Add Job" }).click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "stream-add-job.png"), fullPage: false });
  });

  test("edit job modal", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await setTheme(page);
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
    await page.waitForSelector("#streamEditorList .card");
    await page.locator("#streamEditorList .card").first().getByRole("button", { name: "Jobs" }).click();
    await page.waitForSelector("#jobsList .card");
    await page.locator("#jobsList .card").first().getByRole("button", { name: "Edit" }).click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "edit-job.png"), fullPage: false });
  });

  async function openScheduleModalFromJobEdit(page) {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await setTheme(page);
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Streams" }).click();
    await page.waitForSelector("#streamEditorList .card");
    await page.locator("#streamEditorList .card").first().getByRole("button", { name: "Jobs" }).click();
    await page.waitForSelector("#jobsList .card");
    await page.locator("#jobsList .card").first().getByRole("button", { name: "Edit" }).click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.getByText("Change").click();
    await page.locator("#scheduleModal").waitFor({ state: "visible" });
    await page.waitForTimeout(300);
  }

  test("schedule modal - every day", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedDaily").check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "schedule-every-day.png"), fullPage: false });
  });

  test("schedule modal - every n days", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedNDays").check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "schedule-every-n-days.png"), fullPage: false });
  });

  test("schedule modal - weekdays", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedWeekdays").check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "schedule-weekdays.png"), fullPage: false });
  });

  test("schedule modal - weekends", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedWeekends").check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "schedule-weekends.png"), fullPage: false });
  });

  test("schedule modal - specific days", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedDays").check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "schedule-specific-days.png"), fullPage: false });
  });

  test("schedule modal - day of month", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedMonthly").check();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "schedule-day-of-month.png"), fullPage: false });
  });

  test("images editor", async ({ page }) => {
    await page.reload();
    await setTheme(page);
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
    await page.waitForSelector("#imagesList .card");
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "edit-images.png"), fullPage: false });
  });
});
