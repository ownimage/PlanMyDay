// DEV MODE
window.isDevMode = new URLSearchParams(window.location.search).get("dev") === "true";
function getTodayDate() {
  const dev = localStorage.getItem("devToday");
  return dev ? new Date(dev + "T00:00:00") : new Date();
}
function getTodayStr() {
  const d = getTodayDate();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function getStoredLastGen() {
  if (isDevMode) {
    const dev = localStorage.getItem("devLastGen");
    if (dev) return dev;
  }
  return localStorage.getItem("planmydays_last_gen");
}

// STORAGE HELPERS
function loadStreams() {
  const streams = JSON.parse(localStorage.getItem("planmydays_streams") || "[]");
  let nextId = Date.now();
  let changed = false;
  streams.forEach(t => {
    (t.jobs || []).forEach(j => {
      if (!j.id) { j.id = "job_" + (nextId++); changed = true; }
    });
  });
  if (changed) saveStreams(streams);
  return streams;
}
function saveStreams(streams) {
  localStorage.setItem("planmydays_streams", JSON.stringify(streams));
}

function updateNavState() {
  const nav = document.getElementById("mainNav");
  if (nav) nav.classList.toggle("nav-inactive", false);
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// MODAL HELPERS
// Bootstrap ignores hide() while a modal's show transition is running, so track the
// fully-shown state and defer hide() until the "shown" event fires when necessary.
document.addEventListener("shown.bs.modal", function(e) { e.target.dataset.bsShown = "true"; });
document.addEventListener("hidden.bs.modal", function(e) { e.target.dataset.bsShown = "false"; });
function safeHideModal(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  const hide = () => bootstrap.Modal.getOrCreateInstance(el).hide();
  if (el.dataset.bsShown === "true") hide();
  else el.addEventListener("shown.bs.modal", hide, { once: true });
}

function showInfoConfirm(message) {
  const modalEl = document.getElementById("infoConfirmModal");
  document.getElementById("infoConfirmMessage").textContent = message;
  new bootstrap.Modal(modalEl).show();
}

// JOB COMPLETION STORAGE
function loadCompletedJobs() {
  const data = localStorage.getItem("planmydays_completed");
  return data ? JSON.parse(data) : [];
}
function saveCompletedJobs(ids) {
  localStorage.setItem("planmydays_completed", JSON.stringify(ids));
}

// TODAY PAGE ORDER
function loadTodayOrder() {
  const data = localStorage.getItem("planmydays_today_order");
  return data ? JSON.parse(data) : null;
}
function saveTodayOrder(order) {
  localStorage.setItem("planmydays_today_order", JSON.stringify(order));
}

// MAIN PAGE RENDER
function addScheduleJobsToOrder(order) {
  const streams = loadStreams();
  const existing = new Set(order);
  const jobMap = {};
  streams.forEach(t => {
    (t.jobs || []).forEach(j => {
      jobMap[j.id] = j;
      if (j.active !== false && shouldShowJobToday(j) && !existing.has(j.id)) {
        order.push(j.id);
        existing.add(j.id);
      }
    });
  });
  order.sort((a, b) => {
    const ta = jobMap[a]?.time;
    const tb = jobMap[b]?.time;
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return ta.localeCompare(tb);
  });
  return order;
}

function ensureTodayList() {
  const today = getTodayStr();
  const lastGen = getStoredLastGen();
  const existingOrder = loadTodayOrder();
  if (lastGen === today && existingOrder) return;

  if (!existingOrder) {
    const order = addScheduleJobsToOrder([]);
    saveTodayOrder(order);
    saveCompletedJobs([]);
    localStorage.setItem("planmydays_last_gen", today);
    return;
  }

  // date changed: carry over uncompleted + add new schedule-matching jobs
  const completed = loadCompletedJobs();
  const carried = existingOrder.filter(id => !completed.includes(id));
  const merged = addScheduleJobsToOrder(carried);
  saveTodayOrder(merged);
  saveCompletedJobs([]);
  localStorage.setItem("planmydays_last_gen", today);
}

function renderMain() {
  const container = document.getElementById("countdownContainer");
  if (!container) return;
  container.innerHTML = "";

  const now = getTodayDate();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()}`;

  const headingRow = document.createElement("div");
  headingRow.className = "d-flex align-items-center gap-2 mb-3 flex-shrink-0";
  const dateHeading = document.createElement("h2");
  dateHeading.className = "mb-0";
  dateHeading.textContent = dateStr;
  headingRow.appendChild(dateHeading);
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-primary editor-btn ms-auto";
  addBtn.id = "btnAddCard";
  addBtn.innerHTML = "&#43; Add Job";
  addBtn.onclick = function() { addTodayCardWithModal(); };
  headingRow.appendChild(addBtn);
  container.appendChild(headingRow);

  ensureTodayList();

  const streams = loadStreams();
  const completed = loadCompletedJobs();
  const todayOrder = loadTodayOrder() || [];
  const todaySet = new Set(todayOrder);

  const allJobs = [];
  streams.forEach((t, streamIdx) => {
    (t.jobs || []).forEach((j, jobIdx) => {
      if (j.active !== false && todaySet.has(j.id) && shouldShowJobToday(j)) {
        allJobs.push({ job: j, streamTitle: t.title, streamIdx, jobIdx });
      }
    });
  });

  const orderMap = {};
  todayOrder.forEach((id, i) => { orderMap[id] = i; });
  allJobs.sort((a, b) => (orderMap[a.job.id] !== undefined ? orderMap[a.job.id] : 999) - (orderMap[b.job.id] !== undefined ? orderMap[b.job.id] : 999));

  if (localStorage.getItem("planmydays_hideDone") === "true") {
    const filtered = allJobs.filter(({ job }) => !completed.includes(job.id));
    if (filtered.length === 0 && allJobs.length > 0) {
      const msg = document.createElement("p");
      msg.className = "text-secondary";
      msg.textContent = "All jobs completed!";
      container.appendChild(msg);
      updateNavState();
      return;
    }
    allJobs.length = 0; allJobs.push(...filtered);
  }

  const splitList = localStorage.getItem("planmydays_splitList") === "true";
  const tab = container.dataset.todayTab || "progress";
  let matchingStreams = null;

  if (splitList) {
    const tabWrapper = document.createElement("div");
    tabWrapper.className = "mb-3 border-bottom flex-shrink-0";
    const tabBar = document.createElement("ul");
    tabBar.className = "nav nav-tabs border-bottom-0 nav-tabs-info";
    ["progress", "maintenance"].forEach(t => {
      const li = document.createElement("li");
      li.className = "nav-item";
      const btn = document.createElement("button");
      btn.className = `nav-link ${t === tab ? "active" : ""}`;
      btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      btn.onclick = function() { container.dataset.todayTab = t; renderMain(); };
      li.appendChild(btn);
      tabBar.appendChild(li);
    });
    tabWrapper.appendChild(tabBar);
    container.appendChild(tabWrapper);

    matchingStreams = new Set();
    allJobs.forEach(({ streamIdx }) => {
      const s = streams[streamIdx];
      if ((s.tab || "progress") === tab) matchingStreams.add(streamIdx);
    });
  }

  const scrollBody = document.createElement("div");
  scrollBody.id = "countdownScrollBody";
  container.appendChild(scrollBody);

  const cardContainer = document.createElement("div");
  cardContainer.id = "todayCardList";

  if (allJobs.length === 0) {
    const msg = document.createElement("p");
    msg.className = "text-secondary";
    msg.textContent = splitList ? "No jobs in this tab." : "No active jobs yet. Add streams with active jobs to get started.";
    scrollBody.appendChild(msg);
    updateNavState();
    return;
  }

  if (splitList && allJobs.every(({ streamIdx }) => !matchingStreams.has(streamIdx))) {
    const msg = document.createElement("p");
    msg.className = "text-secondary";
    msg.textContent = "No jobs in this tab.";
    scrollBody.appendChild(msg);
  }

  allJobs.forEach(({ job, streamTitle, streamIdx, jobIdx }) => {
    const isDone = completed.includes(job.id);
    const streams = loadStreams();
    const stream = streams[streamIdx] || {};
    const streamImageUrl = getImageDataUrl(stream.image);
    const jobImageUrl = getImageDataUrl(job.image);
    const suffixLabel = getJobSuffix(job);
    const card = document.createElement("div");
    card.className = `card countdown-card mb-2 today-drag-card ${isDone ? "opacity-50" : ""}`;
    card.dataset.jobId = job.id;
    card.dataset.streamIdx = streamIdx;
    if (matchingStreams && !matchingStreams.has(streamIdx)) card.hidden = true;
    card.innerHTML = `
      <div class="row align-items-center">
        <div class="col-auto d-flex align-items-center">
          <div class="drag-handle" style="cursor:grab;line-height:1;display:flex;align-items:center">&#9776;</div>
          <div class="form-check mb-0 ms-1 pe-0 d-flex align-items-center" style="min-height:0;padding-left:0">
            <input class="form-check-input job-checkbox m-0 position-static" type="checkbox" data-job-id="${escapeHtml(job.id)}" ${isDone ? "checked" : ""}>
          </div>
        </div>
        <div class="col-auto d-flex align-items-center gap-1 px-0" style="min-width:68px">
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">${streamImageUrl ? `<img src="${streamImageUrl}" class="date-img" style="max-width:32px;max-height:32px">` : ""}</div>
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">${jobImageUrl ? `<img src="${jobImageUrl}" class="date-img" style="max-width:32px;max-height:32px">` : ""}</div>
        </div>
        <div class="col" style="min-width:0">
          <div class="d-flex align-items-center gap-2 mb-1">
            <h4 class="mb-0" style="${isDone ? 'text-decoration:line-through' : ''}">${escapeHtml(job.title)}${suffixLabel ? ` <span class="badge bg-secondary">${escapeHtml(suffixLabel.trim())}</span>` : ""}</h4>
          </div>
          <div class="d-flex justify-content-between align-items-center position-relative">
            <span class="small">${escapeHtml(streamTitle)}</span>
            <button class="btn btn-primary position-absolute start-50 translate-middle-x job-view-btn" onclick="viewJobReadOnly(${streamIdx}, ${jobIdx})" title="View job" style="padding:0.35em 0.65em;font-size:0.75em;line-height:1;font-weight:700">View</button>
            <span class="badge rounded-pill bg-${(stream.tab || "progress") === "progress" ? "success" : "info"}">${escapeHtml(stream.tab || "progress")}</span>
          </div>
          ${job.description ? `<div class="mt-1 text-secondary small">${escapeHtml(job.description)}</div>` : ""}
        </div>
      </div>
    `;
    cardContainer.appendChild(card);
  });

  scrollBody.appendChild(cardContainer);

  // checkbox change handler
  container.querySelectorAll(".job-checkbox").forEach(cb => {
    cb.addEventListener("change", function() {
      const jobId = this.dataset.jobId;
      const card = this.closest(".today-drag-card");
      if (this.checked) {
        const streamIdx = card ? parseInt(card.dataset.streamIdx) : -1;
        const streams = loadStreams();
        const stream = streams[streamIdx];
        if (stream && stream.title === "Ad Hoc") {
          const skipConfirm = localStorage.getItem("planmydays_skipAdhocConfirm") === "true";
          if (!skipConfirm) {
            const job = (stream.jobs || []).find(j => j.id === jobId);
            const modalEl = document.getElementById("deleteConfirmModal");
            const confirmBtn = document.getElementById("deleteConfirmBtn");
            document.getElementById("deleteConfirmMessage").innerHTML = `Remove "<strong>${escapeHtml(job?.title || jobId)}</strong>" from Ad Hoc?`;
            confirmBtn.className = "btn btn-danger editor-btn btn-wide";
            confirmBtn.textContent = "Remove";
            const cbRef = this;
            let confirmed = false;
            confirmBtn.onclick = function() {
              confirmed = true;
              safeHideModal("deleteConfirmModal");
              removeAdhocJob(streamIdx, jobId, cbRef);
            };
            modalEl.addEventListener("hidden.bs.modal", function handler() {
              modalEl.removeEventListener("hidden.bs.modal", handler);
              if (!confirmed) cbRef.checked = false;
            });
            new bootstrap.Modal(modalEl).show();
            return;
          }
          removeAdhocJob(streamIdx, jobId, this);
        } else {
          markJobDone(jobId, this);
        }
      } else {
        let completed = loadCompletedJobs();
        completed = completed.filter(id => id !== jobId);
        saveCompletedJobs(completed);
        if (card) {
          card.classList.toggle("opacity-50", false);
          const titleEl = card.querySelector("h4");
          if (titleEl) titleEl.style.textDecoration = "none";
        }
      }
    });
  });

function removeAdhocJob(streamIdx, jobId, cbRef) {
  const streams = loadStreams();
  const stream = streams[streamIdx];
  if (stream) {
    const jobs = stream.jobs || [];
    const idx = jobs.findIndex(j => j.id === jobId);
    if (idx >= 0) jobs.splice(idx, 1);
    stream.jobs = jobs;
    saveStreams(streams);
  }
  markJobDone(jobId, cbRef);
  renderMain();
}

function markJobDone(jobId, cbRef) {
  let completed = loadCompletedJobs();
  if (!completed.includes(jobId)) completed.push(jobId);
  saveCompletedJobs(completed);
  const card = cbRef.closest(".today-drag-card");
  if (card) {
    card.classList.toggle("opacity-50", true);
    const titleEl = card.querySelector("h4");
    if (titleEl) titleEl.style.textDecoration = "line-through";
  }
}

  updateNavState();
  initTodayCardsSortable();
}

function addTodayCardWithModal() {
  const streams = loadStreams();
  let stream = streams.find(t => t.title === "Ad Hoc");
  if (!stream) {
    stream = { title: "Ad Hoc", sequence: streams.length + 1, jobs: [] };
    streams.push(stream);
    saveStreams(streams);
  }
  const jobs = stream.jobs || [];
  const streamIdx = streams.indexOf(stream);
  jobsStreamIndex = streamIdx;
  const seq = jobs.length + 1;
  const newJob = { id: "job_" + Date.now(), title: "", sequence: seq, description: "", active: true, frequency: "daily", time: "", sleepUntil: "", waitFor: "", schedule: { type: "daily" } };
  jobs.push(newJob);
  stream.jobs = jobs;
  saveStreams(streams);
  jobsBuffer = JSON.parse(JSON.stringify(newJob));
  jobsEditingIdx = jobs.length - 1; isNewJob = true;
  buildJobEditPage(false);
}

// THREADS EDITOR
let editingIndex = -1;
let editBuffer = null;
let isNew = false;

function openStreamsEditor() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("streamsEditor").classList.remove("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
  document.getElementById("imagesEditor").classList.add("d-none");
  document.getElementById("jobSearchEditor").classList.add("d-none");
  renderStreamsEditor();
}

function closeStreamsEditor() {
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  editingIndex = -1; editBuffer = null; isNew = false;
  renderMain();
}

// JOB SEARCH
var jobSearchQuery = "";

function openSearchJobs() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
  document.getElementById("imagesEditor").classList.add("d-none");
  document.getElementById("jobSearchEditor").classList.remove("d-none");
  var input = document.getElementById("jobSearchInput");
  if (input) input.value = "";
  jobSearchQuery = "";
  renderSearchJobs();
  updateNavState();
}

function closeSearchJobs() {
  document.getElementById("jobSearchEditor").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  renderMain();
}

function searchJobsFilter() {
  var input = document.getElementById("jobSearchInput");
  jobSearchQuery = input ? input.value.trim() : "";
  renderSearchJobs();
}

function addNewJobFromSearch() {
  addTodayCardWithModal();
}

function getJobCountBadgeText(streams) {
  var totalDue = 0, totalActive = 0, totalJobs = 0;
  streams.forEach(function(s) {
    var jbs = s.jobs || [];
    totalDue += jbs.filter(function(j) { return j.active !== false && shouldShowJobToday(j); }).length;
    totalActive += jbs.filter(function(j) { return j.active !== false; }).length;
    totalJobs += jbs.length;
  });
  return totalDue + "/" + totalActive + "/" + totalJobs + " job" + (totalJobs !== 1 ? "s" : "");
}

function updateEditorJobCountBadges() {
  var text = getJobCountBadgeText(loadStreams());
  ["editJobsTotalBadge", "jobSearchTotalBadge"].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  });
  return text;
}

function renderSearchJobs() {
  const list = document.getElementById("jobSearchList");
  if (!list) return;
  const streams = loadStreams();
  updateEditorJobCountBadges();
  const query = jobSearchQuery.toLowerCase();
  const matches = [];
  streams.forEach(function(stream, streamIdx) {
    (stream.jobs || []).forEach(function(job, jobIdx) {
      if (query && !(job.title || "").toLowerCase().includes(query)) return;
      matches.push({ stream, streamIdx, job, jobIdx });
    });
  });
  list.innerHTML = "";
  if (matches.length === 0) {
    list.innerHTML = '<div class="text-secondary small p-2">' + (query ? 'No jobs match "' + escapeHtml(jobSearchQuery) + '".' : "No jobs found.") + '</div>';
    updateNavState();
    return;
  }
  matches.forEach(function(m) {
    list.appendChild(buildJobSearchCard(m.stream, m.streamIdx, m.job, m.jobIdx));
  });
  list.addEventListener("change", handleJobActiveToggleChange);
  updateNavState();
}

function buildJobSearchCard(stream, streamIdx, job, jobIdx) {
  const streamImageUrl = getImageDataUrl(stream.image);
  const jobImageUrl = getImageDataUrl(job.image);
  const suffixLabel = getJobSuffix(job);
  const scheduleText = getScheduleText(job.schedule);
  const hasSleep = job.sleepUntil && job.sleepUntil.trim();
  const hasWait = job.waitFor && job.waitFor.trim();
  const hasTime = job.time && job.time.trim();
  const card = document.createElement("div");
  card.className = "card p-2 mb-2";
  card.dataset.jobId = job.id;
  card.innerHTML =
    '<div class="d-flex align-items-center gap-2">' +
      '<div style="width:32px;height:32px;flex-shrink:0">' + (streamImageUrl ? '<img src="' + streamImageUrl + '" class="date-img" style="max-width:32px;max-height:32px">' : '') + '</div>' +
      (jobImageUrl ? '<div style="width:32px;height:32px;flex-shrink:0"><img src="' + jobImageUrl + '" class="date-img" style="max-width:32px;max-height:32px"></div>' : '') +
      '<div class="fw-bold editor-title" style="min-width:0;flex:1">' + escapeHtml(job.title) + (suffixLabel ? ' <span class="badge bg-secondary">' + escapeHtml(suffixLabel.trim()) + '</span>' : '') + '</div>' +
      '<button class="btn btn-primary btn-sm editor-btn flex-shrink-0 align-self-center ms-3" style="min-width:50px" onclick="editJobInAccordion(' + streamIdx + ', ' + jobIdx + ')">Edit</button>' +
    '</div>' +
    '<div class="d-flex align-items-center gap-2 mt-1 small">' +
      '<input class="form-check-input active-toggle m-0 position-static flex-shrink-0" type="checkbox" data-job-idx="' + jobIdx + '" data-stream-idx="' + streamIdx + '" ' + (job.active !== false ? "checked" : "") + ' style="cursor:pointer">' +
      '<span class="fw-bold flex-shrink-0">' + escapeHtml(stream.title) + '</span>' +
      '<span class="badge bg-' + ((stream.tab || "progress") === "progress" ? "success" : "info") + ' flex-shrink-0">' + escapeHtml(stream.tab || "progress") + '</span>' +
      (hasSleep ? '<span class="badge bg-info flex-shrink-0">Sleep: ' + escapeHtml(formatDate(job.sleepUntil)) + '</span>' : (hasWait ? '<span class="badge bg-info flex-shrink-0">Wait: ' + escapeHtml(job.waitFor.trim()) + '</span>' : '')) +
      '<span class="badge bg-primary flex-shrink-0">' + escapeHtml(scheduleText) + '</span>' +
      (hasTime ? '<span class="badge bg-secondary flex-shrink-0">' + escapeHtml(job.time) + '</span>' : '') +
    '</div>';
  return card;
}

function handleJobActiveToggleChange(e) {
  if (!e.target.classList.contains("active-toggle")) return;
  var jobIdx = parseInt(e.target.dataset.jobIdx);
  var streamIdx = parseInt(e.target.dataset.streamIdx);
  var streams = loadStreams();
  var jobs = streams[streamIdx].jobs || [];
  if (jobs[jobIdx]) jobs[jobIdx].active = e.target.checked;
  saveStreams(streams);
  var jobId = jobs[jobIdx] ? jobs[jobIdx].id : null;
  if (jobId) {
    var order = loadTodayOrder() || [];
    if (e.target.checked && shouldShowJobToday(jobs[jobIdx])) {
      if (!order.includes(jobId)) order.push(jobId);
    } else {
      order = order.filter(function(id) { return id !== jobId; });
    }
    saveTodayOrder(order);
  }
}

function focusTitleOnShow(inputId, modalId) {
  const el = document.getElementById(inputId);
  const modalEl = document.getElementById(modalId);
  if (!el || !modalEl) return;
  const handler = function() {
    el.focus();
    modalEl.removeEventListener("shown.bs.modal", handler);
  };
  modalEl.addEventListener("shown.bs.modal", handler);
}

function showStreamEditModal() {
  const streams = loadStreams();
  const t = streams[editingIndex];
  const data = editBuffer || t;
  document.getElementById("streamEditModalTitle").textContent = isNew ? "Add Stream" : "Edit Stream";
  document.getElementById("streamEditModalBody").innerHTML = getStreamEditFormHTML(data);
  updateStreamEditOkBtn();
  new bootstrap.Modal(document.getElementById("streamEditModal")).show();
  if (isNew) focusTitleOnShow("streamTitleInput", "streamEditModal");
}

function updateStreamEditOkBtn() {
  const okBtn = document.getElementById("btnStreamEditOk");
  const title = document.getElementById("streamTitleInput");
  if (okBtn) okBtn.disabled = !title || !title.value.trim();
}

function getStreamEditFormHTML(data) {
  return `
    <div class="mb-2">
      <label class="form-label">Title</label>
      <input class="form-control" id="streamTitleInput" value="${escapeHtml(data.title || "")}" oninput="editField('title', this.value);updateStreamEditOkBtn()" onkeydown="if(event.key==='Enter') document.getElementById('btnStreamEditOk').click()">
    </div>
    <div class="mb-2">
      <label class="form-label">Tab</label>
      <select class="form-select" onchange="editField('tab', this.value)">
        <option value="progress" ${(data.tab || "progress") === "progress" ? "selected" : ""}>Progress</option>
        <option value="maintenance" ${data.tab === "maintenance" ? "selected" : ""}>Maintenance</option>
      </select>
    </div>
    <div class="mb-2">
      <label class="form-label">Description</label>
      <textarea class="form-control" rows="3" oninput="editField('description', this.value)">${escapeHtml(data.description || "")}</textarea>
    </div>
    <div class="mb-2">
      <label class="form-label">Image</label>
      <div class="d-flex align-items-center gap-2">
        <div style="width:50px;height:50px;border:1px solid var(--bs-border-color);border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0" id="streamImagePreview">
          ${getImageDataUrl(data.image) ? `<img src="${getImageDataUrl(data.image)}" class="date-img" style="max-width:50px;max-height:50px">` : `<span class="text-secondary small">none</span>`}
        </div>
        <span class="small text-secondary" id="streamImageName">${escapeHtml(data.image || "")}</span>
        <button class="btn btn-primary btn-sm" id="btnStreamImageChoose" onclick="openImagePicker(function(name){ editField('image', name); updateStreamImagePreview(name); })">Edit</button>
      </div>
    </div>
  `;
}

function renderStreamsEditor() {
  const list = document.getElementById("streamEditorList");
  const addTile = document.getElementById("addStreamTile");
  const topTile = document.getElementById("addStreamTileTop");
  const filterEl = document.getElementById("streamEditorFilters");
  const singleEditor = document.getElementById("singleStreamEditor");

  // remember which accordion items are expanded (by index; after a drag the
// captured indices are translated through the reorder so the same stream stays open)
  const streams = loadStreams();
  var expandedStreams = [];
  if (streamsEditorExpandedIdxs !== null) {
    // drag capture (onStart + onEnd) is authoritative: the DOM collapse ids no
    // longer match stream indices once the reorder has been saved
    expandedStreams = streamsEditorExpandedIdxs;
    streamsEditorExpandedIdxs = null;
  } else {
    var openCollapses = list.querySelectorAll(".accordion-collapse.show");
    for (var ec = 0; ec < openCollapses.length; ec++) {
      var m = openCollapses[ec].id.match(/streamCollapse_(\d+)/);
      if (m) expandedStreams.push(parseInt(m[1]));
    }
  }

  list.innerHTML = ""; addTile.innerHTML = ""; topTile.innerHTML = ""; filterEl.innerHTML = ""; singleEditor.innerHTML = "";

  if (editingIndex >= 0) {
    list.classList.add("d-none"); addTile.classList.add("d-none");
    topTile.classList.add("d-none"); filterEl.classList.add("d-none");
    singleEditor.classList.add("d-none");
    showStreamEditModal();
    updateNavState();
    return;
  }

  list.classList.remove("d-none"); addTile.classList.remove("d-none");
  topTile.classList.remove("d-none"); filterEl.classList.remove("d-none");
  singleEditor.classList.add("d-none");

  list.className = "accordion";
  list.setAttribute("id", "streamEditorList");

  var sorted = [].concat(streams).sort(function(a, b) { return (a.sequence || 0) - (b.sequence || 0); });

  updateEditorJobCountBadges();

  sorted.forEach(function(t, displayIdx) {
    var realIdx = streams.indexOf(t);
    var streamImgUrl = getImageDataUrl(t.image);
    var jobs = t.jobs || [];
    var collapseId = "streamCollapse_" + realIdx;

    var item = document.createElement("div");
    item.className = "accordion-item stream-accordion-item stream-drag-card mb-2";
    item.dataset.streamIdx = realIdx;

    var headerHtml = '<div class="accordion-header stream-accordion-header" id="streamHeading_' + realIdx + '">' +
      '<div class="drag-handle flex-shrink-0" style="cursor:grab;line-height:1">&#9776;</div>' +
      '<div style="width:40px;height:40px;flex-shrink-0" class="mx-2">' + (streamImgUrl ? '<img src="' + streamImgUrl + '" class="date-img" style="max-width:40px;max-height:40px">' : '') + '</div>' +
      '<div style="display:flex;flex-direction:column;min-width:0;flex:1;gap:0.25rem;overflow:hidden" class="me-2">' +
        '<div style="display:flex;align-items:center;gap:0.35rem">' +
          '<button type="button" class="stream-header-main collapsed flex-grow-1" style="min-width:0;padding:0;border:0;background:transparent;color:inherit;text-align:left" data-bs-toggle="collapse" data-bs-target="#' + collapseId + '" aria-expanded="false">' +
            '<span class="fw-bold editor-title text-truncate">' + escapeHtml(t.title) + '</span>' +
          '</button>' +
          '<div class="stream-header-actions">' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="addNewJobForStream(' + realIdx + ')">Add Job</button>' +
            '<button type="button" class="btn btn-primary editor-btn" style="min-width:50px" onclick="editStream(' + realIdx + ')">Edit</button>' +
            (jobs.length === 0 ? '<button type="button" class="btn btn-danger editor-btn" style="min-width:50px" onclick="confirmDeleteStream(' + realIdx + ')">Delete</button>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:0.25rem;flex-wrap:nowrap">' +
          '<span class="badge bg-' + ((t.tab || "progress") === "progress" ? "success" : "info") + ' text-nowrap">' + escapeHtml(t.tab || "progress") + '</span>' +
          (jobs.length > 0 ? '<span class="badge bg-secondary text-nowrap">' +
            jobs.filter(function(j) { return j.active !== false && shouldShowJobToday(j); }).length + '/' +
            jobs.filter(function(j) { return j.active !== false; }).length + '/' +
            jobs.length + ' job' + (jobs.length !== 1 ? 's' : '') + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<button type="button" class="stream-header-chevron collapsed" data-bs-toggle="collapse" data-bs-target="#' + collapseId + '" aria-expanded="false" aria-label="Expand"></button>' +
    '</div>';

    var bodyHtml = '<div id="' + collapseId + '" class="accordion-collapse collapse" data-bs-parent="#streamEditorList">' +
      '<div class="accordion-body stream-accordion-body">' +
        (jobs.length > 0 ? renderJobsInAccordion(t, jobs, realIdx) : '<div class="text-secondary small p-2">No jobs</div>') +
      '</div>' +
    '</div>';

    item.innerHTML = headerHtml + bodyHtml;
    list.appendChild(item);
  });

  // delegated active toggle handler for jobs
  list.addEventListener("change", handleJobActiveToggleChange);

  topTile.innerHTML = '<div class="d-flex gap-2">' +
    '<button class="btn btn-primary editor-btn btn-wide" id="btnAddStream" onclick="addNewStream()">Add Stream</button>' +
    '<button class="btn btn-success editor-btn btn-wide ms-auto" id="btnStreamsDone" onclick="closeStreamsEditor()">Done</button>' +
  '</div>';

  // restore previously expanded accordion items
  expandedStreams.forEach(function(idx) {
    var collapseEl = document.getElementById("streamCollapse_" + idx);
    if (collapseEl) {
      collapseEl.classList.add("show");
      var itemEl = collapseEl.closest(".stream-accordion-item");
      if (itemEl) itemEl.classList.add("expanded");
    }
    document.querySelectorAll('#streamEditorList [data-bs-target="#streamCollapse_' + idx + '"]').forEach(function(btn) {
      btn.classList.remove("collapsed");
      btn.setAttribute("aria-expanded", "true");
    });
  });

  updateNavState();
  initStreamsEditorSortable();
  initStreamJobsSortables();
}

var streamsEditorSortable = null;
var streamsEditorExpandedIdxs = null;

function initStreamsEditorSortable() {
  if (streamsEditorSortable) {
    streamsEditorSortable.destroy();
    streamsEditorSortable = null;
  }
  if (typeof Sortable === "undefined") return;
  var el = document.getElementById("streamEditorList");
  if (!el || !el.querySelector(".stream-accordion-item")) return;
  streamsEditorSortable = new Sortable(el, {
    handle: ".stream-accordion-header .drag-handle",
    draggable: ".stream-accordion-item",
    animation: 150,
    onStart: function() {
      var idxs = [];
      el.querySelectorAll(".accordion-collapse.show").forEach(function(coll) {
        var m = coll.id.match(/streamCollapse_(\d+)/);
        if (m) idxs.push(parseInt(m[1]));
      });
      streamsEditorExpandedIdxs = idxs.length ? idxs : null;
    },
    onEnd: function() {
      var streams = loadStreams();
      var order = [];
      el.querySelectorAll(".stream-accordion-item").forEach(function(item) {
        var idx = parseInt(item.getAttribute("data-stream-idx"), 10);
        if (!isNaN(idx) && order.indexOf(idx) === -1) order.push(idx);
      });
      if (order.length !== streams.length) return;
      // translate the captured pre-drag indices to their post-reorder positions
      // (order[k] is the old index now sitting at new position k)
      if (streamsEditorExpandedIdxs !== null) {
        var translated = streamsEditorExpandedIdxs.map(function(e) { return order.indexOf(e); })
                     .filter(function(k) { return k !== -1; });
        streamsEditorExpandedIdxs = translated.length ? translated : null;
      }
      var reordered = order.map(function(idx) { return streams[idx]; });
      reordered.forEach(function(s, i) { s.sequence = i + 1; });
      saveStreams(reordered);
      renderStreamsEditor();
    }
  });
}

var streamJobsSortables = [];

function initStreamJobsSortables() {
  streamJobsSortables.forEach(function(s) { if (s) s.destroy(); });
  streamJobsSortables = [];
  if (typeof Sortable === "undefined") return;
  var list = document.getElementById("streamEditorList");
  if (!list) return;
  list.querySelectorAll(".accordion-body").forEach(function(body) {
    if (!body.querySelector(".job-drag-card")) return;
    var item = body.closest(".stream-accordion-item");
    if (!item) return;
    streamJobsSortables.push(new Sortable(body, {
      handle: ".job-drag-card .drag-handle",
      draggable: ".job-drag-card",
      animation: 150,
      onEnd: function() {
        var streamIdx = parseInt(item.getAttribute("data-stream-idx"), 10);
        if (isNaN(streamIdx)) return;
        var streams = loadStreams();
        var jobs = streams[streamIdx].jobs || [];
        var order = [];
        body.querySelectorAll(".job-drag-card").forEach(function(card) {
          var idx = parseInt(card.getAttribute("data-job-idx"), 10);
          if (!isNaN(idx) && order.indexOf(idx) === -1) order.push(idx);
        });
        if (order.length !== jobs.length) return;
        var reordered = order.map(function(idx) { return jobs[idx]; });
        reordered.forEach(function(j, i) { j.sequence = i + 1; });
        streams[streamIdx].jobs = reordered;
        saveStreams(streams);
        renderStreamsEditor();
      }
    }));
  });
}

var todayCardsSortable = null;

function initTodayCardsSortable() {
  if (todayCardsSortable) {
    todayCardsSortable.destroy();
    todayCardsSortable = null;
  }
  if (typeof Sortable === "undefined") return;
  var el = document.getElementById("todayCardList");
  if (!el || !el.querySelector(".today-drag-card")) return;
  todayCardsSortable = new Sortable(el, {
    handle: ".drag-handle",
    draggable: ".today-drag-card",
    animation: 150,
    onEnd: function() {
      var order = [];
      el.querySelectorAll(".today-drag-card").forEach(function(card) {
        var id = card.getAttribute("data-job-id");
        if (id && order.indexOf(id) === -1) order.push(id);
      });
      if (order.length === 0) return;
      saveTodayOrder(order);
    }
  });
}

function sortJobsByRules(jobs) {
  // rule 1: has sleepUntil → end (ordered by sleepUntil date, then time)
  // rule 2: no sleepUntil, has time → start (ordered by time)
  // rule 3: no sleepUntil, no time → middle (ordered by sequence)
  return [].concat(jobs).sort(function(a, b) {
    var aSleep = a.sleepUntil && a.sleepUntil.trim();
    var bSleep = b.sleepUntil && b.sleepUntil.trim();
    var aTime = a.time && a.time.trim();
    var bTime = b.time && b.time.trim();
    // groups: 0=rule2(noSleep+time), 1=rule3(noSleep+noTime), 2=rule1(sleepUntil)
    var aGroup = aSleep ? 2 : (aTime ? 0 : 1);
    var bGroup = bSleep ? 2 : (bTime ? 0 : 1);
    if (aGroup !== bGroup) return aGroup - bGroup;
    if (aGroup === 0) {
      var t = aTime.localeCompare(bTime);
      if (t !== 0) return t;
      return (a.sequence || 0) - (b.sequence || 0);
    }
    if (aGroup === 2) {
      var d = aSleep.localeCompare(bSleep);
      if (d !== 0) return d;
      if (aTime && bTime) return aTime.localeCompare(bTime);
      if (aTime) return 1;
      if (bTime) return -1;
      return (a.sequence || 0) - (b.sequence || 0);
    }
    return (a.sequence || 0) - (b.sequence || 0);
  });
}

function renderJobsInAccordion(stream, jobs, streamIdx) {
  return jobs.map(function(j, realIdx) {
    var scheduleText = getScheduleText(j.schedule);
    var jobImgUrl = getImageDataUrl(j.image);
    var hasTime = j.time && j.time.trim();
    var hasSleep = j.sleepUntil && j.sleepUntil.trim();
    return '<div class="card p-2 mb-0 job-drag-card" data-job-idx="' + realIdx + '">' +
      '<div class="d-flex align-items-center gap-2">' +
        '<div class="drag-handle flex-shrink-0" style="line-height:1">&#9776;</div>' +
        (jobImgUrl ? '<div style="width:32px;height:32px;flex-shrink:0"><img src="' + jobImgUrl + '" class="date-img" style="max-width:32px;max-height:32px"></div>' : '') +
        '<div class="fw-bold editor-title" style="min-width:0;flex:1">' + escapeHtml(j.title) + (getJobSuffix(j) ? ' <span class="badge bg-secondary">' + escapeHtml(getJobSuffix(j).trim()) + '</span>' : '') + '</div>' +
        '<button class="btn btn-primary btn-sm editor-btn flex-shrink-0 align-self-center ms-3" style="min-width:50px" onclick="editJobInAccordion(' + streamIdx + ', ' + realIdx + ')">Edit</button>' +
      '</div>' +
      '<div class="d-flex align-items-center gap-2 mt-1 small">' +
        '<label class="form-check-label mb-0 fw-bold flex-shrink-0" style="cursor:pointer;display:flex;align-items:center;gap:2px">' +
          '<input class="form-check-input active-toggle m-0 position-static" type="checkbox" data-job-idx="' + realIdx + '" data-stream-idx="' + streamIdx + '" ' + (j.active !== false ? "checked" : "") + ' style="cursor:pointer">' +
          'Active' +
        '</label>' +
        '<span class="badge bg-primary flex-shrink-0">' + escapeHtml(scheduleText) + '</span>' +
        (hasSleep ? '<span class="badge bg-info flex-shrink-0">Sleep: ' + escapeHtml(formatDate(j.sleepUntil)) + '</span>' : (j.waitFor && j.waitFor.trim() ? '<span class="badge bg-info flex-shrink-0">Wait: ' + escapeHtml(j.waitFor.trim()) + '</span>' : '')) +
        (hasTime ? '<span class="badge bg-secondary flex-shrink-0">' + escapeHtml(j.time) + '</span>' : '') +
      '</div>' +
    '</div>';
  }).join("");
}

function addNewJobForStream(streamIdx) {
  jobsStreamIndex = streamIdx;
  addNewJob();
}
function editJobInAccordion(streamIdx, jobIdx) {
  jobsStreamIndex = streamIdx;
  editJob(jobIdx);
}
function confirmDeleteJobInAccordion(streamIdx, jobIdx) {
  jobsStreamIndex = streamIdx;
  confirmDeleteJob(jobIdx);
}

function editField(field, value) {
  if (!editBuffer) return;
  editBuffer[field] = value;
}

function updateStreamImagePreview(name) {
  var preview = document.getElementById("streamImagePreview");
  var nameEl = document.getElementById("streamImageName");
  if (!preview) return;
  var url = getImageDataUrl(name);
  if (url) {
    preview.innerHTML = '<img src="' + url + '" class="date-img" style="max-width:50px;max-height:50px">';
    if (nameEl) nameEl.textContent = name;
  } else {
    preview.innerHTML = '<span class="text-secondary small">none</span>';
    if (nameEl) nameEl.textContent = "";
  }
}
function updateJobImagePreview(name) {
  var preview = $id("jobImagePreview");
  var nameEl = $id("jobImageName");
  var removeBtn = $id("jobImageRemoveBtn");
  if (!preview) return;
  var url = getImageDataUrl(name);
  if (url) {
    preview.innerHTML = '<img src="' + url + '" class="date-img" style="max-width:45px;max-height:45px">';
    if (nameEl) nameEl.textContent = name;
    if (removeBtn) removeBtn.classList.remove("d-none");
  } else {
    preview.innerHTML = '<span class="text-secondary small">none</span>';
    if (nameEl) nameEl.textContent = "";
    if (removeBtn) removeBtn.classList.add("d-none");
  }
}
function updateJobStreamPreview() {
  var streams = loadStreams();
  var stream = streams[jobsTargetStreamIndex >= 0 ? jobsTargetStreamIndex : jobsStreamIndex];
  var url = getImageDataUrl(stream && stream.image);
  var btnIcon = $id("jobStreamBtnIcon");
  if (btnIcon) {
    btnIcon.innerHTML = url ? '<img src="' + url + '" style="max-width:24px;max-height:24px">' : '<span style="width:24px;height:24px;display:inline-block"></span>';
  }
  var btnText = $id("jobStreamBtnText");
  if (btnText) {
    btnText.textContent = stream ? stream.title : "";
  }
  var menu = $id("jobStreamDropdownMenu");
  if (menu) {
    var items = menu.querySelectorAll(".dropdown-item");
    var targetIdx = jobsTargetStreamIndex >= 0 ? jobsTargetStreamIndex : jobsStreamIndex;
    items.forEach(function(item) {
      if (parseInt(item.getAttribute("data-stream-idx")) === targetIdx) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }
}
function jobChangeStream(newIdx) {
  jobsTargetStreamIndex = newIdx;
  updateJobStreamPreview();
  closeJobStreamMenu();
}

function initJobStreamDropdown() {
  const btn = $id("jobStreamDropdownBtn");
  if (!btn || btn._smdDropdownBound) return;
  btn._smdDropdownBound = true;
  btn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    const open = toggleJobStreamMenu();
    document.addEventListener("click", function onDoc(e2) {
      document.removeEventListener("click", onDoc);
      if (!open) return;
      const menu = $id("jobStreamDropdownMenu");
      const btnEl = $id("jobStreamDropdownBtn");
      if (!menu || !btnEl) return;
      if (menu.contains(e2.target) || btnEl.contains(e2.target)) return;
      menu.classList.remove("show");
    });
  });
}

function toggleJobStreamMenu() {
  const menu = $id("jobStreamDropdownMenu");
  if (!menu) return false;
  const willOpen = !menu.classList.contains("show");
  menu.classList.toggle("show", willOpen);
  return willOpen;
}

function closeJobStreamMenu() {
  const menu = $id("jobStreamDropdownMenu");
  if (menu) menu.classList.remove("show");
}

function editStream(index) {
  var streams = loadStreams();
  editBuffer = JSON.parse(JSON.stringify(streams[index]));
  editingIndex = index; isNew = false;
  showStreamEditModal();
}

function cancelEdit() {
  safeHideModal("streamEditModal");
  if (isNew && editingIndex >= 0) {
    var streams = loadStreams();
    streams.splice(editingIndex, 1);
    saveStreams(streams);
  }
  editingIndex = -1; editBuffer = null; isNew = false;
  renderStreamsEditor();
}

function doneEdit() {
  if (editingIndex >= 0 && editBuffer) {
    var streams = loadStreams();
    streams[editingIndex] = editBuffer;
    saveStreams(streams);
  }
  safeHideModal("streamEditModal");
  editingIndex = -1; editBuffer = null; isNew = false;
  renderStreamsEditor();
}

function confirmDeleteStream(index) {
  editingIndex = index;
  var streams = loadStreams();
  var stream = streams[index] || {};
  var modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete stream "' + (stream.title || "") + '"?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    var s = loadStreams();
    s.splice(index, 1);
    s.forEach(function(t, i) { t.sequence = i + 1; });
    saveStreams(s);
    safeHideModal("deleteConfirmModal");
    editingIndex = -1; editBuffer = null; isNew = false;
    renderStreamsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewStream() {
  var streams = loadStreams();
  var seq = streams.length + 1;
  var newStream = { title: "", sequence: seq, description: "", jobs: [], tab: "progress" };
  streams.push(newStream);
  saveStreams(streams);
  editBuffer = JSON.parse(JSON.stringify(newStream));
  editingIndex = streams.length - 1; isNew = true;
  showStreamEditModal();
  var el = document.getElementById("streamsEditor");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// JOBS EDITOR
var jobsStreamIndex = -1;
var jobsEditingIdx = -1;
var jobsBuffer = null;
var isNewJob = false;
var jobsTargetStreamIndex = -1;
var jobTasksSortable = null;

function jobField(field, value) {
  if (!jobsBuffer) return;
  jobsBuffer[field] = value;
}
function jobTimeChanged() {
  const h = $id("jobTimeHour").value;
  const m = $id("jobTimeMin").value;
  jobField("time", h && m ? h + ":" + m : "");
}
function clearSleepUntil() {
  jobField("sleepUntil", "");
  const fpInput = $id("jobSleepUntil");
  if (fpInput) {
    if (fpInput._flatpickr) fpInput._flatpickr.clear();
    fpInput.value = "";
  }
  const btn = $id("jobSleepUntilClearBtn");
  if (btn) btn.classList.add("d-none");
}
function updateJobEditOkBtn() {
  const okBtn = getJobEditFooterBtn("done");
  if (!okBtn) return;
  const title = $id("jobTitleInput");
  okBtn.disabled = !title || !title.value.trim();
}
function updateSleepUntilClearBtn() {
  const btn = $id("jobSleepUntilClearBtn");
  if (!btn) return;
  const val = $id("jobSleepUntil").value;
  btn.classList.toggle("d-none", !val);
}

function jobAddTask() {
  if (!jobsBuffer) return;
  if (!jobsBuffer.tasks) jobsBuffer.tasks = [];
  jobsBuffer.tasks.push({ description: "", done: false, note: "" });
  renderJobTasks();
  var listEl = $id("jobTasksList");
  var inputs = listEl ? listEl.querySelectorAll(".task-desc-input") : [];
  var last = inputs[inputs.length - 1];
  if (last) {
    last.focus();
    last.scrollIntoView({ block: "nearest" });
  }
}

function jobDeleteTask(index) {
  if (!jobsBuffer || !jobsBuffer.tasks) return;
  var taskText = (jobsBuffer.tasks[index] && jobsBuffer.tasks[index].description) ? jobsBuffer.tasks[index].description : "Unnamed task";
  var modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete task "' + taskText + '"?';
  modalEl.addEventListener("show.bs.modal", function boostZ() {
    modalEl.removeEventListener("show.bs.modal", boostZ);
    modalEl.style.zIndex = 2000;
    var backdrops = document.querySelectorAll(".modal-backdrop");
    if (backdrops.length > 0) backdrops[backdrops.length - 1].style.zIndex = 1999;
  });
  modalEl.addEventListener("hidden.bs.modal", function resetZ() {
    modalEl.removeEventListener("hidden.bs.modal", resetZ);
    modalEl.style.zIndex = "";
    var backdrops = document.querySelectorAll(".modal-backdrop");
    if (backdrops.length > 0) backdrops[backdrops.length - 1].style.zIndex = "";
  });
  document.getElementById("deleteConfirmBtn").onclick = function() {
    jobsBuffer.tasks.splice(index, 1);
    renderJobTasks();
    safeHideModal("deleteConfirmModal");
  };
  new bootstrap.Modal(modalEl).show();
}

function jobTaskField(index, field, value) {
  if (!jobsBuffer || !jobsBuffer.tasks) return;
  jobsBuffer.tasks[index][field] = value;
  if (field === "note") {
    var list = $id("jobTasksList");
    if (list) {
      var row = list.querySelector('.task-row[data-task-index="' + index + '"]');
      if (row) setTaskNoteBtnClass(row.querySelector(".task-note-btn"), jobsBuffer.tasks[index]);
    }
  }
}

function taskNoteOpen(task) {
  if (!task) return false;
  if (task.noteOpen === undefined) return !!task.note;
  return task.noteOpen;
}

function setTaskNoteBtnClass(btn, task) {
  if (!btn) return;
  var hasNote = !!(task && task.note);
  btn.classList.toggle("btn-outline-info", hasNote);
  btn.classList.toggle("btn-info", !hasNote);
}

function renderJobTasks() {
  var el = $id("jobTasksList");
  if (!el || !jobsBuffer) return;
  var tasks = jobsBuffer.tasks || [];
  var html = "";
  tasks.forEach(function(task, i) {
    html += '<div class="d-flex align-items-center gap-2 mb-1 task-row task-drag-card" data-task-index="' + i + '">' +
      '<div class="drag-handle">&#9776;</div>' +
      '<input class="form-check-input task-done-cb" type="checkbox" id="taskDone' + i + '" ' + (task.done ? "checked" : "") + ' onchange="jobTaskField(' + i + ', \'done\', this.checked)">' +
      '<input class="form-control task-desc-input" value="' + escapeHtml(task.description || "") + '" placeholder="Task description" oninput="jobTaskField(' + i + ', \'description\', this.value)">' +
      '<button class="btn btn-sm ' + (task.note ? 'btn-outline-info' : 'btn-info') + ' task-note-btn" onclick="jobTaskToggleNote(this, ' + i + ')" title="Note"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.854 2.56a.5.5 0 0 0-.707 0L1.5 10.207V14.5h4.293L13.5 6.207zM12.793 3.207L4 12V14h2L13.793 4.207l-1-1z"/></svg></button>' +
      '<button class="btn btn-sm btn-danger d-flex align-items-center justify-content-center" style="width:32px;height:32px" onclick="jobDeleteTask(' + i + ')" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg></button>' +
      '</div>' +
      '<div class="task-note-row mb-1 ms-4" id="taskNoteRow' + i + '" style="display:' + (taskNoteOpen(task) ? 'block' : 'none') + '">' +
        '<textarea class="form-control" rows="2" placeholder="Note" oninput="jobTaskField(' + i + ', \'note\', this.value)">' + escapeHtml(task.note || "") + '</textarea>' +
      '</div>';
  });
  el.innerHTML = html;
  initJobTasksSortable();
}

function initJobTasksSortable() {
  if (jobTasksSortable) {
    jobTasksSortable.destroy();
    jobTasksSortable = null;
  }
  if (typeof Sortable === "undefined") return;
  var el = $id("jobTasksList");
  if (!el || !jobsBuffer) return;
  if (!el.querySelector(".drag-handle")) return;
  jobTasksSortable = new Sortable(el, {
    handle: ".drag-handle",
    draggable: ".task-row",
    animation: 150,
    onEnd: function() {
      if (!jobsBuffer || !jobsBuffer.tasks) return;
      var reordered = [];
      el.querySelectorAll(".task-row").forEach(function(row) {
        var idx = parseInt(row.getAttribute("data-task-index"), 10);
        if (idx >= 0 && idx < jobsBuffer.tasks.length) reordered.push(jobsBuffer.tasks[idx]);
      });
      if (reordered.length !== jobsBuffer.tasks.length) return;
      jobsBuffer.tasks = reordered;
      renderJobTasks();
    }
  });
}

function jobTaskToggleNote(btn, index) {
  var row = $id("taskNoteRow" + index);
  if (!row) return;
  row.style.display = row.style.display === "none" ? "block" : "none";
  var shown = row.style.display === "block";
  if (jobsBuffer && jobsBuffer.tasks && jobsBuffer.tasks[index]) {
    jobsBuffer.tasks[index].noteOpen = shown;
  }
  if (btn && jobsBuffer && jobsBuffer.tasks) {
    setTaskNoteBtnClass(btn, jobsBuffer.tasks[index]);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return dayNames[d.getDay()] + " " + d.getDate() + " " + monthNames[d.getMonth()] + " " + d.getFullYear();
}

function formatLongDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return dayNames[d.getDay()] + ", " + d.getDate() + " " + monthNames[d.getMonth()] + ", " + d.getFullYear();
}

function getDaysSinceEpoch(date) {
  return Math.floor(date.getTime() / 86400000);
}

function getNextDueText(interval, offset) {
  const today = getTodayDate();
  const todayEpoch = getDaysSinceEpoch(today);
  for (let i = 0; i <= 7; i++) {
    const checkDay = todayEpoch + i;
    if ((checkDay - offset) % interval === 0) {
      if (i === 0) return "next due: today";
      if (i === 1) return "next due: tomorrow";
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + i);
      const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return "next due: " + dayNames[dueDate.getDay()] + ", " + monthNames[dueDate.getMonth()] + " " + dueDate.getDate();
    }
  }
  return "";
}

function getScheduleText(schedule) {
  if (!schedule) return "Every day";
  const s = schedule.type || "daily";
  if (s === "daily") return "Every day";
  if (s === "weekdays") return "Weekdays (Mon\u2013Fri)";
  if (s === "weekends") return "Weekends (Sat\u2013Sun)";
  if (s === "days") {
    const names = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return (schedule.days || []).map(d => names[d]).join(", ");
  }
  if (s === "monthly") return (schedule.date || 1) + "th of every month";
  if (s === "ndays") return "Every " + (schedule.interval || 2) + " day(s)";
  return "Every day";
}

let scheduleModalCallback = null;

function openScheduleModal() {
  const s = (jobsBuffer && jobsBuffer.schedule) || { type: "daily" };
  document.querySelectorAll('input[name="scheduleType"]').forEach(r => r.checked = r.value === s.type);
  document.getElementById("schedDaysOptions").classList.toggle("d-none", s.type !== "days");
  document.getElementById("schedMonthlyOptions").classList.toggle("d-none", s.type !== "monthly");
  document.getElementById("schedNDaysOptions").classList.toggle("d-none", s.type !== "ndays");
  for (let i = 0; i < 7; i++) {
    document.getElementById("schedDay" + i).checked = (s.days || []).includes(i);
  }
  const mSel = document.getElementById("schedMonthlyDay");
  mSel.innerHTML = "";
  for (let i = 1; i <= 31; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    if (i === (s.date || 1)) opt.selected = true;
    mSel.appendChild(opt);
  }
  const intervalSel = document.getElementById("schedNInterval");
  intervalSel.innerHTML = "";
  for (let i = 2; i <= 7; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    if (i === (s.interval || 2)) opt.selected = true;
    intervalSel.appendChild(opt);
  }
  const curInterval = s.interval || 2;
  const offsetSel = document.getElementById("schedNOffset");
  offsetSel.innerHTML = "";
  for (let i = 0; i < curInterval; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    if (i === (s.offset ?? 0)) opt.selected = true;
    offsetSel.appendChild(opt);
  }
  if (s.type === "ndays") onScheduleNDaysChange();
  const modalEl = document.getElementById("scheduleModal");
  modalEl.addEventListener("show.bs.modal", function boostZ() {
    modalEl.removeEventListener("show.bs.modal", boostZ);
    modalEl.style.zIndex = 2000;
    const backdrops = document.querySelectorAll(".modal-backdrop");
    if (backdrops.length > 0) backdrops[backdrops.length - 1].style.zIndex = 1999;
  });
  modalEl.addEventListener("hidden.bs.modal", function resetZ() {
    modalEl.removeEventListener("hidden.bs.modal", resetZ);
    modalEl.style.zIndex = "";
    const backdrops = document.querySelectorAll(".modal-backdrop");
    if (backdrops.length > 0) backdrops[backdrops.length - 1].style.zIndex = "";
  });
  new bootstrap.Modal(modalEl).show();
}

function closeScheduleModal() {
  safeHideModal("scheduleModal");
}

function onScheduleTypeChange() {
  const val = document.querySelector('input[name="scheduleType"]:checked');
  const type = val ? val.value : "daily";
  document.getElementById("schedDaysOptions").classList.toggle("d-none", type !== "days");
  document.getElementById("schedMonthlyOptions").classList.toggle("d-none", type !== "monthly");
  document.getElementById("schedNDaysOptions").classList.toggle("d-none", type !== "ndays");
  if (type === "ndays") onScheduleNDaysChange();
}

function onScheduleNDaysChange() {
  const interval = parseInt(document.getElementById("schedNInterval").value, 10) || 2;
  const offsetSel = document.getElementById("schedNOffset");
  const currentOffset = parseInt(offsetSel.value, 10) || 0;
  offsetSel.innerHTML = "";
  for (let i = 0; i < interval; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = i;
    if (i === Math.min(currentOffset, interval - 1)) opt.selected = true;
    offsetSel.appendChild(opt);
  }
  const offset = parseInt(offsetSel.value, 10) || 0;
  document.getElementById("schedNextDue").textContent = getNextDueText(interval, offset);
}

function saveScheduleModal() {
  const type = (document.querySelector('input[name="scheduleType"]:checked') || {}).value || "daily";
  let schedule = { type: type };
  if (type === "days") {
    schedule.days = [];
    for (let i = 0; i < 7; i++) {
      if (document.getElementById("schedDay" + i).checked) schedule.days.push(i);
    }
    if (schedule.days.length === 0) schedule = { type: "daily" };
  } else if (type === "monthly") {
    schedule.date = parseInt(document.getElementById("schedMonthlyDay").value, 10) || 1;
  } else if (type === "ndays") {
    schedule.interval = parseInt(document.getElementById("schedNInterval").value, 10) || 2;
    schedule.offset = parseInt(document.getElementById("schedNOffset").value, 10) || 0;
  }
  jobField("schedule", schedule);
  const el = $id("jobScheduleText");
  if (el) el.textContent = getScheduleText(schedule);
  closeScheduleModal();
}

function shouldShowJobToday(job) {
  if (job.sleepUntil) {
    const today = getTodayStr();
    if (today < job.sleepUntil) return false;
  }
  const s = job.schedule || { type: "daily" };
  const type = s.type || "daily";
  const now = getTodayDate();
  if (type === "daily") return true;
  if (type === "weekdays") { const d = now.getDay(); return d >= 1 && d <= 5; }
  if (type === "weekends") { const d = now.getDay(); return d === 0 || d === 6; }
  if (type === "days") return (s.days || []).includes(now.getDay());
  if (type === "monthly") return now.getDate() === (s.date || 1);
  if (type === "ndays") {
    const interval = s.interval || 2;
    const offset = s.offset ?? 0;
    const daysSinceEpoch = getDaysSinceEpoch(now);
    return ((daysSinceEpoch - offset) % interval + interval) % interval === 0;
  }
  return true;
}

function getJobEditPageContent(data, readOnly) {
  const disabled = readOnly ? "disabled" : "";
  const ro = readOnly ? "readonly" : "";
  return `
    <div class="row mb-1">
      <div class="col">
        <label class="form-label">Title</label>
      </div>
      <div class="col-auto d-flex align-items-center">
        <div class="form-check mb-0">
          <input class="form-check-input" type="checkbox" id="jobActiveCb" ${data.active !== false ? "checked" : ""} ${disabled} onchange="jobField('active', this.checked)">
          <label class="form-check-label" for="jobActiveCb">Active</label>
        </div>
      </div>
    </div>
    <div class="mb-2">
      <input class="form-control" id="jobTitleInput" value="${escapeHtml(data.title || "")}" ${ro} oninput="jobField('title', this.value);updateJobEditOkBtn()" ${readOnly ? "" : "onkeydown=\"if(event.key==='Enter') jobEditOk()\""}>
    </div>
    <smd-tabs id="jobEditTabs"></smd-tabs>
  `;
}

function getJobEditSections(data, readOnly) {
  return [
    { title: "General", id: "jobGeneral-tab", content: getJobGeneralTabHTML(data, readOnly) },
    { title: "Schedule", id: "jobSchedule-tab", content: getJobScheduleTabHTML(data, readOnly) },
    { title: "Tasks", id: "jobTasks-tab", content: getJobTasksTabHTML(data, readOnly) }
  ];
}

function getJobGeneralTabHTML(data, readOnly) {
  const streams = loadStreams();
  const currentStream = streams[jobsTargetStreamIndex >= 0 ? jobsTargetStreamIndex : jobsStreamIndex] || {};
  const streamImgUrl = getImageDataUrl(currentStream.image);
  const disabled = readOnly ? "disabled" : "";
  return `
    <div class="row mb-2 mt-2">
      <div class="col-6 d-flex flex-column" style="min-height:61px">
        <label class="form-label mb-0">Stream</label>
        <div class="dropdown mt-1" id="jobStreamDropdown" style="flex-grow:1">
          <button class="btn btn-outline-secondary dropdown-toggle w-100 d-flex align-items-center gap-2 h-100" type="button" id="jobStreamDropdownBtn" ${disabled} style="text-align:left">
            <span id="jobStreamBtnIcon" style="width:45px;height:45px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:1px solid var(--bs-border-color);border-radius:6px">
              ${streamImgUrl ? `<img src="${streamImgUrl}" style="max-width:45px;max-height:45px">` : `<span style="width:45px;height:45px;display:inline-block"></span>`}
            </span>
            <span id="jobStreamBtnText" class="flex-grow-1">${escapeHtml(currentStream.title || "")}</span>
          </button>
          <ul class="dropdown-menu w-100" id="jobStreamDropdownMenu">
            ${streams.map((s, i) => {
              const sImg = getImageDataUrl(s.image);
              return `
                <li>
                  <a class="dropdown-item d-flex align-items-center gap-2 ${i === (jobsTargetStreamIndex >= 0 ? jobsTargetStreamIndex : jobsStreamIndex) ? "active" : ""}" href="#" data-stream-idx="${i}" onclick="event.preventDefault();jobChangeStream(${i})">
                    <span style="width:45px;height:45px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:1px solid var(--bs-border-color);border-radius:6px">
                      ${sImg ? `<img src="${sImg}" style="max-width:45px;max-height:45px">` : `<span style="width:45px;height:45px;display:inline-block"></span>`}
                    </span>
                    ${escapeHtml(s.title)}
                  </a>
                </li>
              `;
            }).join("")}
          </ul>
        </div>
      </div>
      <div class="col-6 d-flex flex-column" style="min-height:61px">
        <label class="form-label mb-0">Image</label>
        <div class="d-flex align-items-center gap-2 mt-1" style="flex-grow:1">
          <div style="width:45px;height:45px;border:1px solid var(--bs-border-color);border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0" id="jobImagePreview">
            ${getImageDataUrl(data.image) ? `<img src="${getImageDataUrl(data.image)}" class="date-img" style="max-width:45px;max-height:45px">` : `<span class="text-secondary small">none</span>`}
          </div>
          <div>
            <div id="jobImageName">${escapeHtml(data.image || "")}</div>
            <div class="d-flex gap-1 mt-1">
              <button class="btn btn-primary btn-sm" id="btnJobImageChange" ${disabled} onclick="openImagePicker(function(name){ jobField('image', name); updateJobImagePreview(name); })">Edit</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mb-2">
      <label class="form-label">Description</label>
      <textarea class="form-control" rows="3" ${readOnly ? "readonly" : ""} oninput="jobField('description', this.value)">${escapeHtml(data.description || "")}</textarea>
    </div>
    <div class="row mb-2">
      <div class="col-auto d-flex align-items-center">
        <div class="form-check mb-0">
          <input class="form-check-input" type="checkbox" id="jobSuffixCb" ${data.suffix ? "checked" : ""} ${disabled} onchange="jobField('suffix', this.checked)">
          <label class="form-check-label" for="jobSuffixCb">Suffix</label>
        </div>
      </div>
      <div class="col">
        <select class="form-select" ${disabled} onchange="jobField('dayType', this.value)">
          <option value="dayOfYear" ${(data.dayType || "dayOfYear") === "dayOfYear" ? "selected" : ""}>Day of Year</option>
          <option value="dayOfMonth" ${data.dayType === "dayOfMonth" ? "selected" : ""}>Day of Month</option>
          <option value="dayOfWeek" ${data.dayType === "dayOfWeek" ? "selected" : ""}>Day of Week</option>
        </select>
      </div>
      <div class="col">
        <select class="form-select" ${disabled} onchange="jobField('mod', this.value)">
          <option value="" ${!data.mod ? "selected" : ""}>None</option>
          <option value="2" ${data.mod === "2" ? "selected" : ""}>2</option>
          <option value="3" ${data.mod === "3" ? "selected" : ""}>3</option>
          <option value="4" ${data.mod === "4" ? "selected" : ""}>4</option>
          <option value="5" ${data.mod === "5" ? "selected" : ""}>5</option>
          <option value="6" ${data.mod === "6" ? "selected" : ""}>6</option>
          <option value="7" ${data.mod === "7" ? "selected" : ""}>7</option>
        </select>
      </div>
    </div>
  `;
}

function getJobScheduleTabHTML(data, readOnly) {
  const disabled = readOnly ? "disabled" : "";
  const ro = readOnly ? "readonly" : "";
  return `
    <div class="mb-2 mt-2">
      <label class="form-label">Schedule</label>
      <div class="d-flex align-items-center gap-2">
        <span id="jobScheduleText">${escapeHtml(getScheduleText(data.schedule))}</span>
        <button class="btn btn-primary btn-sm" id="btnScheduleChange" ${disabled} onclick="openScheduleModal()">Edit</button>
      </div>
    </div>
    <div class="row mb-2">
      <div class="col">
        <label class="form-label">Sleep Until</label>
        <div class="d-flex gap-2">
          <input class="form-control" id="jobSleepUntil" value="${escapeHtml(readOnly ? formatDate(data.sleepUntil) : (data.sleepUntil || ""))}" ${ro} placeholder="Pick a date">
          <button class="btn btn-danger btn-sm ${data.sleepUntil ? "" : "d-none"}" id="jobSleepUntilClearBtn" ${disabled} onclick="clearSleepUntil()">Clear</button>
        </div>
      </div>
    </div>
    <div class="row mb-2">
      <div class="col">
        <label class="form-label">Wait for</label>
        <input class="form-control" id="jobWaitFor" value="${escapeHtml(data.waitFor || "")}" ${ro} placeholder="e.g. the delivery to arrive" oninput="jobField('waitFor', this.value)">
      </div>
    </div>
    <div class="row mb-2">
      <div class="col">
        <label class="form-label">Schedule Time</label>
        <div class="d-flex gap-2">
          <select class="form-select" id="jobTimeHour" ${disabled} onchange="jobTimeChanged()" style="width:auto">
            <option value="" ${!data.time ? "selected" : ""}>-</option>
            ${Array.from({length: 24}, (_, i) => {
              const h = String(i).padStart(2, "0");
              const cur = data.time ? data.time.split(":")[0] : "";
              return `<option value="${h}" ${cur === h ? "selected" : ""}>${h}</option>`;
            }).join("")}
          </select>
          <span class="align-self-center">:</span>
          <select class="form-select" id="jobTimeMin" ${disabled} onchange="jobTimeChanged()" style="width:auto">
            <option value="" ${!data.time ? "selected" : ""}>-</option>
            <option value="00" ${data.time && data.time.split(":")[1] === "00" ? "selected" : ""}>00</option>
            <option value="15" ${data.time && data.time.split(":")[1] === "15" ? "selected" : ""}>15</option>
            <option value="30" ${data.time && data.time.split(":")[1] === "30" ? "selected" : ""}>30</option>
            <option value="45" ${data.time && data.time.split(":")[1] === "45" ? "selected" : ""}>45</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function getJobTasksTabHTML(data, readOnly) {
  const disabled = readOnly ? "disabled" : "";
  const ro = readOnly ? "readonly" : "";
  const tasks = data.tasks || [];
  let tasksHTML = "";
  tasks.forEach(function(task, i) {
    var dragHandleHtml = readOnly ? "" : '<div class="drag-handle">&#9776;</div>';
    tasksHTML += `
      <div class="d-flex align-items-center gap-2 mb-1 task-row task-drag-card" data-task-index="${i}">
        ${dragHandleHtml}
        <input class="form-check-input task-done-cb" type="checkbox" ${task.done ? "checked" : ""} ${disabled} onchange="jobTaskField(${i}, 'done', this.checked)">
        <input class="form-control task-desc-input" value="${escapeHtml(task.description || "")}" ${ro} placeholder="Task description" oninput="jobTaskField(${i}, 'description', this.value)">
        <button class="btn btn-sm ${task.note ? 'btn-outline-info' : 'btn-info'} task-note-btn" ${disabled} onclick="jobTaskToggleNote(this, ${i})" title="Note"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.854 2.56a.5.5 0 0 0-.707 0L1.5 10.207V14.5h4.293L13.5 6.207zM12.793 3.207L4 12V14h2L13.793 4.207l-1-1z"/></svg></button>
        <button class="btn btn-sm btn-danger d-flex align-items-center justify-content-center" style="width:32px;height:32px" ${disabled} onclick="jobDeleteTask(${i})" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg></button>
      </div>
      <div class="task-note-row mb-1 ms-4" id="taskNoteRow${i}" style="display:${taskNoteOpen(task) ? 'block' : 'none'}">
        <textarea class="form-control" rows="2" placeholder="Note" ${ro} oninput="jobTaskField(${i}, 'note', this.value)">${escapeHtml(task.note || "")}</textarea>
      </div>`;
  });
  return `
    <div class="mt-2">
      <button class="btn btn-primary btn-sm mb-2" id="jobAddTaskBtn" ${disabled} onclick="jobAddTask()">Add Task</button>
      <div id="jobTasksList">${tasksHTML}</div>
      <div class="mt-2">
        <button class="btn btn-primary btn-sm" id="jobAddTaskBottomBtn" ${disabled} onclick="jobAddTask()">Add Task</button>
      </div>
    </div>
  `;
}

var _jobEditButtons = [];
var _jobEditCloseTimer = null;

function buildJobEditPage(readOnly, activeTabIndex) {
  if (!jobsBuffer) return;
  const data = jobsBuffer;
  const title = readOnly ? "View Job" : (isNewJob ? "Add Job" : "Edit Job");
  const page = document.getElementById("jobEditPage");
  if (!page) return;

  destroyJobEditTransient();
  if (_jobEditCloseTimer) {
    clearTimeout(_jobEditCloseTimer);
    _jobEditCloseTimer = null;
  }
  jobsTargetStreamIndex = jobsStreamIndex;

  _jobEditButtons = readOnly
    ? [
        { text: "Edit", variant: "primary", action: "edit", id: "btnViewJobEdit" },
        { text: "OK", variant: "success", action: "cancel", id: "jobEditOkBtn" }
      ]
    : [
        { text: "Cancel", variant: "secondary", action: "cancel", id: "jobEditCancelBtn" },
        ...(isNewJob ? [] : [{ text: "Delete", variant: "danger", action: "delete", id: "jobEditDelBtn" }]),
        { text: "OK", variant: "success", action: "done", id: "jobEditOkBtn" }
      ];

  page.classList.remove("d-none");
  page.title = title;
  page.content = getJobEditPageContent(data, readOnly);
  page.buttons = _jobEditButtons;

  const tabsEl = $id("jobEditTabs");
  if (tabsEl) {
    tabsEl.tabs = getJobEditSections(data, readOnly);
    if (typeof activeTabIndex === "number" && activeTabIndex > 0 && activeTabIndex < tabsEl.tabs.length) {
      tabsEl.activeIndex = activeTabIndex;
    }
  }
  injectJobEditStyles();
  initJobStreamDropdown();
  initJobSleepUntilPicker(readOnly);
  if (!readOnly) {
    initJobTasksSortable();
    updateJobEditOkBtn();
  }
  page.show();
  if (!readOnly && isNewJob) focusJobTitle();
}

function destroyJobEditTransient() {
  if (jobTasksSortable) {
    jobTasksSortable.destroy();
    jobTasksSortable = null;
  }
  const fp = $id("jobSleepUntil");
  if (fp && fp._flatpickr) {
    try { fp._flatpickr.destroy(); } catch (e) {}
  }
}

function hideJobEditPage() {
  destroyJobEditTransient();
  const page = document.getElementById("jobEditPage");
  if (page) {
    page.hide();
    clearTimeout(_jobEditCloseTimer);
    _jobEditCloseTimer = setTimeout(function() {
      page.classList.add("d-none");
    }, 320);
  }
}

function initJobSleepUntilPicker(readOnly) {
  const fpInput = $id("jobSleepUntil");
  if (!fpInput) return;
  if (readOnly) return;
  flatpickr(fpInput, {
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "D j M Y",
    altInputClass: "form-control",
    allowInput: false,
    monthSelectorType: "dropdown",
    disableMobile: true,
    locale: { firstDayOfWeek: parseInt(localStorage.getItem("planmydays_startWeek") || "1", 10) },
    onChange: function(selectedDates, dateStr) {
      jobField("sleepUntil", dateStr);
      updateSleepUntilClearBtn();
    }
  });
  if (fpInput._flatpickr && fpInput._flatpickr.altInput) fpInput._flatpickr.altInput.id = "jobSleepUntilDisplay";
}

function focusJobTitle() {
  requestAnimationFrame(function() {
    var el = $id("jobTitleInput");
    if (el) el.focus();
  });
}

function getJobEditFooterBtn(action) {
  const page = document.getElementById("jobEditPage");
  if (!page || !page.shadowRoot) return null;
  const config = _jobEditButtons.find(function(b) { return b.action === action; });
  if (!config || !config.id) return null;
  return page.shadowRoot.getElementById(config.id);
}

function jobEditOk() {
  const okBtn = getJobEditFooterBtn("done");
  if (okBtn && okBtn.disabled) return;
  doneJobEdit();
}

function editJobFromView() {
  if (!jobsBuffer) return;
  var activeIdx = 0;
  var tabsEl = $id("jobEditTabs");
  if (tabsEl) activeIdx = tabsEl.activeIndex;
  buildJobEditPage(false, activeIdx);
}

function viewJobReadOnly(streamIdx, jobIdx) {
  const streams = loadStreams();
  const stream = streams[streamIdx];
  if (!stream) return;
  const jobs = stream.jobs || [];
  const job = jobs[jobIdx];
  if (!job) return;
  jobsBuffer = JSON.parse(JSON.stringify(job));
  if (jobsBuffer.sleepUntil) {
    const today = getTodayStr();
    if (jobsBuffer.sleepUntil < today) jobsBuffer.sleepUntil = "";
  }
  jobsStreamIndex = streamIdx;
  jobsEditingIdx = jobIdx;
  isNewJob = false;
  buildJobEditPage(true);
}

function editJob(index) {
  var streams = loadStreams();
  var jobs = streams[jobsStreamIndex].jobs || [];
  jobsBuffer = JSON.parse(JSON.stringify(jobs[index]));
  if (jobsBuffer.sleepUntil) {
    var today = getTodayStr();
    if (jobsBuffer.sleepUntil < today) jobsBuffer.sleepUntil = "";
  }
  jobsEditingIdx = index; isNewJob = false;
  buildJobEditPage(false);
}

function cancelJobEdit() {
  hideJobEditPage();
  var searchOpen = document.getElementById("jobSearchEditor") && !document.getElementById("jobSearchEditor").classList.contains("d-none");
  var fromMain = document.getElementById("streamsEditor").classList.contains("d-none");
  if (isNewJob && jobsEditingIdx >= 0) {
    var streams = loadStreams();
    var jobs = streams[jobsStreamIndex].jobs || [];
    jobs.splice(jobsEditingIdx, 1);
    streams[jobsStreamIndex].jobs = jobs;
    saveStreams(streams);
  }
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false; jobsTargetStreamIndex = -1;
  if (searchOpen) { renderSearchJobs(); } else if (fromMain) { renderMain(); } else { renderStreamsEditor(); }
}

function doneJobEdit() {
  var searchOpen = document.getElementById("jobSearchEditor") && !document.getElementById("jobSearchEditor").classList.contains("d-none");
  var fromMain = document.getElementById("streamsEditor").classList.contains("d-none");
  var savedId = null;
  if (jobsEditingIdx >= 0 && jobsBuffer) {
    var streams = loadStreams();
    savedId = jobsBuffer.id;
    if (jobsTargetStreamIndex >= 0 && jobsTargetStreamIndex !== jobsStreamIndex) {
      var oldJobs = streams[jobsStreamIndex].jobs || [];
      oldJobs.splice(jobsEditingIdx, 1);
      oldJobs.forEach(function(j, i) { j.sequence = i + 1; });
      streams[jobsStreamIndex].jobs = oldJobs;
      var newJobs = streams[jobsTargetStreamIndex].jobs || [];
      jobsBuffer.sequence = newJobs.length + 1;
      newJobs.push(jobsBuffer);
      streams[jobsTargetStreamIndex].jobs = newJobs;
    } else {
      var jobs = streams[jobsStreamIndex].jobs || [];
      jobs[jobsEditingIdx] = jobsBuffer;
      streams[jobsStreamIndex].jobs = jobs;
    }
    saveStreams(streams);
  }
  hideJobEditPage();
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false; jobsTargetStreamIndex = -1;
  if (searchOpen) { renderSearchJobs(); } else if (fromMain) {
    var streams = loadStreams();
    var order = loadTodayOrder() || [];
    var allActive = [];
    streams.forEach(function(t) { (t.jobs || []).forEach(function(j) { if (j.active !== false) allActive.push(j.id); }); });
    var remaining = order.filter(function(id) { return allActive.includes(id); });
    allActive.forEach(function(id) { if (!remaining.includes(id)) remaining.push(id); });
    if (savedId && !remaining.includes(savedId)) remaining.push(savedId);
    saveTodayOrder(remaining);
    renderMain();
  } else {
    var editorStreams = loadStreams();
    var savedJob = null;
    editorStreams.forEach(function(t) {
      if (!savedJob) {
        var found = (t.jobs || []).find(function(j) { return j.id === savedId; });
        if (found) savedJob = found;
      }
    });
    if (savedId && savedJob && savedJob.active !== false && shouldShowJobToday(savedJob)) {
      var editorOrder = loadTodayOrder() || [];
      if (editorOrder.indexOf(savedId) === -1) {
        editorOrder.push(savedId);
        saveTodayOrder(editorOrder);
      }
    }
    renderStreamsEditor();
  }
}

function deleteJobFromEdit() {
  var idx = jobsEditingIdx;
  hideJobEditPage();
  confirmDeleteJob(idx);
}

function confirmDeleteJob(index) {
  jobsEditingIdx = index;
  var streams = loadStreams();
  var stream = streams[jobsStreamIndex] || {};
  var jobs = stream.jobs || [];
  var job = jobs[index] || {};
  var modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete "' + (job.title || "") + '" from "' + (stream.title || "") + '"?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    var s = loadStreams();
    var jbs = s[jobsStreamIndex].jobs || [];
    var deletedId = (jbs[index] || {}).id;
    jbs.splice(index, 1);
    jbs.forEach(function(j, i) { j.sequence = i + 1; });
    s[jobsStreamIndex].jobs = jbs;
    saveStreams(s);
    if (deletedId) {
      var order = loadTodayOrder();
      if (order) {
        order = order.filter(function(id) { return id !== deletedId; });
        saveTodayOrder(order);
      }
      var completed = loadCompletedJobs();
      if (completed.indexOf(deletedId) !== -1) {
        saveCompletedJobs(completed.filter(function(id) { return id !== deletedId; }));
      }
    }
    safeHideModal("deleteConfirmModal");
    jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
    if (document.getElementById("streamsEditor").classList.contains("d-none")) {
      renderMain();
    } else {
      renderStreamsEditor();
    }
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewJob() {
  var streams = loadStreams();
  var jobs = streams[jobsStreamIndex].jobs || [];
  var seq = jobs.length + 1;
  var newJob = { id: "job_" + Date.now(), title: "", sequence: seq, description: "", active: true, frequency: "daily", time: "", sleepUntil: "", waitFor: "", schedule: { type: "daily" }, tasks: [] };
  jobs.push(newJob);
  streams[jobsStreamIndex].jobs = jobs;
  saveStreams(streams);
  jobsBuffer = JSON.parse(JSON.stringify(newJob));
  jobsEditingIdx = jobs.length - 1; isNewJob = true;
  buildJobEditPage(false);
}

function getJobSuffix(job) {
  if (!job.suffix) return "";
  const today = getTodayDate();
  const dayType = job.dayType || "dayOfYear";
  let dayNum;

  if (dayType === "dayOfWeek") {
    dayNum = today.getDay();
    const mondaySetting = localStorage.getItem("planmydays_monday") || "1";
    if (mondaySetting === "1") {
      dayNum = dayNum === 0 ? 7 : dayNum;
    } else {
      dayNum = dayNum === 0 ? 6 : dayNum - 1;
    }
  } else if (dayType === "dayOfMonth") {
    dayNum = today.getDate();
  } else {
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    dayNum = Math.floor((today - startOfYear) / 86400000);
    const jan1Setting = localStorage.getItem("planmydays_jan1") || "0";
    if (jan1Setting === "0") {
      dayNum -= 1;
    }
  }

  if (job.mod && job.mod !== "") {
    const modVal = parseInt(job.mod, 10);
    if (modVal > 0) {
      dayNum = dayNum % modVal;
    }
  }

  const suffixStart = localStorage.getItem("planmydays_suffixStart") || "0";
  if (suffixStart === "1") dayNum += 1;

  return ` (${dayNum})`;
}

// SETTINGS
let _settingsSections = null;
let _settingsFooterHtml = null;
let _settingsCloseTimer = null;

function getSettingsSections() {
  if (_settingsSections) return { sections: _settingsSections, footerHtml: _settingsFooterHtml };
  const template = document.getElementById("settingsTemplate");
  if (!template) return { sections: [], footerHtml: "" };
  const clone = template.content.cloneNode(true);
  _settingsSections = Array.from(clone.querySelectorAll(".smd-settings-tab")).map(sec => ({
    id: sec.dataset.tabId || null,
    title: sec.dataset.tab,
    content: sec.innerHTML
  }));
  const footer = clone.querySelector("#settingsFooter");
  _settingsFooterHtml = (footer ? footer.outerHTML : "").replace('id="buildNumber"></span>', 'id="buildNumber">' + (typeof BUILD_NUMBER !== "undefined" ? BUILD_NUMBER : "") + '</span>');
  template.remove();
  return { sections: _settingsSections, footerHtml: _settingsFooterHtml };
}

var JOBS_EDITOR_STYLES = `
  .smd-page-body *, .smd-page-body *::before, .smd-page-body *::after,
  .smd-tab-panel *, .smd-tab-panel *::before, .smd-tab-panel *::after {
    box-sizing: border-box;
  }
  .smd-page-body .row, .smd-tab-panel .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
    max-width: 1040px;
    margin-bottom: 1rem;
  }
  .smd-page-body .col, .smd-page-body .col-auto, .smd-page-body .col-6,
  .smd-tab-panel .col, .smd-tab-panel .col-auto, .smd-tab-panel .col-6 {
    position: relative;
    padding-right: 0.75rem;
    padding-left: 0.75rem;
  }
  .smd-page-body .col, .smd-tab-panel .col { flex: 1 0 0%; }
  .smd-page-body .col-auto, .smd-tab-panel .col-auto { flex: 0 0 auto; width: auto; }
  .smd-page-body .col-6, .smd-tab-panel .col-6 { flex: 0 0 50%; max-width: 50%; }
  .smd-page-body .form-label, .smd-tab-panel .form-label {
    margin-bottom: 0.25rem;
    font-weight: 500;
    color: var(--bs-body-color, #f8f9fa);
  }
  .smd-page-body .form-control, .smd-tab-panel .form-control {
    display: block;
    width: 100%;
    padding: 0.375rem 0.75rem;
    font-size: 0.95rem;
    font-weight: 400;
    line-height: 1.5;
    color: var(--bs-body-color, #f8f9fa);
    background-color: var(--bs-body-bg, #222222);
    background-clip: padding-box;
    border: 1px solid var(--bs-border-color, #495057);
    border-radius: 0.375rem;
  }
  .smd-page-body .form-select, .smd-tab-panel .form-select {
    display: block;
    width: 100%;
    padding: 0.375rem 0.75rem;
    font-size: 0.95rem;
    color: var(--bs-body-color, #f8f9fa);
    background-color: var(--bs-body-bg, #222222);
    border: 1px solid var(--bs-border-color, #495057);
    border-radius: 0.375rem;
  }
  .smd-page-body .form-check, .smd-tab-panel .form-check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.5rem;
  }
  .smd-page-body .form-check-label, .smd-tab-panel .form-check-label {
    color: var(--bs-body-color, #f8f9fa);
  }
  .smd-page-body .form-check-input, .smd-tab-panel .form-check-input {
    width: 1.1em;
    height: 1.1em;
    margin: 0;
    flex-shrink: 0;
    appearance: none;
    -webkit-appearance: none;
    vertical-align: middle;
    background-color: var(--bs-secondary-bg, #495057);
    border: 1px solid var(--bs-border-color, #495057);
    border-radius: 0.25em;
    cursor: pointer;
  }
  .smd-page-body .form-check-input:checked, .smd-tab-panel .form-check-input:checked {
    background-color: var(--bs-primary, #0d6efd);
    border-color: var(--bs-primary, #0d6efd);
  }
  .smd-page-body .form-check-input:disabled, .smd-tab-panel .form-check-input:disabled { opacity: 0.55; }
  .smd-tab-panel .form-switch { padding-left: 0; }
  .smd-tab-panel .form-switch .form-check-input {
    width: 2.5em;
    height: 1.5em;
    border-radius: 2em;
    position: relative;
  }
  .smd-tab-panel .form-switch .form-check-input::before {
    content: "";
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 1.2em;
    height: 1.2em;
    border-radius: 50%;
    background-color: #fff;
    transition: transform 0.15s ease-in-out;
  }
  .smd-tab-panel .form-switch .form-check-input:checked::before { transform: translateX(1em); }
  .smd-tab-panel .input-group {
    display: flex;
    align-items: stretch;
    width: 100%;
  }
  .smd-tab-panel .input-group > .form-control {
    flex: 1 1 auto;
    width: 1%;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .smd-tab-panel .input-group > .btn-outline-secondary {
    flex: 0 0 auto;
    border: 1px solid var(--bs-border-color, #6c757d);
    border-left: 0;
    background: var(--bs-tertiary-bg, #303030);
    color: var(--bs-secondary-color, #adb5bd);
    padding: 0.375rem 0.75rem;
    border-radius: 0 0.375rem 0.375rem 0;
    cursor: pointer;
  }
  .smd-page-body .btn, .smd-tab-panel .btn {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    font-size: 0.95rem;
    font-weight: 400;
    line-height: 1.5;
    text-align: center;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    cursor: pointer;
    text-decoration: none;
  }
  .smd-page-body .btn:disabled, .smd-tab-panel .btn:disabled { opacity: 0.55; pointer-events: none; }
  .smd-tab-panel .btn-primary { background: var(--bs-primary, #0d6efd); color: #fff; }
  .smd-tab-panel .btn-danger { background: var(--bs-danger, #e74c3c); color: #fff; }
  .smd-tab-panel .btn-info { background: var(--bs-info, #0dcaf0); color: #000; }
  .smd-tab-panel .btn-outline-info { background: transparent; color: var(--bs-info, #31d2f2); border-color: var(--bs-info, #31d2f2); }
  .smd-tab-panel .btn-outline-secondary { background: transparent; color: var(--bs-secondary-color, #adb5bd); border-color: var(--bs-secondary-color, #6c757d); }
  .smd-tab-panel .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.85rem; border-radius: 0.25rem; }
  .smd-tab-panel .btn-wide, .smd-tab-panel .w-100 { width: 100%; }
  .smd-tab-panel .dropdown { position: relative; }
  .smd-tab-panel .dropdown-toggle {
    border: 1px solid var(--bs-border-color, #6c757d);
    background: var(--bs-tertiary-bg, #303030);
    color: var(--bs-body-color, #eee);
    text-align: left;
  }
  .smd-tab-panel .dropdown-toggle::after {
    content: "";
    display: inline-block;
    margin-left: 0.5rem;
    vertical-align: middle;
    border-top: 0.3em solid;
    border-right: 0.3em solid transparent;
    border-bottom: 0;
    border-left: 0.3em solid transparent;
    opacity: 0.7;
  }
  .smd-tab-panel .dropdown-menu {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    min-width: 100%;
    padding: 0.25rem 0;
    margin: 0.125rem 0 0;
    list-style: none;
    background: var(--bs-body-bg, #222);
    border: 1px solid var(--bs-border-color, #444);
    border-radius: 0.375rem;
  }
  .smd-tab-panel .dropdown-menu.show { display: block; }
  .smd-tab-panel .dropdown-menu-end { right: 0; left: auto; }
  .smd-tab-panel .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.35rem 1rem;
    color: var(--bs-body-color, #eee);
    text-decoration: none;
    cursor: pointer;
    background: transparent;
    border: none;
    text-align: left;
  }
  .smd-tab-panel .dropdown-item:hover, .smd-tab-panel .dropdown-item.active {
    background: var(--bs-primary, #0d6efd);
    color: #fff;
  }
  .smd-page-body .d-flex, .smd-tab-panel .d-flex { display: flex; }
  .smd-tab-panel .flex-column { flex-direction: column; }
  .smd-tab-panel .flex-grow-1 { flex-grow: 1; }
  .smd-tab-panel .flex-shrink-0 { flex-shrink: 0; }
  .smd-tab-panel .align-items-center { align-items: center; }
  .smd-tab-panel .align-self-center { align-self: center; }
  .smd-tab-panel .gap-1 { gap: 0.25rem; }
  .smd-tab-panel .gap-2 { gap: 0.5rem; }
  .smd-page-body .mb-0, .smd-tab-panel .mb-0 { margin-bottom: 0; }
  .smd-page-body .mb-1, .smd-tab-panel .mb-1 { margin-bottom: 0.25rem; }
  .smd-page-body .mb-2, .smd-tab-panel .mb-2 { margin-bottom: 0.5rem; }
  .smd-tab-panel .mb-3 { margin-bottom: 1rem; }
  .smd-tab-panel .mb-4 { margin-bottom: 1.5rem; }
  .smd-tab-panel .mt-1 { margin-top: 0.25rem; }
  .smd-tab-panel .mt-2 { margin-top: 0.5rem; }
  .smd-tab-panel .mt-3 { margin-top: 1rem; }
  .smd-tab-panel .ms-4 { margin-left: 1.5rem; }
  .smd-tab-panel .text-secondary { color: var(--bs-secondary-color, #adb5bd); }
  .smd-tab-panel .h-100 { height: 100%; }
  .smd-tab-panel .position-relative { position: relative; }
  .smd-tab-panel .task-drag-card {
    background: var(--bs-tertiary-bg, #2a2a2a);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
  }
  .smd-tab-panel .drag-handle {
    cursor: grab;
    color: var(--bs-secondary-color, #aaa);
    padding: 0 0.25rem;
    user-select: none;
  }
  .smd-tab-panel .task-desc-input { flex: 1 1 auto; min-width: 0; }
  .d-none { display: none !important; }
`;

var SETTINGS_STYLES = `
  .smd-tab-btn {
    padding: 0.5rem 0.25rem;
  }
  .smd-tab-panel *, .smd-tab-panel *::before, .smd-tab-panel *::after,
  #settingsFooter *, #settingsFooter *::before, #settingsFooter *::after {
    box-sizing: border-box;
  }
  .smd-tab-panel .row, #settingsFooter .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    width: 100%;
    max-width: 1040px;
    margin-bottom: 1.5rem;
  }
  .smd-tab-panel .col-md-8, #settingsFooter .col-md-8 { max-width: 1040px; }
  .smd-tab-panel .col-4, #settingsFooter .col-4 {
    flex: 0 0 33.333333%;
    max-width: 33.333333%;
    padding-right: 0.75rem;
  }
  .smd-tab-panel .col-8, #settingsFooter .col-8 {
    flex: 0 0 66.666667%;
    max-width: 66.666667%;
    padding-left: 0.75rem;
  }
  .smd-tab-panel .text-end, #settingsFooter .text-end { text-align: right; }
  .smd-tab-panel .form-label, #settingsFooter .form-label {
    margin-bottom: 0;
    font-weight: 500;
    color: var(--bs-body-color, #f8f9fa);
  }
  .smd-tab-panel .form-select,
  .smd-tab-panel .form-control {
    display: block;
    width: 100%;
    padding: 0.375rem 0.75rem;
    font-size: 0.95rem;
    font-weight: 400;
    line-height: 1.5;
    color: var(--bs-body-color, #f8f9fa);
    background-color: var(--bs-body-bg, #222222);
    background-clip: padding-box;
    border: 1px solid var(--bs-border-color, #495057);
    border-radius: 0.375rem;
  }
  .smd-tab-panel .form-control-plaintext {
    display: block;
    width: 100%;
    padding: 0.375rem 0.75rem;
    color: var(--bs-body-color, #f8f9fa);
  }
  .smd-tab-panel .form-switch { padding-left: 0; }
  .smd-tab-panel .form-check-input[type="checkbox"] {
    width: 2.5em;
    height: 1.5em;
    appearance: none;
    -webkit-appearance: none;
    margin: 0;
    vertical-align: middle;
    position: relative;
    background-color: var(--bs-secondary-bg, #495057);
    border: 1px solid var(--bs-border-color, #495057);
    border-radius: 2em;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
  }
  .smd-tab-panel .form-check-input[type="checkbox"]::before {
    content: "";
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 1.2em;
    height: 1.2em;
    border-radius: 50%;
    background-color: #fff;
    transition: transform 0.15s ease-in-out;
  }
  .smd-tab-panel .form-check-input[type="checkbox"]:checked {
    background-color: var(--bs-primary, #0d6efd);
    border-color: var(--bs-primary, #0d6efd);
  }
  .smd-tab-panel .form-check-input[type="checkbox"]:checked::before {
    transform: translateX(1em);
  }
  .smd-tab-panel .input-group {
    display: flex;
    align-items: stretch;
    width: 100%;
  }
  .smd-tab-panel .input-group > .form-control {
    flex: 1 1 auto;
    width: 1%;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
  .smd-tab-panel .input-group > .btn-outline-secondary {
    flex: 0 0 auto;
    border: 1px solid var(--bs-border-color, #6c757d);
    border-left: 0;
    background: var(--bs-tertiary-bg, #303030);
    color: var(--bs-secondary-color, #adb5bd);
    padding: 0.375rem 0.75rem;
    border-radius: 0 0.375rem 0.375rem 0;
    cursor: pointer;
  }
  .smd-tab-panel .btn {
    display: inline-block;
    padding: 0.375rem 0.75rem;
    font-size: 0.95rem;
    line-height: 1.5;
    text-align: center;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    cursor: pointer;
  }
  .smd-tab-panel .btn-danger { background: var(--bs-danger, #e74c3c); color: #fff; }
  .smd-tab-panel .btn-warning { background: var(--bs-warning, #f39c12); color: #000; }
  .smd-tab-panel .btn-primary { background: var(--bs-primary, #0d6efd); color: #fff; }
  .smd-tab-panel .editor-btn, .smd-tab-panel .btn-wide, .smd-tab-panel .w-100 { display: block; width: 100%; }
  .smd-tab-panel .mb-2 { margin-bottom: 0.5rem; }
  .smd-tab-panel .mb-3 { margin-bottom: 1rem; }
  .smd-tab-panel .mb-4 { margin-bottom: 1.5rem; }
  .smd-tab-panel .mt-1 { margin-top: 0.25rem; }
  .smd-tab-panel .mt-3 { margin-top: 1rem; }
  .d-none { display: none !important; }
  #settingsFooter .mt-3 { margin-top: 1rem; }
  #settingsFooter .mt-5 { margin-top: 3rem; }
  #settingsFooter .mb-3 { margin-bottom: 1rem; }
  #settingsFooter .small { font-size: 0.875em; }
  #settingsFooter .build-number { color: var(--bs-secondary-color, #adb5bd); }
`;

function injectSettingsStyles() {
  var sp = document.getElementById("settingsPage");
  if (sp && sp.shadowRoot) {
    injectStyleInto(sp.shadowRoot);
  }
  var tabs = $id("settingsTabs");
  if (tabs && tabs.shadowRoot) {
    injectStyleInto(tabs.shadowRoot);
  }
}

function injectJobEditStyles() {
  var page = document.getElementById("jobEditPage");
  if (page && page.shadowRoot) {
    injectStyleInto(page.shadowRoot, JOBS_EDITOR_STYLES);
  }
  var tabs = $id("jobEditTabs");
  if (tabs && tabs.shadowRoot) {
    injectStyleInto(tabs.shadowRoot, JOBS_EDITOR_STYLES);
  }
}

function injectStyleInto(root, css) {
  if (!root || root.querySelector(".smd-shared-style")) return;
  var style = document.createElement("style");
  style.className = "smd-shared-style";
  style.textContent = css || SETTINGS_STYLES;
  root.appendChild(style);
}

function buildSettingsContent() {
  const settingsPage = document.getElementById("settingsPage");
  if (!settingsPage) return;
  const { sections, footerHtml } = getSettingsSections();

  settingsPage.title = "Settings";
  settingsPage.content = '<smd-tabs id="settingsTabs"></smd-tabs>' + footerHtml;
  settingsPage.buttons = [{ text: "Done", variant: "success", action: "done" }];

  const tabsEl = $id("settingsTabs");
  if (tabsEl) tabsEl.tabs = sections;
  injectSettingsStyles();
}

function openSettings() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("imagesEditor").classList.add("d-none");
  document.getElementById("jobSearchEditor").classList.add("d-none");

  const settingsPage = document.getElementById("settingsPage");
  if (_settingsCloseTimer) {
    clearTimeout(_settingsCloseTimer);
    _settingsCloseTimer = null;
  }
  settingsPage.classList.remove("d-none");
  buildSettingsContent();
  settingsPage.show();
  if (typeof bindMinioSettingsTabBehavior === "function") bindMinioSettingsTabBehavior();

  const savedTheme = localStorage.getItem("planmydays_theme") || "darkly";
  const themeSel = $id("themeSelector");
  if (themeSel) themeSel.value = savedTheme;
  const savedFontSize = localStorage.getItem("planmydays_fontSize") || "xlarge";
  const fontSizeSel = $id("fontSizeSelector");
  if (fontSizeSel) fontSizeSel.value = savedFontSize;
  const splitList = localStorage.getItem("planmydays_splitList") === "true";
  const splitListCb = $id("splitList");
  if (splitListCb) splitListCb.checked = splitList;
  const autoHide = localStorage.getItem("planmydays_autoHideMenu") === "true";
  const autoHideCb = $id("autoHideMenu");
  if (autoHideCb) autoHideCb.checked = autoHide;
  const hideDone = localStorage.getItem("planmydays_hideDone") === "true";
  const hideDoneCb = $id("hideDone");
  if (hideDoneCb) hideDoneCb.checked = hideDone;
  const suffixStart = localStorage.getItem("planmydays_suffixStart") || "0";
  const suffixStartSel = $id("suffixStartSelector");
  if (suffixStartSel) suffixStartSel.value = suffixStart;
  const jan1 = localStorage.getItem("planmydays_jan1") || "1";
  const jan1Sel = $id("jan1Selector");
  if (jan1Sel) jan1Sel.value = jan1;
  const monday = localStorage.getItem("planmydays_monday") || "1";
  const mondaySel = $id("mondaySelector");
  if (mondaySel) mondaySel.value = monday;
  const startWeek = localStorage.getItem("planmydays_startWeek") || "1";
  const startWeekSel = $id("startWeekSelector");
  if (startWeekSel) startWeekSel.value = startWeek;
  const showDanger = localStorage.getItem("planmydays_showDanger") === "true";
  const showDangerCb = $id("showDanger");
  if (showDangerCb) showDangerCb.checked = showDanger;
  const skipAdhoc = localStorage.getItem("planmydays_skipAdhocConfirm") === "true";
  const skipAdhocCb = $id("skipAdhocConfirm");
  if (skipAdhocCb) skipAdhocCb.checked = skipAdhoc;
  const dangerIds = ["clearAllDataRow", "refreshAppRow", "regenerateTilesRow", "sortJobsInStreamsRow", "uploadStandardImagesRow"];
  if (isDevMode) dangerIds.push("devTodayRow", "devLastGenRow");
  dangerIds.forEach(id => {
    const el = $id(id);
    if (el) el.classList.toggle("d-none", !showDanger);
  });

  if (typeof loadMinioSettings === "function") loadMinioSettings();

  if (isDevMode) {
    ["devTodayInput", "devLastGenInput"].forEach(id => {
      const el = $id(id);
      if (!el) return;
      const key = id === "devTodayInput" ? "devToday" : "devLastGen";
      const saved = localStorage.getItem(key) || "";
      if (el._flatpickr) el._flatpickr.destroy();
      flatpickr(el, {
        dateFormat: "Y-m-d",
        allowInput: true,
        monthSelectorType: "dropdown",
        defaultDate: saved || undefined,
        onChange: function(selectedDates, dateStr) {
          localStorage.setItem(key, dateStr);
          if (key === "devToday" && typeof renderMain === "function") renderMain();
        }
      });
    });
  }

  const qrContainer = $id("shareQrCode");
  if (qrContainer) {
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, {
      text: "https://ownimage.github.io/PlanMyDay",
      width: 120,
      height: 120,
      margin: 8
    });
  }

  const savedIconSize = localStorage.getItem("planmydays_iconSize") || "large";
  const iconSel = $id("iconSizeSelector");
  if (iconSel) iconSel.value = savedIconSize;
  const savedDensity = localStorage.getItem("planmydays_density") || "normal";
  const densitySel = $id("densitySelector");
  if (densitySel) densitySel.value = savedDensity;
  const savedDragSize = localStorage.getItem("planmydays_dragSize") || "large";
  const dragSizeSel = $id("dragSizeSelector");
  if (dragSizeSel) dragSizeSel.value = savedDragSize;

  if (typeof updateScreenResolution === "function") updateScreenResolution();
}

function closeSettings() {
  const settingsPage = document.getElementById("settingsPage");
  if (settingsPage) {
    settingsPage.hide();
    if (_settingsCloseTimer) clearTimeout(_settingsCloseTimer);
    _settingsCloseTimer = setTimeout(function() {
      settingsPage.classList.add("d-none");
    }, 320);
  }
  document.getElementById("countdownContainer").classList.remove("d-none");
  delete document.getElementById("countdownContainer").dataset.showAll;
  renderMain();
}

function regenerateTiles() {
  const streams = loadStreams();
  const today = getTodayStr();
  streams.forEach(stream => {
    (stream.jobs || []).forEach(job => {
      if (job.sleepUntil && job.sleepUntil <= today) {
        job.sleepUntil = "";
      }
    });
  });
  saveStreams(streams);
  const merged = addScheduleJobsToOrder([]);
  saveTodayOrder(merged);
  saveCompletedJobs([]);
  localStorage.setItem("planmydays_last_gen", getTodayStr());
  closeSettings();
  renderMain();
}

function sortJobsInStreams() {
  const streams = loadStreams();
  streams.forEach(stream => {
    const jobs = stream.jobs || [];
    if (jobs.length < 2) return;
    const sorted = sortJobsByRules(jobs);
    sorted.forEach((j, i) => { j.sequence = i + 1; });
    stream.jobs = sorted;
  });
  saveStreams(streams);
  closeSettings();
  renderMain();
}

function confirmClearAllData() {
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = "Clear ALL data? This cannot be undone.";
  document.getElementById("deleteConfirmBtn").onclick = function() {
    const keys = Object.keys(localStorage);
    keys.forEach(k => localStorage.removeItem(k));
    safeHideModal("deleteConfirmModal");
    closeSettings();
  };
  new bootstrap.Modal(modalEl).show();
}

function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    streams: JSON.parse(localStorage.getItem("planmydays_streams") || "[]"),
    images: JSON.parse(localStorage.getItem("planmydays_images") || "[]")
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const d = new Date();
  const ts = d.getFullYear() + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0") + String(d.getHours()).padStart(2,"0") + String(d.getMinutes()).padStart(2,"0");
  a.download = `planmydays-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data || (!data.streams && !data.images)) {
          alert("Invalid backup file: missing streams or images data.");
          return;
        }
        if (data.streams) localStorage.setItem("planmydays_streams", JSON.stringify(data.streams));
        if (data.images) localStorage.setItem("planmydays_images", JSON.stringify(data.images));
        regenerateTiles();
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

document.addEventListener("DOMContentLoaded", () => {
  const settingsPage = document.getElementById("settingsPage");
  if (settingsPage) {
    settingsPage.addEventListener("smd-page-action", () => closeSettings());
  }

  const jobEditPage = document.getElementById("jobEditPage");
  if (jobEditPage) {
    jobEditPage.addEventListener("smd-page-action", (e) => {
      const action = e.detail && (typeof e.detail === "string" ? e.detail : e.detail.action);
      if (!action) return;
      if (action === "edit") {
        editJobFromView();
      } else if (action === "cancel") {
        cancelJobEdit();
      } else if (action === "done") {
        doneJobEdit();
      } else if (action === "delete") {
        deleteJobFromEdit();
      }
    });
  }

  const savedTheme = localStorage.getItem("planmydays_theme") || "darkly";
  applyTheme(savedTheme);
  if (typeof seedSampleImages === "function") seedSampleImages();

  renderMain();

  if (typeof updateMinioMenu === "function") updateMinioMenu();

  const streamEditorList = document.getElementById("streamEditorList");
  if (streamEditorList) {
    streamEditorList.addEventListener("shown.bs.collapse", function(e) {
      const item = e.target.closest(".stream-accordion-item");
      if (item) item.classList.add("expanded");
    });
    streamEditorList.addEventListener("hidden.bs.collapse", function(e) {
      const item = e.target.closest(".stream-accordion-item");
      if (item) item.classList.remove("expanded");
    });
  }
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
    indicator.innerHTML = dist >= THRESHOLD ? "\u21E9 Release to refresh" : "\u21E9 Pull to refresh";
    indicator.style.height = Math.min(dist, 50) + "px";
  }
  document.addEventListener("touchstart", e => {
    if (window.scrollY !== 0) return;
    if (e.target.closest(".modal")) return;
    startY = e.touches[0].clientY; pulling = true; pullDist = 0;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!pulling) return;
    if (e.defaultPrevented) { pulling = false; pullDist = 0; indicator.style.height = "0"; return; }
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { pullDist = 0; return; }
    pullDist = dy; adjustIcon(dy);
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!pulling) return;
    pulling = false; indicator.style.height = "0";
    if (pullDist >= THRESHOLD) { spinner.style.display = "block"; setTimeout(() => { location.reload(); }, 400); }
    pullDist = 0;
  }, { passive: true });
})();







