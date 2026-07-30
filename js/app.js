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

function hideAllEditors() {
  document.getElementById("countdownContainer").classList.remove("d-none");
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("imagesEditor").classList.add("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
}

function updateNavState() {
  const nav = document.getElementById("mainNav");
  if (nav) nav.classList.toggle("nav-inactive", false);
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// TOUCH DRAG AND DROP (iOS fallback)
function addTouchDnD(container, cardSelector, getSrcId, reorderCallback) {
  let touchSrc = null;

  container.addEventListener("touchstart", e => {
    const card = e.target.closest(cardSelector);
    if (!card) return;
    touchSrc = getSrcId(card);
    card.classList.add("dragging");
  }, { passive: true });

  container.addEventListener("touchmove", e => {
    if (touchSrc === null || touchSrc === undefined) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el ? el.closest(cardSelector) : null;
    if (!target) return;
    container.querySelectorAll(cardSelector).forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
    const rect = target.getBoundingClientRect();
    target.classList.add(touch.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
  }, { passive: false });

  container.addEventListener("touchend", e => {
    if (touchSrc === null || touchSrc === undefined) { touchSrc = null; return; }
    container.querySelectorAll(cardSelector).forEach(c => c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"));
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el ? el.closest(cardSelector) : null;
    if (target) {
      const dstSrc = getSrcId(target);
      if (touchSrc !== dstSrc) {
        const rect = target.getBoundingClientRect();
        const above = touch.clientY < rect.top + rect.height / 2;
        reorderCallback(touchSrc, dstSrc, above);
        touchSrc = null;
        return;
      }
    }
    touchSrc = null;
  }, { passive: true });

  container.addEventListener("touchcancel", () => {
    if (touchSrc === null || touchSrc === undefined) return;
    container.querySelectorAll(cardSelector).forEach(c => c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"));
    touchSrc = null;
  }, { passive: true });
}

var _jobDnDSetup = false;
var _jobDragSrcIdx = -1;
var _jobDragSrcStreamIdx = -1;

function setupJobDnD(list) {
  if (_jobDnDSetup) return;
  _jobDnDSetup = true;

  list.addEventListener("dragstart", function(e) {
    var card = e.target.closest(".job-drag-card");
    if (!card || card.getAttribute("draggable") === "false") return;
    _jobDragSrcIdx = parseInt(card.dataset.jobIdx);
    _jobDragSrcStreamIdx = parseInt(card.dataset.streamIdx);
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragend", function(e) {
    list.querySelectorAll(".job-drag-card").forEach(function(c) { c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"); });
  });
  list.addEventListener("dragover", function(e) {
    e.preventDefault();
    var target = e.target.closest(".job-drag-card");
    if (!target || _jobDragSrcIdx < 0 || target.getAttribute("draggable") === "false") return;
    if (String(target.dataset.streamIdx) !== String(_jobDragSrcStreamIdx)) return;
    list.querySelectorAll(".job-drag-card").forEach(function(c) { c.classList.remove("drag-over-top", "drag-over-bottom"); });
    var rect = target.getBoundingClientRect();
    target.classList.add(e.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
  });
  list.addEventListener("drop", function(e) {
    e.preventDefault();
    list.querySelectorAll(".job-drag-card").forEach(function(c) { c.classList.remove("drag-over-top", "drag-over-bottom"); });
    var target = e.target.closest(".job-drag-card");
    if (!target || _jobDragSrcIdx < 0 || target.getAttribute("draggable") === "false") return;
    if (String(target.dataset.streamIdx) !== String(_jobDragSrcStreamIdx)) return;
    var dropIdx = parseInt(target.dataset.jobIdx);
    if (dropIdx === _jobDragSrcIdx) { _jobDragSrcIdx = -1; _jobDragSrcStreamIdx = -1; return; }
    var streams = loadStreams();
    var streamJobs = streams[_jobDragSrcStreamIdx].jobs || [];
    var srcSeq = streamJobs[_jobDragSrcIdx].sequence || 0;
    var dstSeq = streamJobs[dropIdx].sequence || 0;
    streamJobs[_jobDragSrcIdx].sequence = dstSeq;
    streamJobs[dropIdx].sequence = srcSeq;
    streams[_jobDragSrcStreamIdx].jobs = streamJobs;
    saveStreams(streams);
    _jobDragSrcIdx = -1;
    _jobDragSrcStreamIdx = -1;
    renderStreamsEditor();
  });
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
  addBtn.innerHTML = "&#43; Add job";
  addBtn.onclick = function() { addTodayCardWithModal(); };
  headingRow.appendChild(addBtn);
  container.appendChild(headingRow);

  // inline add form (hidden initially)
  const addForm = document.createElement("div");
  addForm.id = "addCardForm";
  addForm.className = "card p-3 mb-3 d-none flex-shrink-0";
  container.appendChild(addForm);

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
  let jobsToRender = allJobs;

  if (splitList) {
    const tab = container.dataset.todayTab || "progress";
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

    jobsToRender = allJobs.filter(({ streamIdx }) => {
      const s = streams[streamIdx];
      return (s.tab || "progress") === tab;
    });
  }

  const scrollBody = document.createElement("div");
  scrollBody.id = "countdownScrollBody";
  container.appendChild(scrollBody);

  const cardContainer = document.createElement("div");
  cardContainer.id = "todayCardList";

  if (jobsToRender.length === 0) {
    const msg = document.createElement("p");
    msg.className = "text-secondary";
    msg.textContent = splitList ? "No jobs in this tab." : "No active jobs yet. Add streams with active jobs to get started.";
    scrollBody.appendChild(msg);
    updateNavState();
    return;
  }

  jobsToRender.forEach(({ job, streamTitle, streamIdx, jobIdx }) => {
    const isDone = completed.includes(job.id);
    const streams = loadStreams();
    const stream = streams[streamIdx] || {};
    const streamImageUrl = getImageDataUrl(stream.image);
    const jobImageUrl = getImageDataUrl(job.image);
    const suffixLabel = getJobSuffix(job);
    const card = document.createElement("div");
    card.className = `card countdown-card mb-2 today-drag-card ${isDone ? "opacity-50" : ""}`;
    card.draggable = true;
    card.dataset.jobId = job.id;
    card.dataset.streamIdx = streamIdx;
    card.innerHTML = `
      <div class="row align-items-center">
        <div class="col-auto d-flex align-items-center">
          <div class="drag-handle text-secondary" style="cursor:grab;font-size:1.2rem;line-height:1;display:flex;align-items:center">&#9776;</div>
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
            <span class="badge rounded-pill bg-${(stream.tab || "progress") === "progress" ? "success" : "warning"}">${escapeHtml(stream.tab || "progress")}</span>
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
              bootstrap.Modal.getInstance(modalEl).hide();
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

  // today page drag and drop
  let todayDragSrc = null;
  cardContainer.addEventListener("dragstart", e => {
    const card = e.target.closest(".today-drag-card");
    if (!card) return;
    todayDragSrc = card.dataset.jobId;
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  cardContainer.addEventListener("dragend", e => {
    cardContainer.querySelectorAll(".today-drag-card").forEach(c => c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"));
  });
  cardContainer.addEventListener("dragover", e => {
    e.preventDefault();
    const target = e.target.closest(".today-drag-card");
    if (!target || !todayDragSrc) return;
    cardContainer.querySelectorAll(".today-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
    const rect = target.getBoundingClientRect();
    target.classList.add(e.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
  });
  cardContainer.addEventListener("drop", e => {
    e.preventDefault();
    cardContainer.querySelectorAll(".today-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
    const target = e.target.closest(".today-drag-card");
    if (!target || !todayDragSrc || target.dataset.jobId === todayDragSrc) { todayDragSrc = null; return; }
    const cards = [...cardContainer.querySelectorAll(".today-drag-card")];
    const visibleIds = cards.map(c => c.dataset.jobId);
    const srcIdx = visibleIds.indexOf(todayDragSrc);
    const dstIdx = visibleIds.indexOf(target.dataset.jobId);
    if (srcIdx < 0 || dstIdx < 0) { todayDragSrc = null; return; }
    visibleIds.splice(srcIdx, 1);
    const rect = target.getBoundingClientRect();
    const above = e.clientY < rect.top + rect.height / 2;
    const insertAt = srcIdx < dstIdx ? (above ? dstIdx - 1 : dstIdx) : (above ? dstIdx : dstIdx + 1);
    visibleIds.splice(insertAt, 0, todayDragSrc);
    const fullOrder = loadTodayOrder() || [];
    const visibleSet = new Set(visibleIds);
    let vi = 0;
    const mergedOrder = fullOrder.map(id => visibleSet.has(id) ? visibleIds[vi++] : id);
    saveTodayOrder(mergedOrder);
    todayDragSrc = null;
    renderMain();
  });

  // touch DnD fallback for iOS
  addTouchDnD(cardContainer, ".today-drag-card", c => c.dataset.jobId, (srcId, dstId, above) => {
    const cards = [...cardContainer.querySelectorAll(".today-drag-card")];
    const visibleIds = cards.map(c => c.dataset.jobId);
    const srcIdx = visibleIds.indexOf(srcId);
    const dstIdx = visibleIds.indexOf(dstId);
    if (srcIdx < 0 || dstIdx < 0) return;
    visibleIds.splice(srcIdx, 1);
    const insertAt = srcIdx < dstIdx ? (above ? dstIdx - 1 : dstIdx) : (above ? dstIdx : dstIdx + 1);
    visibleIds.splice(insertAt, 0, srcId);
    const fullOrder = loadTodayOrder() || [];
    const visibleSet = new Set(visibleIds);
    let vi = 0;
    const mergedOrder = fullOrder.map(id => visibleSet.has(id) ? visibleIds[vi++] : id);
    saveTodayOrder(mergedOrder);
    renderMain();
  });

  updateNavState();
}

function showAddCardForm() {
  const form = document.getElementById("addCardForm");
  if (!form) return;
  form.classList.toggle("d-none");
  if (form.classList.contains("d-none")) return;
  form.innerHTML = `
    <div class="mb-2">
      <input class="form-control" id="newCardTitle" placeholder="Job title" value="">
    </div>
    <div class="mb-2">
      <textarea class="form-control" id="newCardDesc" placeholder="Description (optional)" rows="2"></textarea>
    </div>
    <div class="d-flex gap-2">
      <button class="btn btn-primary editor-btn" id="btnAddJobInline" onclick="addTodayCard()">Add</button>
      <button class="btn btn-secondary editor-btn" id="btnCancelInline" onclick="document.getElementById('addCardForm').classList.add('d-none')">Cancel</button>
    </div>
  `;
}

function addTodayCard() {
  const title = document.getElementById("newCardTitle").value.trim();
  if (!title) return;
  const desc = document.getElementById("newCardDesc").value.trim();
  const streams = loadStreams();
  let stream = streams.find(t => t.title === "Ad Hoc");
  if (!stream) {
    stream = { title: "Ad Hoc", sequence: streams.length + 1, jobs: [] };
    streams.push(stream);
  }
  const jobs = stream.jobs || [];
  const newJob = { id: "job_" + Date.now(), title, sequence: jobs.length + 1, description: desc, active: true, frequency: "daily" };
  jobs.push(newJob);
  stream.jobs = jobs;
  saveStreams(streams);
  const order = loadTodayOrder() || [];
  const allActive = [];
  streams.forEach(t => { (t.jobs || []).forEach(j => { if (j.active !== false) allActive.push(j.id); }); });
  const remaining = allActive.filter(id => order.includes(id));
  remaining.push(newJob.id);
  saveTodayOrder(remaining);
  renderMain();
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
  const newJob = { id: "job_" + Date.now(), title: "", sequence: seq, description: "", active: true, frequency: "daily", time: "", sleepUntil: "", schedule: { type: "daily" } };
  jobs.push(newJob);
  stream.jobs = jobs;
  saveStreams(streams);
  jobsBuffer = JSON.parse(JSON.stringify(newJob));
  jobsEditingIdx = jobs.length - 1; isNewJob = true;
  showJobEditModal();
}

// THREADS EDITOR
let editingIndex = -1;
let editBuffer = null;
let isNew = false;
let dragIndex = -1;

function openStreamsEditor() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("streamsEditor").classList.remove("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
  renderStreamsEditor();
}

function closeStreamsEditor() {
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  editingIndex = -1; editBuffer = null; isNew = false;
  renderMain();
}

function showStreamEditModal() {
  const streams = loadStreams();
  const t = streams[editingIndex];
  const data = editBuffer || t;
  document.getElementById("streamEditModalTitle").textContent = isNew ? "Add Stream" : "Edit Stream";
  document.getElementById("streamEditModalBody").innerHTML = getStreamEditFormHTML(data);
  new bootstrap.Modal(document.getElementById("streamEditModal")).show();
}

function getStreamEditFormHTML(data) {
  return `
    <div class="mb-2">
      <label class="form-label">Title</label>
      <input class="form-control" value="${escapeHtml(data.title || "")}" oninput="editField('title', this.value)">
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
        <button class="btn btn-primary btn-sm" id="btnStreamImageChoose" onclick="openImagePicker(function(name){ editField('image', name); updateStreamImagePreview(name); })">Change</button>
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

  // remember which accordion items are expanded
  var expandedStreams = [];
  var openCollapses = list.querySelectorAll(".accordion-collapse.show");
  for (var ec = 0; ec < openCollapses.length; ec++) {
    var m = openCollapses[ec].id.match(/streamCollapse_(\d+)/);
    if (m) expandedStreams.push(parseInt(m[1]));
  }

  list.innerHTML = ""; addTile.innerHTML = ""; topTile.innerHTML = ""; filterEl.innerHTML = ""; singleEditor.innerHTML = "";

  const streams = loadStreams();

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

  sorted.forEach(function(t, displayIdx) {
    var realIdx = streams.indexOf(t);
    var streamImgUrl = getImageDataUrl(t.image);
    var jobs = t.jobs || [];
    var collapseId = "streamCollapse_" + realIdx;

    var item = document.createElement("div");
    item.className = "accordion-item stream-accordion-item stream-drag-card mb-2";
    item.draggable = true;
    item.dataset.index = realIdx;

    var headerHtml = '<h2 class="accordion-header d-flex align-items-center gap-2 p-2" id="streamHeading_' + realIdx + '">' +
      '<div class="drag-handle text-secondary" style="cursor:grab;font-size:1.3rem;line-height:1;flex-shrink:0">&#9776;</div>' +
      '<div style="width:40px;height:40px;flex-shrink:0">' + (streamImgUrl ? '<img src="' + streamImgUrl + '" class="date-img" style="max-width:40px;max-height:40px">' : '') + '</div>' +
      '<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#' + collapseId + '" aria-expanded="false">' +
        '<div style="display:flex;flex-direction:column;min-width:0;flex:1;gap:0.25rem">' +
          '<span class="fw-bold editor-title">' + escapeHtml(t.title) + '</span>' +
          '<div style="display:flex;gap:0.25rem">' +
            '<span class="badge bg-' + ((t.tab || "progress") === "progress" ? "success" : "primary") + '">' + escapeHtml(t.tab || "progress") + '</span>' +
            (jobs.length > 0 ? '<span class="badge bg-secondary">' + jobs.length + ' job' + (jobs.length !== 1 ? 's' : '') + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</button>' +
      '<button class="btn btn-primary editor-btn flex-shrink-0" style="min-width:60px" onclick="event.stopPropagation(); editStream(' + realIdx + ')">Edit</button>' +
      (jobs.length === 0 ? '<button class="btn btn-danger editor-btn flex-shrink-0" style="min-width:60px" onclick="event.stopPropagation(); confirmDeleteStream(' + realIdx + ')">Delete</button>' : '') +
    '</h2>';

    var bodyHtml = '<div id="' + collapseId + '" class="accordion-collapse collapse" data-bs-parent="#streamEditorList">' +
      '<div class="accordion-body stream-accordion-body">' +
        (jobs.length > 0 ? renderJobsInAccordion(t, jobs, realIdx) : '<div class="text-secondary small mb-2">No jobs</div>') +
        '<button class="btn btn-primary btn-sm" onclick="addNewJobForStream(' + realIdx + ')">Add Job</button>' +
      '</div>' +
    '</div>';

    item.innerHTML = headerHtml + bodyHtml;
    list.appendChild(item);
  });

  // stream drag and drop handlers
  var dragSrcIndex = -1;
  list.addEventListener("dragstart", function(e) {
    var card = e.target.closest(".stream-drag-card");
    if (!card) return;
    // ignore drags inside accordion body (job cards)
    if (card.closest(".accordion-body")) return;
    dragSrcIndex = parseInt(card.dataset.index);
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragend", function(e) {
    document.querySelectorAll(".stream-drag-card").forEach(function(c) { c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"); });
  });
  list.addEventListener("dragover", function(e) {
    e.preventDefault();
    var target = e.target.closest(".stream-drag-card");
    if (!target || dragSrcIndex < 0) return;
    // ignore drag targets inside accordion bodies
    if (target.closest(".accordion-body")) return;
    document.querySelectorAll(".stream-drag-card").forEach(function(c) { c.classList.remove("drag-over-top", "drag-over-bottom"); });
    var rect = target.getBoundingClientRect();
    target.classList.add(e.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
  });
  list.addEventListener("drop", function(e) {
    e.preventDefault();
    document.querySelectorAll(".stream-drag-card").forEach(function(c) { c.classList.remove("drag-over-top", "drag-over-bottom"); });
    var target = e.target.closest(".stream-drag-card");
    if (!target || dragSrcIndex < 0) return;
    if (target.closest(".accordion-body")) return;
    var dropIndex = parseInt(target.dataset.index);
    if (dropIndex === dragSrcIndex) { dragSrcIndex = -1; return; }
    var s = loadStreams();
    var moved = s.splice(dragSrcIndex, 1)[0];
    var rect = target.getBoundingClientRect();
    var above = e.clientY < rect.top + rect.height / 2;
    var insertAt;
    if (dragSrcIndex < dropIndex) {
      var actualDropIdx = dropIndex - 1;
      insertAt = above ? actualDropIdx : actualDropIdx + 1;
    } else {
      insertAt = above ? dropIndex : dropIndex + 1;
    }
    s.splice(insertAt, 0, moved);
    s.forEach(function(t, i) { t.sequence = i + 1; });
    saveStreams(s);
    dragSrcIndex = -1;
    renderStreamsEditor();
  });

  // touch DnD fallback for iOS
  addTouchDnD(list, ".stream-drag-card", function(c) {
    if (c.closest(".accordion-body")) return -1;
    return parseInt(c.dataset.index);
  }, function(srcIdx, dstIdx, above) {
    if (srcIdx === dstIdx || srcIdx < 0) return;
    var s = loadStreams();
    var moved = s.splice(srcIdx, 1)[0];
    var insertAt;
    if (srcIdx < dstIdx) {
      insertAt = above ? dstIdx - 1 : dstIdx + 1;
    } else {
      insertAt = above ? dstIdx : dstIdx + 1;
    }
    s.splice(insertAt, 0, moved);
    s.forEach(function(t, i) { t.sequence = i + 1; });
    saveStreams(s);
    renderStreamsEditor();
  });

  // delegated active toggle handler for jobs
  list.addEventListener("change", function(e) {
    if (!e.target.classList.contains("active-toggle")) return;
    var jobIdx = parseInt(e.target.dataset.jobIdx);
    var streamIdx = parseInt(e.target.dataset.streamIdx);
    var streams = loadStreams();
    var jobs = streams[streamIdx].jobs || [];
    if (jobs[jobIdx]) jobs[jobIdx].active = e.target.checked;
    saveStreams(streams);
  });

  // set up job DnD once (not re-added on each render)
  setupJobDnD(list);

  topTile.innerHTML = '<div class="d-flex gap-2">' +
    '<button class="btn btn-primary editor-btn btn-wide" id="btnAddStream" onclick="addNewStream()">Add Stream</button>' +
    '<button class="btn btn-success editor-btn btn-wide ms-auto" id="btnStreamsDone" onclick="closeStreamsEditor()">Done</button>' +
  '</div>';

  // restore previously expanded accordion items
  expandedStreams.forEach(function(idx) {
    var collapseEl = document.getElementById("streamCollapse_" + idx);
    if (collapseEl) {
      collapseEl.classList.add("show");
    }
    var btn = document.querySelector('#streamEditorList [data-bs-target="#streamCollapse_' + idx + '"]');
    if (btn) {
      btn.classList.remove("collapsed");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  updateNavState();
}

function renderJobsInAccordion(stream, jobs, streamIdx) {
  var sorted = [].concat(jobs).sort(function(a, b) {
    var aHasTime = a.time && a.time.trim() ? 0 : 1;
    var bHasTime = b.time && b.time.trim() ? 0 : 1;
    if (aHasTime !== bHasTime) return aHasTime - bHasTime;
    return (a.sequence || 0) - (b.sequence || 0);
  });
  return sorted.map(function(j) {
    var realIdx = jobs.indexOf(j);
    var scheduleText = getScheduleText(j.schedule);
    var jobImgUrl = getImageDataUrl(j.image);
    var hasTime = j.time && j.time.trim();
    return '<div class="card p-3 mb-2 job-drag-card" draggable="' + (hasTime ? 'false' : 'true') + '" data-job-idx="' + realIdx + '" data-stream-idx="' + streamIdx + '" style="cursor:' + (hasTime ? 'default' : 'grab') + '">' +
      '<div class="d-flex align-items-center gap-2 mb-1">' +
        (jobImgUrl ? '<div style="width:40px;height:40px;flex-shrink:0"><img src="' + jobImgUrl + '" class="date-img" style="max-width:40px;max-height:40px"></div>' : '') +
        '<div class="fw-bold editor-title">' + escapeHtml(j.title) + (getJobSuffix(j) ? ' <span class="badge bg-secondary">' + escapeHtml(getJobSuffix(j).trim()) + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="d-flex gap-2 align-items-center small mb-2">' +
        '<label class="form-check-label mb-0 fw-bold" style="cursor:pointer;display:flex;align-items:center;gap:4px">' +
          '<input class="form-check-input active-toggle m-0 position-static" type="checkbox" data-job-idx="' + realIdx + '" data-stream-idx="' + streamIdx + '" ' + (j.active !== false ? "checked" : "") + ' style="cursor:pointer">' +
          'Active' +
        '</label>' +
        '<span class="badge bg-primary">' + escapeHtml(scheduleText) + '</span>' +
        (j.sleepUntil ? '<span class="badge bg-info">Sleep: ' + escapeHtml(formatDate(j.sleepUntil)) + '</span>' : '') +
        (hasTime ? '<span class="badge bg-secondary">' + escapeHtml(j.time) + '</span>' : '') +
      '</div>' +
      (j.description ? '<div class="text-secondary small mb-2">' + escapeHtml(j.description.substring(0, 80)) + (j.description.length > 80 ? "..." : "") + '</div>' : '') +
      '<div class="d-flex gap-2">' +
        '<button class="btn btn-primary editor-btn flex-fill" onclick="editJobInAccordion(' + streamIdx + ', ' + realIdx + ')">Edit</button>' +
        '<button class="btn btn-danger editor-btn flex-fill" onclick="confirmDeleteJobInAccordion(' + streamIdx + ', ' + realIdx + ')">Delete</button>' +
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
  var preview = document.getElementById("jobImagePreview");
  var nameEl = document.getElementById("jobImageName");
  var removeBtn = document.getElementById("jobImageRemoveBtn");
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
  var preview = document.getElementById("jobStreamPreview");
  if (!preview) return;
  var streams = loadStreams();
  var stream = streams[jobsTargetStreamIndex >= 0 ? jobsTargetStreamIndex : jobsStreamIndex];
  var url = getImageDataUrl(stream && stream.image);
  if (url) {
    preview.innerHTML = '<img src="' + url + '" class="date-img" style="max-width:45px;max-height:45px">';
  } else {
    preview.innerHTML = '<span class="text-secondary small" style="font-size:0.6rem">none</span>';
  }
}
function jobChangeStream(newIdx) {
  jobsTargetStreamIndex = newIdx;
  updateJobStreamPreview();
}

function editStream(index) {
  var streams = loadStreams();
  editBuffer = JSON.parse(JSON.stringify(streams[index]));
  editingIndex = index; isNew = false;
  showStreamEditModal();
}

function cancelEdit() {
  var modal = bootstrap.Modal.getInstance(document.getElementById("streamEditModal"));
  if (modal) modal.hide();
  if (isNew && editingIndex >= 0) {
    var streams = loadStreams();
    streams.splice(editingIndex, 1);
    saveStreams(streams);
  }
  editingIndex = -1; editBuffer = null; isNew = false;
  renderStreamsEditor();
}

function doneEdit() {
  var modal = bootstrap.Modal.getInstance(document.getElementById("streamEditModal"));
  if (editingIndex >= 0 && editBuffer) {
    var streams = loadStreams();
    streams[editingIndex] = editBuffer;
    saveStreams(streams);
  }
  if (modal) modal.hide();
  editingIndex = -1; editBuffer = null; isNew = false;
  renderStreamsEditor();
}

function confirmDeleteStream(index) {
  editingIndex = index;
  var modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete this stream?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    var streams = loadStreams();
    streams.splice(index, 1);
    streams.forEach(function(t, i) { t.sequence = i + 1; });
    saveStreams(streams);
    bootstrap.Modal.getInstance(modalEl).hide();
    editingIndex = -1; editBuffer = null; isNew = false;
    renderStreamsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewStream() {
  var streams = loadStreams();
  var seq = streams.length + 1;
  var newStream = { title: "New Stream", sequence: seq, description: "", jobs: [], tab: "progress" };
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

function jobField(field, value) {
  if (!jobsBuffer) return;
  jobsBuffer[field] = value;
}
function jobTimeChanged() {
  const h = document.getElementById("jobTimeHour").value;
  const m = document.getElementById("jobTimeMin").value;
  jobField("time", h && m ? h + ":" + m : "");
}
function clearSleepUntil() {
  jobField("sleepUntil", "");
  const fpInput = document.getElementById("jobSleepUntil");
  if (fpInput) {
    if (fpInput._flatpickr) fpInput._flatpickr.clear();
    fpInput.value = "";
  }
  const btn = document.getElementById("jobSleepUntilClearBtn");
  if (btn) btn.classList.add("d-none");
}
function updateJobEditOkBtn() {
  const okBtn = document.getElementById("jobEditOkBtn");
  if (!okBtn) return;
  const title = document.getElementById("jobTitleInput");
  okBtn.disabled = !title || !title.value.trim();
}
function updateSleepUntilClearBtn() {
  const btn = document.getElementById("jobSleepUntilClearBtn");
  if (!btn) return;
  const val = document.getElementById("jobSleepUntil").value;
  btn.classList.toggle("d-none", !val);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const modal = bootstrap.Modal.getInstance(document.getElementById("scheduleModal"));
  if (modal) modal.hide();
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
  const el = document.getElementById("jobScheduleText");
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

function getJobEditFormHTML(data, readOnly) {
  const streams = loadStreams();
  const currentStream = streams[jobsTargetStreamIndex >= 0 ? jobsTargetStreamIndex : jobsStreamIndex] || {};
  const streamImgUrl = getImageDataUrl(currentStream.image);
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
      <input class="form-control" id="jobTitleInput" value="${escapeHtml(data.title || "")}" ${ro} oninput="jobField('title', this.value);updateJobEditOkBtn()">
    </div>
    <div class="row mb-2">
      <div class="col-6">
        <label class="form-label">Stream</label>
        <div class="d-flex align-items-center gap-2">
          <div style="width:45px;height:45px;border:1px solid var(--bs-border-color);border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0" id="jobStreamPreview">
            ${streamImgUrl ? `<img src="${streamImgUrl}" class="date-img" style="max-width:45px;max-height:45px">` : `<span class="text-secondary small" style="font-size:0.6rem">none</span>`}
          </div>
          <select class="form-select" ${disabled} onchange="jobChangeStream(parseInt(this.value))">
            ${streams.map((s, i) => `
              <option value="${i}" ${i === (jobsTargetStreamIndex >= 0 ? jobsTargetStreamIndex : jobsStreamIndex) ? "selected" : ""}>
                ${escapeHtml(s.title)}
              </option>
            `).join("")}
          </select>
        </div>
      </div>
      <div class="col-6">
        <label class="form-label">Image</label>
        <div class="d-flex align-items-center gap-2">
          <div style="width:45px;height:45px;border:1px solid var(--bs-border-color);border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0" id="jobImagePreview">
            ${getImageDataUrl(data.image) ? `<img src="${getImageDataUrl(data.image)}" class="date-img" style="max-width:45px;max-height:45px">` : `<span class="text-secondary small">none</span>`}
          </div>
          <div>
            <div id="jobImageName">${escapeHtml(data.image || "")}</div>
            <div class="d-flex gap-1 mt-1">
              <button class="btn btn-primary btn-sm" id="btnJobImageChange" ${disabled} onclick="openImagePicker(function(name){ jobField('image', name); updateJobImagePreview(name); })">Change</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mb-2">
      <label class="form-label">Description</label>
      <textarea class="form-control" rows="3" ${ro} oninput="jobField('description', this.value)">${escapeHtml(data.description || "")}</textarea>
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
    <div class="mb-2">
      <label class="form-label">Schedule</label>
      <div class="d-flex align-items-center gap-2">
        <span id="jobScheduleText">${escapeHtml(getScheduleText(data.schedule))}</span>
        <button class="btn btn-primary btn-sm" id="btnScheduleChange" ${disabled} onclick="openScheduleModal()">Change</button>
      </div>
    </div>
    <div class="row mb-2">
      <div class="col">
        <label class="form-label">Sleep Until</label>
        <div class="d-flex gap-2">
          <input class="form-control" id="jobSleepUntil" value="${escapeHtml(data.sleepUntil || "")}" ${ro} placeholder="Pick a date">
          <button class="btn btn-danger btn-sm ${data.sleepUntil ? "" : "d-none"}" id="jobSleepUntilClearBtn" ${disabled} onclick="clearSleepUntil()">Clear</button>
        </div>
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

function showJobEditModal(readOnly) {
  if (!jobsBuffer) return;
  const data = jobsBuffer;
  const title = readOnly ? "View Job" : (isNewJob ? "Add Job" : "Edit Job");
  document.getElementById("jobEditModalTitle").textContent = title;
  jobsTargetStreamIndex = jobsStreamIndex;
  document.getElementById("jobEditModalBody").innerHTML = getJobEditFormHTML(data, readOnly);
  const footer = document.getElementById("jobEditModalFooter");
  if (readOnly) {
    footer.innerHTML = '<button class="btn btn-primary editor-btn flex-fill" id="btnViewJobEdit" onclick="editJobFromView()">Edit</button><button class="btn btn-success editor-btn flex-fill" id="btnViewJobOk" onclick="cancelJobEdit()">OK</button>';
  } else {
    footer.innerHTML = '<button class="btn btn-secondary editor-btn flex-fill" id="jobEditCancelBtn" onclick="cancelJobEdit()">Cancel</button><button class="btn btn-success editor-btn flex-fill" id="jobEditOkBtn" onclick="doneJobEdit()">OK</button>';
    updateJobEditOkBtn();
  }
  const fpInput = document.getElementById("jobSleepUntil");
  if (fpInput) {
    if (fpInput._flatpickr) fpInput._flatpickr.destroy();
    if (!readOnly) {
      flatpickr(fpInput, {
        dateFormat: "Y-m-d",
        allowInput: true,
        monthSelectorType: "dropdown",
        onChange: function(selectedDates, dateStr) {
          jobField("sleepUntil", dateStr);
          updateSleepUntilClearBtn();
        }
      });
    }
  }
  new bootstrap.Modal(document.getElementById("jobEditModal")).show();
}

function editJobFromView() {
  if (!jobsBuffer) return;
  document.getElementById("jobEditModalTitle").textContent = "Edit Job";
  document.getElementById("jobEditModalBody").innerHTML = getJobEditFormHTML(jobsBuffer, false);
  document.getElementById("jobEditModalFooter").innerHTML = '<button class="btn btn-secondary editor-btn flex-fill" id="jobEditCancelBtn" onclick="cancelJobEdit()">Cancel</button><button class="btn btn-success editor-btn flex-fill" id="jobEditOkBtn" onclick="doneJobEdit()">OK</button>';
  updateJobEditOkBtn();
  const fpInput = document.getElementById("jobSleepUntil");
  if (fpInput) {
    if (fpInput._flatpickr) fpInput._flatpickr.destroy();
    flatpickr(fpInput, {
      dateFormat: "Y-m-d",
      allowInput: true,
      monthSelectorType: "dropdown",
      onChange: function(selectedDates, dateStr) {
        jobField("sleepUntil", dateStr);
        updateSleepUntilClearBtn();
      }
    });
  }
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
  showJobEditModal(true);
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
  showJobEditModal();
}

function cancelJobEdit() {
  var modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
  if (modal) modal.hide();
  var fromMain = document.getElementById("streamsEditor").classList.contains("d-none");
  if (isNewJob && jobsEditingIdx >= 0) {
    var streams = loadStreams();
    var jobs = streams[jobsStreamIndex].jobs || [];
    jobs.splice(jobsEditingIdx, 1);
    streams[jobsStreamIndex].jobs = jobs;
    saveStreams(streams);
  }
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false; jobsTargetStreamIndex = -1;
  if (fromMain) { renderMain(); } else { renderStreamsEditor(); }
}

function doneJobEdit() {
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
  var modal = bootstrap.Modal.getInstance(document.getElementById("jobEditModal"));
  if (modal) modal.hide();
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false; jobsTargetStreamIndex = -1;
  if (fromMain) {
    var streams = loadStreams();
    var order = loadTodayOrder() || [];
    var allActive = [];
    streams.forEach(function(t) { (t.jobs || []).forEach(function(j) { if (j.active !== false) allActive.push(j.id); }); });
    var remaining = allActive.filter(function(id) { return order.includes(id); });
    if (savedId && !remaining.includes(savedId)) remaining.push(savedId);
    saveTodayOrder(remaining);
    renderMain();
  } else {
    renderStreamsEditor();
  }
}

function confirmDeleteJob(index) {
  jobsEditingIdx = index;
  var modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete this job?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    var streams = loadStreams();
    var jobs = streams[jobsStreamIndex].jobs || [];
    jobs.splice(index, 1);
    jobs.forEach(function(j, i) { j.sequence = i + 1; });
    streams[jobsStreamIndex].jobs = jobs;
    saveStreams(streams);
    bootstrap.Modal.getInstance(modalEl).hide();
    jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
    renderStreamsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewJob() {
  var streams = loadStreams();
  var jobs = streams[jobsStreamIndex].jobs || [];
  var seq = jobs.length + 1;
  var newJob = { id: "job_" + Date.now(), title: "New Job", sequence: seq, description: "", active: true, frequency: "daily", time: "", sleepUntil: "", schedule: { type: "daily" } };
  jobs.push(newJob);
  streams[jobsStreamIndex].jobs = jobs;
  saveStreams(streams);
  jobsBuffer = JSON.parse(JSON.stringify(newJob));
  jobsEditingIdx = jobs.length - 1; isNewJob = true;
  showJobEditModal();
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
function openSettings() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("settingsPage").classList.remove("d-none");

  const savedTheme = localStorage.getItem("planmydays_theme") || "darkly";
  const themeSel = document.getElementById("themeSelector");
  if (themeSel) themeSel.value = savedTheme;
  const savedFontSize = localStorage.getItem("planmydays_fontSize") || "xlarge";
  const fontSizeSel = document.getElementById("fontSizeSelector");
  if (fontSizeSel) fontSizeSel.value = savedFontSize;
  const splitList = localStorage.getItem("planmydays_splitList") === "true";
  const splitListCb = document.getElementById("splitList");
  if (splitListCb) splitListCb.checked = splitList;
  const autoHide = localStorage.getItem("planmydays_autoHideMenu") === "true";
  const autoHideCb = document.getElementById("autoHideMenu");
  if (autoHideCb) autoHideCb.checked = autoHide;
  const hideDone = localStorage.getItem("planmydays_hideDone") === "true";
  const hideDoneCb = document.getElementById("hideDone");
  if (hideDoneCb) hideDoneCb.checked = hideDone;
  const suffixStart = localStorage.getItem("planmydays_suffixStart") || "0";
  const suffixStartSel = document.getElementById("suffixStartSelector");
  if (suffixStartSel) suffixStartSel.value = suffixStart;
  const jan1 = localStorage.getItem("planmydays_jan1") || "1";
  const jan1Sel = document.getElementById("jan1Selector");
  if (jan1Sel) jan1Sel.value = jan1;
  const monday = localStorage.getItem("planmydays_monday") || "1";
  const mondaySel = document.getElementById("mondaySelector");
  if (mondaySel) mondaySel.value = monday;
  const showDanger = localStorage.getItem("planmydays_showDanger") === "true";
  const showDangerCb = document.getElementById("showDanger");
  if (showDangerCb) showDangerCb.checked = showDanger;
  const skipAdhoc = localStorage.getItem("planmydays_skipAdhocConfirm") === "true";
  const skipAdhocCb = document.getElementById("skipAdhocConfirm");
  if (skipAdhocCb) skipAdhocCb.checked = skipAdhoc;
  const dangerIds = ["clearAllDataRow", "refreshAppRow", "regenerateTilesRow", "uploadStandardImagesRow"];
  if (isDevMode) dangerIds.push("devTodayRow", "devLastGenRow");
  dangerIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("d-none", !showDanger);
  });

  if (isDevMode) {
    ["devTodayInput", "devLastGenInput"].forEach(id => {
      const el = document.getElementById(id);
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

  const qrContainer = document.getElementById("shareQrCode");
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
  const iconSel = document.getElementById("iconSizeSelector");
  if (iconSel) iconSel.value = savedIconSize;
  const savedDensity = localStorage.getItem("planmydays_density") || "normal";
  const densitySel = document.getElementById("densitySelector");
  if (densitySel) densitySel.value = savedDensity;
}

function closeSettings() {
  document.getElementById("settingsPage").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  delete document.getElementById("countdownContainer").dataset.showAll;
  renderMain();
}

function regenerateTiles() {
  const streams = loadStreams();
  const merged = addScheduleJobsToOrder([]);
  saveTodayOrder(merged);
  saveCompletedJobs([]);
  localStorage.setItem("planmydays_last_gen", getTodayStr());
  closeSettings();
  renderMain();
}

function confirmClearAllData() {
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = "Clear ALL data? This cannot be undone.";
  document.getElementById("deleteConfirmBtn").onclick = function() {
    const keys = Object.keys(localStorage);
    keys.forEach(k => localStorage.removeItem(k));
    bootstrap.Modal.getInstance(modalEl).hide();
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
        closeSettings();
        renderMain();
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("planmydays_theme") || "darkly";
  applyTheme(savedTheme);
  if (typeof seedSampleImages === "function") seedSampleImages();

  renderMain();
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
    startY = e.touches[0].clientY; pulling = true; pullDist = 0;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!pulling) return;
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







