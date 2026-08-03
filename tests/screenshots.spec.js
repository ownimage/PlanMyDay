const { test } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const sampleImagesData = require("../sampleImages.json");

const TEST_STREAMS = [
  {
    id: "stream_1",
    title: "Work",
    description: "Work tasks",
    tab: "progress",
    image: "Work 1",
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
        image: "Computer",
        tasks: []
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
        mod: "",
        image: "Planning",
        tasks: []
      }
    ]
  },
  {
    id: "stream_2",
    title: "Chores",
    description: "Household chores",
    tab: "maintenance",
    image: "Home 1",
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
        mod: "",
        image: "Home",
        tasks: []
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
        mod: "1",
        image: "Checklist",
        tasks: []
      }
    ]
  },
  {
    id: "stream_3",
    title: "Fitness",
    description: "Exercise routines",
    tab: "progress",
    image: "Fitness 1",
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
        image: "Running Shoe",
        tasks: [],
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
        mod: "",
        image: "Fitness 2",
        tasks: []
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
  await page.evaluate(({ css, bsTheme, name }) => {
    const link = document.getElementById("bootstrap-theme-css");
    if (link) link.href = css;
    document.documentElement.setAttribute("data-bs-theme", bsTheme);
    document.documentElement.setAttribute("data-theme", name);
  }, { css: config.css, bsTheme: config.bsTheme, name: themeName });
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

  test.use({
    viewport: { width: 390, height: 797 },
    deviceScaleFactor: 3,
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "devicePixelRatio", {
        get: () => 3,
        configurable: true,
      });
    });
    await page.goto("/");
    await page.evaluate((images) => {
      localStorage.clear();
      localStorage.setItem("planmydays_fontSize", "xsmall");
      localStorage.setItem("planmydays_iconSize", "small");
      localStorage.setItem("planmydays_density", "compact");
      localStorage.setItem("planmydays_images", JSON.stringify(images));
    }, sampleImagesData.images);
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
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

  test("settings - appearance", async ({ page }) => {
    await page.reload();
    await page.getByTitle("Settings").click();
    await page.waitForSelector("#settingsPage:not(.d-none)");
    await page.locator("#appearance-tab").click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "settings-appearance.png");
  });

  test("settings - schedule", async ({ page }) => {
    await page.reload();
    await page.getByTitle("Settings").click();
    await page.waitForSelector("#settingsPage:not(.d-none)");
    await page.locator("#schedule-tab").click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "settings-schedule.png");
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
    await page.locator("#streamEditorList .stream-header-main").first().click();
    await page.locator("#streamEditorList .accordion-collapse.show").waitFor({ state: "visible", timeout: 5000 });
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

  async function openViewJobWithData(page) {
    await page.evaluate((data) => {
      var streams = JSON.parse(JSON.stringify(data));
      streams[0].jobs[0].tasks = [
        { description: "Check deployment logs", done: true },
        { description: "Update test fixtures", done: false },
        { description: "Review pull request", done: false }
      ];
      streams[0].jobs[0].time = "09:00";
      streams[0].jobs[0].sleepUntil = "";
      streams[0].jobs[0].description = "Complete weekly development report with metrics and analysis";
      streams[0].jobs[0].suffix = true;
      var now = new Date();
      var ds = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
      localStorage.setItem("planmydays_streams", JSON.stringify(streams));
      localStorage.setItem("planmydays_today_order", JSON.stringify(["job_1", "job_2", "job_3"]));
      localStorage.setItem("planmydays_last_gen", ds);
      localStorage.setItem("planmydays_completed", JSON.stringify([]));
    }, TEST_STREAMS);
    await page.reload();
    await page.waitForSelector(".today-drag-card");
    await page.locator(".job-view-btn").first().click();
    await page.locator("#jobEditModal").waitFor({ state: "visible" });
    await page.waitForTimeout(400);
  }

  test("view job modal - general tab", async ({ page }) => {
    await openViewJobWithData(page);
    await screenshotAllThemes(page, "view-job-general.png");
  });

  test("view job modal - schedule tab", async ({ page }) => {
    await openViewJobWithData(page);
    await page.locator("#jobSchedule-tab").click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "view-job-schedule.png");
  });

  test("view job modal - tasks tab", async ({ page }) => {
    await openViewJobWithData(page);
    await page.locator("#jobTasks-tab").click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "view-job-tasks.png");
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
    await page.locator("#jobSchedule-tab").click();
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
    await page.evaluate(() => {
      if (typeof uploadStandardImages === "function") uploadStandardImages();
    });
    await page.locator("#mainNav .dropdown-toggle").filter({ hasText: "Edit" }).click();
    await page.locator("a.dropdown-item").filter({ hasText: "Images" }).click();
    await page.locator("#imagesList").waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(400);
    await screenshotAllThemes(page, "edit-images.png");
  });

  async function openJobEditWithTasks(page) {
    await page.evaluate((data) => {
      var streams = JSON.parse(JSON.stringify(data));
      streams[0].jobs[0].tasks = [
        { description: "Check deployment logs", done: true },
        { description: "Update test fixtures", done: false },
        { description: "Review pull request", done: false }
      ];
      streams[0].jobs[0].time = "09:00";
      streams[0].jobs[0].sleepUntil = "";
      streams[0].jobs[0].description = "Complete weekly development report with metrics and analysis";
      localStorage.setItem("planmydays_streams", JSON.stringify(streams));
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
  }

  test("job edit modal - general tab", async ({ page }) => {
    await openJobEditWithTasks(page);
    await screenshotAllThemes(page, "job-edit-general.png");
  });

  test("job edit modal - schedule tab", async ({ page }) => {
    await openJobEditWithTasks(page);
    await page.locator("#jobSchedule-tab").click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "job-edit-schedule.png");
  });

  test("job edit modal - tasks tab", async ({ page }) => {
    await openJobEditWithTasks(page);
    await page.locator("#jobTasks-tab").click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "job-edit-tasks.png");
  });

  test("settings - minio", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("planmydays_minio_enabled", "true");
      localStorage.setItem("planmydays_minio_server", "http://minio.local:9000");
      localStorage.setItem("planmydays_minio_username", "minioadmin");
      localStorage.setItem("planmydays_minio_password", "••••••••");
      localStorage.setItem("planmydays_minio_bucket", "pmd");
    });
    await page.reload();
    await page.getByTitle("Settings").click();
    await page.waitForSelector("#settingsPage:not(.d-none)");
    await page.locator("#minio-tab").click();
    await page.waitForTimeout(300);
    await screenshotAllThemes(page, "settings-minio.png");
  });

  test("import from minio", async ({ page }) => {
    await page.route(function(url) { return url.hostname === "minio.local" && url.port === "9000"; }, async function(route) {
      var body = ['<?xml version="1.0" encoding="UTF-8"?>',
        '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">',
        '<Name>pmd</Name><KeyCount>3</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated>',
        '<Contents><Key>planmydays-20260801.json</Key><LastModified>2026-08-01T10:00:00.000Z</LastModified><ETag>"abc"</ETag><Size>1024</Size><StorageClass>STANDARD</StorageClass></Contents>',
        '<Contents><Key>planmydays-20260731.json</Key><LastModified>2026-07-31T18:00:00.000Z</LastModified><ETag>"def"</ETag><Size>2048</Size><StorageClass>STANDARD</StorageClass></Contents>',
        '<Contents><Key>planmydays-20260720.json</Key><LastModified>2026-07-20T08:00:00.000Z</LastModified><ETag>"ghi"</ETag><Size>1536</Size><StorageClass>STANDARD</StorageClass></Contents>',
        '</ListBucketResult>'].join("");
      await route.fulfill({ status: 200, body: body });
    });
    await page.evaluate(() => {
      localStorage.setItem("planmydays_minio_enabled", "true");
      localStorage.setItem("planmydays_minio_server", "http://minio.local:9000");
      localStorage.setItem("planmydays_minio_username", "minioadmin");
      localStorage.setItem("planmydays_minio_password", "••••••••");
      localStorage.setItem("planmydays_minio_bucket", "pmd");
    });
    await page.reload();
    await page.evaluate(() => importFromMinio());
    await page.waitForSelector("#minioImportModal");
    await page.waitForTimeout(400);
    await screenshotAllThemes(page, "import-minio.png");
  });
});
