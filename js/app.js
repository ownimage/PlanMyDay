// STORAGE HELPERS
function loadDates() {
  return JSON.parse(localStorage.getItem("dates") || "[]");
}
function saveDates(dates) {
  localStorage.setItem("dates", JSON.stringify(dates));
}
function loadCategories() {
  return JSON.parse(localStorage.getItem("categories") || "[]");
}
function saveCategories(categories) {
  localStorage.setItem("categories", JSON.stringify(categories));
}
function loadImages() {
  return JSON.parse(localStorage.getItem("images") || "[]");
}
function saveImages(images) {
  localStorage.setItem("images", JSON.stringify(images));
}

// UI UTILITIES
function hideAllEditors() {
  document.getElementById("countdownContainer").classList.remove("d-none");
  document.getElementById("threadsEditor").classList.add("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
}

function updateNavState() {
  const nav = document.getElementById("mainNav");
  if (!nav) return;
  nav.classList.toggle("nav-inactive", false);
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// DATE CALCULATION
function targetDate(d) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = now.getFullYear();
  if (d.type === "once") year = d.year;
  const target = new Date(year, d.month - 1, d.day);
  if (d.type === "annual" && target < today) target.setFullYear(target.getFullYear() + 1);
  return target;
}

function daysUntil(d) {
  const target = targetDate(d);
  return Math.ceil((target - new Date()) / (1000 * 60 * 60 * 24));
}

function formatDate(date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// RENDER COUNTDOWNS
function renderCountdowns() {
  const container = document.getElementById("countdownContainer");
  if (!container) return;
  container.innerHTML = "";

  const dates = loadDates();
  const categories = loadCategories();
  const images = loadImages();

  const maxCountdowns = parseInt(localStorage.getItem("maxCountdowns") || "10", 10);
  const showAll = container.dataset.showAll === "true" || maxCountdowns === 0;

  const withDays = dates.map(d => ({ ...d, days: daysUntil(d) })).sort((a, b) => a.days - b.days);
  const todayEvents = withDays.filter(d => d.days === 0);
  const futureEvents = withDays.filter(d => d.days > 0);

  function renderCard(d) {
    const category = categories.find(c => c.name === d.category);
    const imageName = category ? category.image : null;
    const image = images.find(i => i.name === imageName);
    const imgSrc = image ? image.data : "";
    const dateImg = d.image ? images.find(i => i.name === d.image) : null;
    const dateImgSrc = dateImg ? dateImg.data : "";

    const card = document.createElement("div");
    card.className = "card countdown-card mb-2";

    const eventDate = targetDate(d);
    const format = localStorage.getItem("countdownFormat") || "days";
    const weeks = Math.floor(d.days / 7);
    const remainDays = d.days % 7;

    let displayLine1, displayLine2;
    if (format === "weeksAndDays") {
      displayLine1 = weeks > 0 ? `${weeks} week${weeks !== 1 ? "s" : ""}` : "";
      displayLine2 = remainDays > 0 ? `${remainDays} day${remainDays !== 1 ? "s" : ""}` : "";
    } else {
      displayLine1 = `${d.days}`;
      displayLine2 = `day${d.days !== 1 ? "s" : ""}`;
    }

    card.innerHTML = `
      <div class="row align-items-center">
        <div class="col-auto text-center">
          <div class="d-flex gap-1">
            <div>
              ${imgSrc ? `<img src="${imgSrc}" class="countdown-img d-block mx-auto">` : `<div class="countdown-img d-flex align-items-center justify-content-center text-secondary">No img</div>`}
              <div class="mt-1">${escapeHtml(d.category)}</div>
            </div>
            <div>
              ${dateImgSrc ? `<img src="${dateImgSrc}" class="countdown-img d-block mx-auto">` : `<div class="countdown-img"></div>`}
            </div>
          </div>
        </div>
        <div class="col">
          <h4 class="mb-1">${escapeHtml(d.name)}</h4>
          <div>${formatDate(eventDate)}</div>
        </div>
        <div class="col-auto text-center">
          <div class="h4 mb-0">${displayLine1}</div>
          ${displayLine2 ? `<div class="h4 mb-0">${displayLine2}</div>` : ""}
        </div>
      </div>
    `;
    container.appendChild(card);
  }

  if (todayEvents.length > 0) {
    const heading = document.createElement("h2");
    heading.className = "mb-3";
    heading.textContent = "Today!";
    container.appendChild(heading);
    todayEvents.forEach(renderCard);
  }

  if (futureEvents.length > 0) {
    const visible = showAll ? futureEvents : futureEvents.slice(0, maxCountdowns);
    const heading = document.createElement("h2");
    heading.className = "mb-3";
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    heading.textContent = `From ${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} :`;
    container.appendChild(heading);
    visible.forEach(renderCard);

    if (!showAll && futureEvents.length > maxCountdowns) {
      const more = document.createElement("div");
      more.className = "text-center mt-2";
      const moreBtn = document.createElement("a");
      moreBtn.href = "#";
      moreBtn.className = "btn btn-outline-primary btn-sm";
      moreBtn.textContent = `+ ${futureEvents.length - maxCountdowns} more`;
      moreBtn.onclick = e => {
        e.preventDefault();
        container.dataset.showAll = "true";
        renderCountdowns();
      };
      more.appendChild(moreBtn);
      container.appendChild(more);
    }
  }
  updateNavState();
}

// THREADS EDITOR
let editingThreadIndex = -1;
let threadEditBuffer = null;
let isNewThread = false;

function openThreadsEditor() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("threadsEditor").classList.remove("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
  renderThreadsEditor();
}

function closeThreadsEditor() {
  document.getElementById("threadsEditor").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  editingThreadIndex = -1;
  threadEditBuffer = null;
  isNewThread = false;
  renderCountdowns();
}

function renderThreadsEditor() {
  const list = document.getElementById("threadEditorList");
  const addTile = document.getElementById("addThreadTile");
  const topTile = document.getElementById("addThreadTileTop");
  const filterEl = document.getElementById("threadEditorFilters");
  const singleEditor = document.getElementById("singleThreadEditor");

  list.innerHTML = "";
  addTile.innerHTML = "";
  topTile.innerHTML = "";
  filterEl.innerHTML = "";
  singleEditor.innerHTML = "";

  const allDates = loadDates();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (editingThreadIndex >= 0) {
    list.classList.add("d-none");
    addTile.classList.add("d-none");
    topTile.classList.add("d-none");
    filterEl.classList.add("d-none");
    singleEditor.classList.remove("d-none");

    const d = allDates[editingThreadIndex];
    const data = threadEditBuffer || d;
    const showYear = data.type === "once";
    const day = data.day || 1;
    const month = data.month || 1;

    let dateHtml;
    if (showYear) {
      dateHtml = `<input type="text" class="form-control flatpickr-date" data-index="${editingThreadIndex}" data-showyear="true" placeholder="dd/mm/yyyy">`;
    } else {
      dateHtml = `
        <select class="form-select date-day-select" onchange="threadEditField('day', parseInt(this.value))">
          ${Array.from({length: 31}, (_, i) => `<option value="${i+1}" ${i+1 === day ? "selected" : ""}>${i+1}</option>`).join("")}
        </select>
        <select class="form-select date-month-select" onchange="threadEditField('month', parseInt(this.value))">
          ${months.map((m, i) => `<option value="${i+1}" ${i+1 === month ? "selected" : ""}>${m}</option>`).join("")}
        </select>`;
    }

    const heading = isNewThread ? "Add Thread" : "Edit Thread";
    singleEditor.innerHTML = `
      <div class="d-flex align-items-center mb-3">
        <h3 class="mb-0">${heading}</h3>
        <button class="btn btn-outline-secondary ms-auto" onclick="cancelThreadEdit()">Back</button>
      </div>
      <div class="card p-3 card-edited">
        <div class="mb-2">
          <label class="form-label">Name</label>
          <input class="form-control" value="${escapeHtml(data.name || "")}" oninput="threadEditField('name', this.value)">
        </div>
        <div class="d-flex mb-2 gap-2 align-items-end">
          <div class="d-flex flex-nowrap gap-1">${dateHtml}</div>
          <select class="form-select type-select" onchange="threadEditField('type', this.value)">
            <option value="annual" ${data.type === "annual" ? "selected" : ""}>Annual</option>
            <option value="once" ${data.type === "once" ? "selected" : ""}>Once</option>
          </select>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-success editor-btn" onclick="doneThreadEdit()">OK</button>
          <button class="btn btn-secondary editor-btn ms-auto" onclick="cancelThreadEdit()">Cancel</button>
        </div>
      </div>
    `;

    initThreadFlatpickr(editingThreadIndex);
    updateNavState();
    return;
  }

  list.classList.remove("d-none");
  addTile.classList.remove("d-none");
  topTile.classList.remove("d-none");
  filterEl.classList.remove("d-none");
  singleEditor.classList.add("d-none");

  const sorted = allDates.map((d, idx) => ({ d, idx })).sort((a, b) => targetDate(a.d) - targetDate(b.d));

  sorted.forEach(({ d, idx }) => {
    const showYear = d.type === "once";
    const dateStr = showYear ? `${d.day} ${months[(d.month||1)-1]} ${d.year}` : `${d.day} ${months[(d.month||1)-1]}`;
    const card = document.createElement("div");
    card.className = "card p-3 mb-3";
    card.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="flex-fill">
          <div class="fw-bold editor-title mb-1">${escapeHtml(d.name)}</div>
          <div class="mb-1">${dateStr} &middot; ${d.type}</div>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary editor-btn" onclick="editThread(${idx})">Edit</button>
          <button class="btn btn-danger editor-btn" onclick="confirmDeleteThread(${idx})">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  topTile.innerHTML = `
    <div class="d-flex gap-2">
      <button class="btn btn-primary editor-btn btn-wide" onclick="addNewThread()">Add Thread</button>
      <button class="btn btn-success editor-btn btn-wide ms-auto" onclick="closeThreadsEditor()">Done</button>
    </div>
  `;
  updateNavState();
}

function threadEditField(field, value) {
  if (!threadEditBuffer) return;
  threadEditBuffer[field] = value;
  if (field === "type") {
    if (value === "annual") {
      delete threadEditBuffer.year;
    } else {
      threadEditBuffer.year = new Date().getFullYear();
    }
    renderThreadsEditor();
  }
}

function initThreadFlatpickr(index) {
  if (typeof flatpickr === 'undefined') return;
  const input = document.querySelector(`.flatpickr-date[data-index="${index}"]`);
  if (!input) return;
  if (!threadEditBuffer) return;
  const day = threadEditBuffer.day || 1;
  const month = threadEditBuffer.month || 1;
  const year = threadEditBuffer.year || new Date().getFullYear();
  flatpickr(input, {
    dateFormat: input.dataset.showyear === 'true' ? 'd/m/Y' : 'd/m',
    defaultDate: new Date(year, month - 1, day),
    allowInput: true,
    onChange: function(selectedDates) {
      if (selectedDates.length > 0 && threadEditBuffer) {
        threadEditBuffer.day = selectedDates[0].getDate();
        threadEditBuffer.month = selectedDates[0].getMonth() + 1;
        if (input.dataset.showyear === 'true') {
          threadEditBuffer.year = selectedDates[0].getFullYear();
        }
      }
    }
  });
}

function editThread(index) {
  const dates = loadDates();
  threadEditBuffer = JSON.parse(JSON.stringify(dates[index]));
  editingThreadIndex = index;
  isNewThread = false;
  renderThreadsEditor();
}

function cancelThreadEdit() {
  if (isNewThread && editingThreadIndex >= 0) {
    const dates = loadDates();
    dates.splice(editingThreadIndex, 1);
    saveDates(dates);
  }
  editingThreadIndex = -1;
  threadEditBuffer = null;
  isNewThread = false;
  renderThreadsEditor();
}

function doneThreadEdit() {
  if (editingThreadIndex >= 0 && threadEditBuffer) {
    const dates = loadDates();
    dates[editingThreadIndex] = threadEditBuffer;
    saveDates(dates);
  }
  editingThreadIndex = -1;
  threadEditBuffer = null;
  isNewThread = false;
  renderThreadsEditor();
}

function confirmDeleteThread(index) {
  editingThreadIndex = index;
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete this thread?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    const dates = loadDates();
    dates.splice(index, 1);
    saveDates(dates);
    bootstrap.Modal.getInstance(modalEl).hide();
    editingThreadIndex = -1;
    threadEditBuffer = null;
    isNewThread = false;
    renderThreadsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewThread() {
  const dates = loadDates();
  const newThread = { name: "New Thread", type: "annual", month: 1, day: 1 };
  dates.push(newThread);
  saveDates(dates);
  threadEditBuffer = JSON.parse(JSON.stringify(newThread));
  editingThreadIndex = dates.length - 1;
  isNewThread = true;
  renderThreadsEditor();
  const editorEl = document.getElementById("threadsEditor");
  if (editorEl) editorEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// SETTINGS NAVIGATION
function openSettings() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("threadsEditor").classList.add("d-none");
  document.getElementById("settingsPage").classList.remove("d-none");

  const savedTheme = localStorage.getItem("theme") || "darkly";
  const themeSel = document.getElementById("themeSelector");
  if (themeSel) themeSel.value = savedTheme;

  const savedFormat = localStorage.getItem("countdownFormat") || "days";
  const formatSel = document.getElementById("formatSelector");
  if (formatSel) formatSel.value = savedFormat;

  const savedFontSize = localStorage.getItem("fontSize") || "xlarge";
  const fontSizeSel = document.getElementById("fontSizeSelector");
  if (fontSizeSel) fontSizeSel.value = savedFontSize;

  const autoHide = localStorage.getItem("autoHideMenu") === "true";
  const autoHideCb = document.getElementById("autoHideMenu");
  if (autoHideCb) autoHideCb.checked = autoHide;

  const showDanger = localStorage.getItem("showDanger") === "true";
  const showDangerCb = document.getElementById("showDanger");
  if (showDangerCb) showDangerCb.checked = showDanger;
  ["clearAllDataRow", "refreshAppRow"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("d-none", !showDanger);
  });

  const savedMax = localStorage.getItem("maxCountdowns") || "10";
  const maxSel = document.getElementById("maxCountdownsSelector");
  if (maxSel) maxSel.value = savedMax;

  const savedIconSize = localStorage.getItem("iconSize") || "large";
  const iconSel = document.getElementById("iconSizeSelector");
  if (iconSel) iconSel.value = savedIconSize;

  const savedDensity = localStorage.getItem("density") || "normal";
  const densitySel = document.getElementById("densitySelector");
  if (densitySel) densitySel.value = savedDensity;
}

function closeSettings() {
  document.getElementById("settingsPage").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  delete document.getElementById("countdownContainer").dataset.showAll;
  renderCountdowns();
}

function confirmClearAllData() {
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = "Clear ALL data? This cannot be undone.";
  document.getElementById("deleteConfirmBtn").onclick = function() {
    localStorage.setItem("dates", "[]");
    localStorage.setItem("categories", "[]");
    localStorage.setItem("images", "[]");
    bootstrap.Modal.getInstance(modalEl).hide();
    closeSettings();
  };
  new bootstrap.Modal(modalEl).show();
}

// INITIAL LOAD
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "darkly";
  applyTheme(savedTheme);
  renderCountdowns();
});

// PWA PULL-TO-REFRESH
(function() {
  if (!("serviceWorker" in navigator)) return;
  const THRESHOLD = 80;
  let startY = 0, pulling = false, pullDist = 0;
  const indicator = document.createElement("div");
  indicator.id = "pwa-pull-indicator";
  indicator.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;height:0;overflow:hidden;background:var(--bs-body-bg);transition:height 0.1s;color:var(--bs-body-color)";
  indicator.textContent = "\u21E9 Pull to refresh";
  document.body.appendChild(indicator);
  const spinner = document.createElement("div");
  spinner.id = "pwa-pull-spinner";
  spinner.style.cssText = "position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:10000;display:none;width:40px;height:40px;border:4px solid var(--bs-border-color);border-top-color:var(--bs-primary);border-radius:50%;animation:pwa-spin 0.6s linear infinite";
  document.body.appendChild(spinner);
  const style = document.createElement("style");
  style.textContent = "@keyframes pwa-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}";
  document.head.appendChild(style);
  function adjustIcon(dist) {
    const angle = Math.min(dist, THRESHOLD) / THRESHOLD;
    const deg = Math.round(angle * 180);
    indicator.innerHTML = dist >= THRESHOLD ? "\u21E9 Release to refresh" : "\u21E9 Pull to refresh";
    indicator.style.height = Math.min(dist, 50) + "px";
  }
  document.addEventListener("touchstart", e => {
    if (window.scrollY !== 0) return;
    startY = e.touches[0].clientY;
    pulling = true;
    pullDist = 0;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { pullDist = 0; return; }
    pullDist = dy;
    adjustIcon(dy);
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!pulling) return;
    pulling = false;
    indicator.style.height = "0";
    if (pullDist >= THRESHOLD) { spinner.style.display = "block"; setTimeout(() => { location.reload(); }, 400); }
    pullDist = 0;
  }, { passive: true });
})();
