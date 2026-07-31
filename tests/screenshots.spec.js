const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

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
      }
    ]
  },
  {
    id: "stream_2",
    title: "Chores",
    description: "Household chores",
    tab: "maintenance",
    image: "",
    sequence: 2,
    jobs: [
      {
        id: "job_4",
        title: "Dishes",
        description: "Wash dishes",
        active: true,
        frequency: "daily",
        sequence: 1,
        suffix: false,
        dayType: "dayOfYear",
        mod: ""
      },
      {
        id: "job_5",
        title: "Laundry",
        description: "Do laundry",
        active: true,
        frequency: "weekly",
        sequence: 2,
        suffix: false,
        dayType: "dayOfYear",
        mod: "1"
      }
    ]
  },
  {
    id: "stream_3",
    title: "Fitness",
    description: "Exercise routines",
    tab: "progress",
    image: "",
    sequence: 3,
    jobs: [
      {
        id: "job_3",
        title: "Run",
        description: "Morning run",
        active: true,
        frequency: "daily",
        sequence: 1,
        suffix: false,
        dayType: "dayOfYear",
        mod: "",
        sleepUntil: "",
        time: "07:00"
      },
      {
        id: "job_6",
        title: "Gym",
        description: "Weight training",
        active: false,
        frequency: "weekdays",
        sequence: 2,
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

const bw = "https://cdn.jsdelivr.net/npm/bootswatch@5.3.3/dist";
const THEME_CONFIG = {
  cerulean:  { css: `${bw}/cerulean/bootstrap.min.css`,   bsTheme: "light" },
  cosmo:     { css: `${bw}/cosmo/bootstrap.min.css`,      bsTheme: "light" },
  cyborg:    { css: `${bw}/cyborg/bootstrap.min.css`,     bsTheme: "dark" },
  darkly:    { css: `${bw}/darkly/bootstrap.min.css`,     bsTheme: "dark" },
  flatly:    { css: `${bw}/flatly/bootstrap.min.css`,     bsTheme: "light" },
  journal:   { css: `${bw}/journal/bootstrap.min.css`,    bsTheme: "light" },
  litera:    { css: `${bw}/litera/bootstrap.min.css`,     bsTheme: "light" },
  lumen:     { css: `${bw}/lumen/bootstrap.min.css`,      bsTheme: "light" },
  lux:       { css: `${bw}/lux/bootstrap.min.css`,        bsTheme: "light" },
  materia:   { css: `${bw}/materia/bootstrap.min.css`,    bsTheme: "light" },
  minty:     { css: `${bw}/minty/bootstrap.min.css`,      bsTheme: "light" },
  morph:     { css: `${bw}/morph/bootstrap.min.css`,      bsTheme: "light" },
  pulse:     { css: `${bw}/pulse/bootstrap.min.css`,      bsTheme: "light" },
  quartz:    { css: `${bw}/quartz/bootstrap.min.css`,     bsTheme: "light" },
  sandstone: { css: `${bw}/sandstone/bootstrap.min.css`,  bsTheme: "light" },
  simplex:   { css: `${bw}/simplex/bootstrap.min.css`,    bsTheme: "light" },
  sketchy:   { css: `${bw}/sketchy/bootstrap.min.css`,    bsTheme: "light" },
  slate:     { css: `${bw}/slate/bootstrap.min.css`,      bsTheme: "dark" },
  solar:     { css: `${bw}/solar/bootstrap.min.css`,      bsTheme: "dark" },
  spacelab:  { css: `${bw}/spacelab/bootstrap.min.css`,   bsTheme: "light" },
  superhero: { css: `${bw}/superhero/bootstrap.min.css`,  bsTheme: "dark" },
  united:    { css: `${bw}/united/bootstrap.min.css`,     bsTheme: "light" },
  vapor:     { css: `${bw}/vapor/bootstrap.min.css`,      bsTheme: "dark" },
  yeti:      { css: `${bw}/yeti/bootstrap.min.css`,       bsTheme: "light" },
  zephyr:    { css: `${bw}/zephyr/bootstrap.min.css`,     bsTheme: "light" }
};
const THEMES = Object.keys(THEME_CONFIG);

async function setTheme(page, themeName) {
  const config = THEME_CONFIG[themeName] || THEME_CONFIG.darkly;
  await page.evaluate(({ css, bsTheme }) => {
    const link = document.getElementById("bootstrap-theme-css");
    if (link) link.href = css;
    document.documentElement.setAttribute("data-bs-theme", bsTheme);
  }, { css: config.css, bsTheme: config.bsTheme });
}

async function screenshotAllThemes(page, fileName) {
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await page.waitForTimeout(300);
    const themeDir = path.join(SCREENSHOT_DIR, theme);
    fs.mkdirSync(themeDir, { recursive: true });
    await page.screenshot({ path: path.join(themeDir, fileName), fullPage: false });
  }
}

function seedMainView(page) {
  return page.evaluate(({ data, ds }) => {
    localStorage.setItem("planmydays_streams", JSON.stringify(data));
    localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_2", "job_4", "job_3", "job_5", "job_6"]));
    localStorage.setItem("planmydays_last_gen", ds);
    localStorage.setItem("planmydays_completed", JSON.stringify([]));
  }, { data: TEST_STREAMS, ds: todayStr });
}

test.describe("PlanMyDay - Screenshots", () => {

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 1000 });
    await page.goto("/");
    await page.evaluate(() => { localStorage.clear(); });
  });

  test("main view", async ({ page }) => {
    await seedMainView(page);
    await page.reload();
    await page.waitForSelector(".today-drag-card");
    await screenshotAllThemes(page, "main-view.png");
  });

  test("main view - split list progress", async ({ page }) => {
    await seedMainView(page);
    await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
    await page.reload();
    await page.waitForSelector(".today-drag-card");
    await screenshotAllThemes(page, "main-view-split-progress.png");
  });

  test("main view - split list maintenance", async ({ page }) => {
    await seedMainView(page);
    await page.evaluate(() => localStorage.setItem("planmydays_splitList", "true"));
    await page.reload();
    await page.waitForSelector(".today-drag-card");
    await page.locator("button.nav-link").filter({ hasText: "Maintenance" }).click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "main-view-split-maintenance.png");
  });

  test("main view - hide done", async ({ page }) => {
    await seedMainView(page);
    await page.evaluate(() => {
      localStorage.setItem("planmydays_completed", JSON.stringify(["job_1", "job_3"]));
      localStorage.setItem("planmydays_hideDone", "true");
    });
    await page.reload();
    await page.waitForSelector(".today-drag-card");
    await screenshotAllThemes(page, "main-view-hide-done.png");
  });

  test("add card modal", async ({ page }) => {
    await seedMainView(page);
    await page.reload();
    await page.getByText("+ Add job").click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await screenshotAllThemes(page, "main-screen-add-job.png");
  });

  test("settings", async ({ page }) => {
    await page.reload();
    await page.getByTitle("Settings").click();
    await page.waitForSelector("#settingsPage:not(.d-none)");
    await screenshotAllThemes(page, "settings.png");
  });

  test("settings - danger zone", async ({ page }) => {
    await page.reload();
    await page.getByTitle("Settings").click();
    await page.waitForSelector("#settingsPage:not(.d-none)");
    await page.locator("#danger-tab").click();
    await page.locator("#showDanger").check();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "settings-danger.png");
  });

  test("streams editor", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
    await page.waitForSelector("#streamEditorList .accordion-item");
    await screenshotAllThemes(page, "edit-streams.png");
  });

  test("add stream modal", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
    await page.waitForSelector("#streamEditorList .accordion-item");
    await page.getByRole("button", { name: "Add Stream" }).click();
    await page.locator("#streamEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await screenshotAllThemes(page, "add-stream.png");
  });

  test("jobs editor", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
    await page.waitForSelector("#streamEditorList .accordion-item");
    await page.locator("#streamEditorList .stream-header-main").first().click();
    await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    await page.waitForSelector("#streamEditorList .accordion-body .card");
    await screenshotAllThemes(page, "stream-job-list.png");
  });

  test("add job modal", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
    await page.waitForSelector("#streamEditorList .accordion-item");
    await page.locator("#streamEditorList .stream-header-main").first().click();
    await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    await page.getByRole("button", { name: "Add Job" }).first().click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await screenshotAllThemes(page, "stream-add-job.png");
  });

  test("view job modal", async ({ page }) => {
    await seedMainView(page);
    await page.reload();
    await page.waitForSelector(".today-drag-card");
    await page.locator(".job-view-btn").first().click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await screenshotAllThemes(page, "view-job.png");
  });

  test("edit job modal", async ({ page }) => {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
    await page.waitForSelector("#streamEditorList .accordion-item");
    await page.locator("#streamEditorList .stream-header-main").first().click();
    await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    await page.locator("#streamEditorList .accordion-body .card").first().getByRole("button", { name: "Edit" }).click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
    await screenshotAllThemes(page, "edit-job.png");
  });

  async function openScheduleModalFromJobEdit(page) {
    await page.evaluate((data) => {
      localStorage.setItem("planmydays_streams", JSON.stringify(data));
    }, TEST_STREAMS);
    await page.reload();
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Jobs" }).click();
    await page.waitForSelector("#streamEditorList .accordion-item");
    await page.locator("#streamEditorList .stream-header-main").first().click();
    await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
    await page.locator("#streamEditorList .accordion-body .card").first().getByRole("button", { name: "Edit" }).click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.locator("#btnScheduleChange").click();
    await page.locator("#scheduleModal").waitFor({ state: "visible" });
    await page.waitForTimeout(300);
  }

  test("schedule modal - every day", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedDaily").check();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "schedule-every-day.png");
  });

  test("schedule modal - every n days", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedNDays").check();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "schedule-every-n-days.png");
  });

  test("schedule modal - weekdays", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedWeekdays").check();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "schedule-weekdays.png");
  });

  test("schedule modal - weekends", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedWeekends").check();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "schedule-weekends.png");
  });

  test("schedule modal - specific days", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedDays").check();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "schedule-specific-days.png");
  });

  test("schedule modal - day of month", async ({ page }) => {
    await openScheduleModalFromJobEdit(page);
    await page.locator("#schedMonthly").check();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "schedule-day-of-month.png");
  });

  test("images editor", async ({ page }) => {
    await page.reload();
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
    await page.waitForSelector("#imagesList .card");
    await screenshotAllThemes(page, "edit-images.png");
  });
});
