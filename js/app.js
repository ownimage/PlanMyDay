// STORAGE HELPERS
function loadThreads() {
  const threads = JSON.parse(localStorage.getItem("planmydays_threads") || "[]");
  let nextId = Date.now();
  let changed = false;
  threads.forEach(t => {
    (t.jobs || []).forEach(j => {
      if (!j.id) { j.id = "job_" + (nextId++); changed = true; }
    });
  });
  if (changed) saveThreads(threads);
  return threads;
}
function saveThreads(threads) {
  localStorage.setItem("planmydays_threads", JSON.stringify(threads));
}

function hideAllEditors() {
  document.getElementById("countdownContainer").classList.remove("d-none");
  document.getElementById("threadsEditor").classList.add("d-none");
  document.getElementById("jobsEditor").classList.add("d-none");
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

// JOB COMPLETION STORAGE
function loadCompletedJobs() {
  const data = localStorage.getItem("planmydays_completed");
  return data ? JSON.parse(data) : [];
}
function saveCompletedJobs(ids) {
  localStorage.setItem("planmydays_completed", JSON.stringify(ids));
}

// MAIN PAGE RENDER
function renderMain() {
  const container = document.getElementById("countdownContainer");
  if (!container) return;
  container.innerHTML = "";

  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  const dateHeading = document.createElement("h2");
  dateHeading.className = "mb-3";
  dateHeading.textContent = dateStr;
  container.appendChild(dateHeading);

  const threads = loadThreads();
  const completed = loadCompletedJobs();

  const allJobs = [];
  threads.forEach(t => {
    (t.jobs || []).forEach(j => {
      if (j.active !== false) {
        allJobs.push({ job: j, threadTitle: t.title });
      }
    });
  });

  allJobs.sort((a, b) => (a.job.sequence || 0) - (b.job.sequence || 0));

  if (allJobs.length === 0) {
    const msg = document.createElement("p");
    msg.className = "text-secondary";
    msg.textContent = "No active jobs yet. Add threads with active jobs to get started.";
    container.appendChild(msg);
    updateNavState();
    return;
  }

  allJobs.forEach(({ job, threadTitle }) => {
    const isDone = completed.includes(job.id);
    const freqBadge = job.frequency === "weekly" ? "info" : "primary";
    const card = document.createElement("div");
    card.className = `card countdown-card mb-2 ${isDone ? "opacity-50" : ""}`;
    card.innerHTML = `
      <div class="row align-items-center">
        <div class="col-auto">
          <div class="form-check mb-0">
            <input class="form-check-input job-checkbox" type="checkbox" data-job-id="${escapeHtml(job.id)}" ${isDone ? "checked" : ""}>
          </div>
        </div>
        <div class="col" style="min-width:0">
          <div class="d-flex align-items-center gap-2 mb-1">
            <h4 class="mb-0" style="${isDone ? 'text-decoration:line-through' : ''}">${escapeHtml(job.title)}</h4>
            <span class="badge bg-${freqBadge}">${escapeHtml(job.frequency || "daily")}</span>
          </div>
          <div class="text-secondary small">${escapeHtml(threadTitle)}</div>
          ${job.description ? `<div class="mt-1 text-secondary small">${escapeHtml(job.description)}</div>` : ""}
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // checkbox change handler
  container.querySelectorAll(".job-checkbox").forEach(cb => {
    cb.addEventListener("change", function() {
      const jobId = this.dataset.jobId;
      let completed = loadCompletedJobs();
      if (this.checked) {
        if (!completed.includes(jobId)) completed.push(jobId);
      } else {
        completed = completed.filter(id => id !== jobId);
      }
      saveCompletedJobs(completed);
      const card = this.closest(".countdown-card");
      if (card) {
        card.classList.toggle("opacity-50", this.checked);
        const titleEl = card.querySelector("h4");
        if (titleEl) titleEl.style.textDecoration = this.checked ? "line-through" : "none";
      }
    });
  });

  updateNavState();
}

// THREADS EDITOR
let editingIndex = -1;
let editBuffer = null;
let isNew = false;
let dragIndex = -1;

function openThreadsEditor() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("threadsEditor").classList.remove("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
  renderThreadsEditor();
}

function closeThreadsEditor() {
  document.getElementById("threadsEditor").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  editingIndex = -1; editBuffer = null; isNew = false;
  renderMain();
}

function renderThreadsEditor() {
  const list = document.getElementById("threadEditorList");
  const addTile = document.getElementById("addThreadTile");
  const topTile = document.getElementById("addThreadTileTop");
  const filterEl = document.getElementById("threadEditorFilters");
  const singleEditor = document.getElementById("singleThreadEditor");

  document.getElementById("jobsEditor").classList.add("d-none");
  list.innerHTML = ""; addTile.innerHTML = ""; topTile.innerHTML = ""; filterEl.innerHTML = ""; singleEditor.innerHTML = "";

  const threads = loadThreads();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  if (editingIndex >= 0) {
    list.classList.add("d-none"); addTile.classList.add("d-none");
    topTile.classList.add("d-none"); filterEl.classList.add("d-none");
    singleEditor.classList.remove("d-none");

    const t = threads[editingIndex];
    const data = editBuffer || t;
    const showYear = data.scheduleType === "once";
    const day = data.scheduleDay || 1;
    const month = data.scheduleMonth || 1;

    let dateHtml;
    if (showYear) {
      dateHtml = `<input type="text" class="form-control flatpickr-date" data-editor="thread" placeholder="dd/mm/yyyy">`;
    } else {
      dateHtml = `
        <select class="form-select date-day-select" onchange="editField('scheduleDay', parseInt(this.value))">
          ${Array.from({length: 31}, (_, i) => `<option value="${i+1}" ${i+1 === day ? "selected" : ""}>${i+1}</option>`).join("")}
        </select>
        <select class="form-select date-month-select" onchange="editField('scheduleMonth', parseInt(this.value))">
          ${months.map((m, i) => `<option value="${i+1}" ${i+1 === month ? "selected" : ""}>${m}</option>`).join("")}
        </select>`;
    }

    const heading = isNew ? "Add Thread" : "Edit Thread";
    singleEditor.innerHTML = `
      <div class="d-flex align-items-center mb-3">
        <h3 class="mb-0">${heading}</h3>
        <button class="btn btn-outline-secondary ms-auto" onclick="cancelEdit()">Back</button>
      </div>
      <div class="card p-3 card-edited">
        <div class="mb-2">
          <label class="form-label">Title</label>
          <input class="form-control" value="${escapeHtml(data.title || "")}" oninput="editField('title', this.value)">
        </div>
        <div class="row mb-2">
          <div class="col">
            <label class="form-label">Priority</label>
            <select class="form-select" onchange="editField('priority', this.value)">
              <option value="low" ${data.priority === "low" ? "selected" : ""}>Low</option>
              <option value="medium" ${(data.priority || "medium") === "medium" ? "selected" : ""}>Medium</option>
              <option value="high" ${data.priority === "high" ? "selected" : ""}>High</option>
            </select>
          </div>
          <div class="col">
            <label class="form-label">Schedule type</label>
            <select class="form-select" onchange="editField('scheduleType', this.value)">
              <option value="annual" ${(data.scheduleType || "annual") === "annual" ? "selected" : ""}>Annual</option>
              <option value="once" ${data.scheduleType === "once" ? "selected" : ""}>Once</option>
            </select>
          </div>
        </div>
        <div class="mb-2">
          <label class="form-label">Schedule date</label>
          <div class="d-flex gap-1">${dateHtml}</div>
        </div>
        <div class="mb-2">
          <label class="form-label">Description</label>
          <textarea class="form-control" rows="3" oninput="editField('description', this.value)">${escapeHtml(data.description || "")}</textarea>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-success editor-btn" onclick="doneEdit()">OK</button>
          <button class="btn btn-secondary editor-btn ms-auto" onclick="cancelEdit()">Cancel</button>
        </div>
      </div>
    `;

    initEditorFlatpickr();
    updateNavState();
    return;
  }

  list.classList.remove("d-none"); addTile.classList.remove("d-none");
  topTile.classList.remove("d-none"); filterEl.classList.remove("d-none");
  singleEditor.classList.add("d-none");

  const sorted = [...threads].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  sorted.forEach((t, displayIdx) => {
    const realIdx = threads.indexOf(t);
    const showYear = t.scheduleType === "once";
    const ds = showYear ? `${t.scheduleDay} ${months[(t.scheduleMonth||1)-1]} ${t.scheduleYear || new Date().getFullYear()}` : `${t.scheduleDay} ${months[(t.scheduleMonth||1)-1]}`;
    const priorityBadge = { high: "danger", medium: "warning", low: "secondary" }[t.priority] || "secondary";

    const card = document.createElement("div");
    card.className = "card p-3 mb-3 thread-drag-card";
    card.draggable = true;
    card.dataset.index = realIdx;
    card.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <div class="drag-handle text-secondary" style="cursor:grab;font-size:1.3rem;line-height:1">&#9776;</div>
        <div class="flex-fill" style="min-width:0">
          <div class="fw-bold editor-title mb-1">${escapeHtml(t.title)}</div>
          <div class="d-flex gap-2 align-items-center small text-secondary">
            <span class="badge bg-${priorityBadge}">${escapeHtml(t.priority || "medium")}</span>
            <span>${ds}</span>
            <span class="text-muted">#${t.sequence || displayIdx + 1}</span>
          </div>
          ${t.description ? `<div class="mt-1 text-secondary small">${escapeHtml(t.description.substring(0, 80))}${t.description.length > 80 ? "..." : ""}</div>` : ""}
        </div>
        <div class="d-flex gap-2 flex-shrink-0">
          <button class="btn btn-primary editor-btn" onclick="editThread(${realIdx})">Edit</button>
          <button class="btn btn-info editor-btn" onclick="openJobsEditor(${realIdx})">Jobs</button>
          <button class="btn btn-danger editor-btn" onclick="confirmDeleteThread(${realIdx})">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

    // drag and drop handlers
    let dragSrcIndex = -1;
    list.addEventListener("dragstart", e => {
      const card = e.target.closest(".thread-drag-card");
      if (!card) return;
      dragSrcIndex = parseInt(card.dataset.index);
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    list.addEventListener("dragend", e => {
      document.querySelectorAll(".thread-drag-card").forEach(c => c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"));
    });
    list.addEventListener("dragover", e => {
      e.preventDefault();
      const target = e.target.closest(".thread-drag-card");
      if (!target || dragSrcIndex < 0) return;
      document.querySelectorAll(".thread-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
      const rect = target.getBoundingClientRect();
      target.classList.add(e.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
    });
    list.addEventListener("drop", e => {
      e.preventDefault();
      document.querySelectorAll(".thread-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
      const target = e.target.closest(".thread-drag-card");
      if (!target || dragSrcIndex < 0) return;
      const dropIndex = parseInt(target.dataset.index);
      if (dropIndex === dragSrcIndex) { dragSrcIndex = -1; return; }
      const threads = loadThreads();
      const [moved] = threads.splice(dragSrcIndex, 1);
      const rect = target.getBoundingClientRect();
      const above = e.clientY < rect.top + rect.height / 2;
      let insertAt;
      if (dragSrcIndex < dropIndex) {
        const actualDropIdx = dropIndex - 1;
        insertAt = above ? actualDropIdx : actualDropIdx + 1;
      } else {
        insertAt = above ? dropIndex : dropIndex + 1;
      }
      threads.splice(insertAt, 0, moved);
      threads.forEach((t, i) => t.sequence = i + 1);
      saveThreads(threads);
      dragSrcIndex = -1;
      renderThreadsEditor();
    });

  topTile.innerHTML = `
    <div class="d-flex gap-2">
      <button class="btn btn-primary editor-btn btn-wide" onclick="addNewThread()">Add Thread</button>
      <button class="btn btn-success editor-btn btn-wide ms-auto" onclick="closeThreadsEditor()">Done</button>
    </div>
  `;
  updateNavState();
}

function editField(field, value) {
  if (!editBuffer) return;
  editBuffer[field] = value;
  if (field === "scheduleType") {
    if (value === "annual") delete editBuffer.scheduleYear;
    else editBuffer.scheduleYear = new Date().getFullYear();
    renderThreadsEditor();
  }
}

function initEditorFlatpickr() {
  if (typeof flatpickr === 'undefined') return;
  const input = document.querySelector('.flatpickr-date[data-editor="thread"]');
  if (!input || !editBuffer) return;
  const showYear = editBuffer.scheduleType === "once";
  const d = editBuffer.scheduleDay || 1;
  const m = editBuffer.scheduleMonth || 1;
  const y = editBuffer.scheduleYear || new Date().getFullYear();
  flatpickr(input, {
    dateFormat: showYear ? 'd/m/Y' : 'd/m',
    defaultDate: new Date(y, m - 1, d),
    allowInput: true,
    onChange: function(sel) {
      if (sel.length > 0 && editBuffer) {
        editBuffer.scheduleDay = sel[0].getDate();
        editBuffer.scheduleMonth = sel[0].getMonth() + 1;
        if (showYear) editBuffer.scheduleYear = sel[0].getFullYear();
      }
    }
  });
}

function editThread(index) {
  const threads = loadThreads();
  editBuffer = JSON.parse(JSON.stringify(threads[index]));
  editingIndex = index; isNew = false;
  renderThreadsEditor();
}

function cancelEdit() {
  if (isNew && editingIndex >= 0) {
    const threads = loadThreads();
    threads.splice(editingIndex, 1);
    saveThreads(threads);
  }
  editingIndex = -1; editBuffer = null; isNew = false;
  renderThreadsEditor();
}

function doneEdit() {
  if (editingIndex >= 0 && editBuffer) {
    const threads = loadThreads();
    threads[editingIndex] = editBuffer;
    saveThreads(threads);
  }
  editingIndex = -1; editBuffer = null; isNew = false;
  renderThreadsEditor();
}

function confirmDeleteThread(index) {
  editingIndex = index;
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete this thread?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    const threads = loadThreads();
    threads.splice(index, 1);
    threads.forEach((t, i) => t.sequence = i + 1);
    saveThreads(threads);
    bootstrap.Modal.getInstance(modalEl).hide();
    editingIndex = -1; editBuffer = null; isNew = false;
    renderThreadsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewThread() {
  const threads = loadThreads();
  const seq = threads.length + 1;
  const newThread = { title: "New Thread", sequence: seq, priority: "medium", scheduleType: "annual", scheduleDay: 1, scheduleMonth: 1, description: "", jobs: [] };
  threads.push(newThread);
  saveThreads(threads);
  editBuffer = JSON.parse(JSON.stringify(newThread));
  editingIndex = threads.length - 1; isNew = true;
  renderThreadsEditor();
  const el = document.getElementById("threadsEditor");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// JOBS EDITOR
let jobsThreadIndex = -1;
let jobsEditingIdx = -1;
let jobsBuffer = null;
let isNewJob = false;

function openJobsEditor(threadIdx) {
  jobsThreadIndex = threadIdx;
  document.getElementById("threadEditorList").classList.add("d-none");
  document.getElementById("addThreadTile").classList.add("d-none");
  document.getElementById("addThreadTileTop").classList.add("d-none");
  document.getElementById("threadEditorFilters").classList.add("d-none");
  document.getElementById("singleThreadEditor").classList.add("d-none");
  document.getElementById("jobsEditor").classList.remove("d-none");
  renderJobsEditor();
}

function closeJobsEditor() {
  document.getElementById("jobsEditor").classList.add("d-none");
  document.getElementById("threadEditorList").classList.remove("d-none");
  document.getElementById("addThreadTile").classList.remove("d-none");
  document.getElementById("addThreadTileTop").classList.remove("d-none");
  document.getElementById("threadEditorFilters").classList.remove("d-none");
  jobsThreadIndex = -1; jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
  renderThreadsEditor();
}

function renderJobsEditor() {
  const threads = loadThreads();
  const thread = threads[jobsThreadIndex];
  if (!thread) { closeJobsEditor(); return; }

  const jobs = thread.jobs || [];
  const header = document.getElementById("jobsEditorHeader");
  const list = document.getElementById("jobsList");
  const addTile = document.getElementById("addJobTile");
  const topTile = document.getElementById("addJobTileTop");
  const singleEditor = document.getElementById("singleJobEditor");

  list.innerHTML = ""; addTile.innerHTML = ""; topTile.innerHTML = ""; singleEditor.innerHTML = "";

  document.getElementById("jobsEditorTitle").textContent = `Jobs: ${escapeHtml(thread.title)}`;

  if (jobsEditingIdx >= 0) {
    list.classList.add("d-none"); addTile.classList.add("d-none");
    topTile.classList.add("d-none"); singleEditor.classList.remove("d-none");

    const job = jobs[jobsEditingIdx];
    const data = jobsBuffer || job;

    const heading = isNewJob ? "Add Job" : "Edit Job";
    singleEditor.innerHTML = `
      <div class="d-flex align-items-center mb-3">
        <h3 class="mb-0">${heading}</h3>
        <button class="btn btn-outline-secondary ms-auto" onclick="cancelJobEdit()">Back</button>
      </div>
      <div class="card p-3 card-edited">
        <div class="mb-2">
          <label class="form-label">Title</label>
          <input class="form-control" value="${escapeHtml(data.title || "")}" oninput="jobField('title', this.value)">
        </div>
        <div class="mb-2">
          <label class="form-label">Description</label>
          <textarea class="form-control" rows="3" oninput="jobField('description', this.value)">${escapeHtml(data.description || "")}</textarea>
        </div>
        <div class="row mb-2">
          <div class="col">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="jobActiveCb" ${data.active !== false ? "checked" : ""} onchange="jobField('active', this.checked)">
              <label class="form-check-label" for="jobActiveCb">Active</label>
            </div>
          </div>
          <div class="col">
            <label class="form-label">Frequency</label>
            <select class="form-select" onchange="jobField('frequency', this.value)">
              <option value="daily" ${(data.frequency || "daily") === "daily" ? "selected" : ""}>Daily</option>
              <option value="weekly" ${data.frequency === "weekly" ? "selected" : ""}>Weekly</option>
            </select>
          </div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-success editor-btn" onclick="doneJobEdit()">OK</button>
          <button class="btn btn-secondary editor-btn ms-auto" onclick="cancelJobEdit()">Cancel</button>
        </div>
      </div>
    `;
    updateNavState();
    return;
  }

  list.classList.remove("d-none"); addTile.classList.remove("d-none");
  topTile.classList.remove("d-none"); singleEditor.classList.add("d-none");

  const sorted = [...jobs].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  sorted.forEach((j, displayIdx) => {
    const realIdx = jobs.indexOf(j);
    const activeBadge = j.active !== false ? "success" : "secondary";
    const freqBadge = j.frequency === "weekly" ? "info" : "primary";
    const card = document.createElement("div");
    card.className = "card p-3 mb-3 thread-drag-card";
    card.draggable = true;
    card.dataset.index = realIdx;
    card.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <div class="drag-handle text-secondary" style="cursor:grab;font-size:1.3rem;line-height:1">&#9776;</div>
        <div class="flex-fill" style="min-width:0">
          <div class="fw-bold editor-title mb-1">${escapeHtml(j.title)}</div>
          <div class="d-flex gap-2 align-items-center small text-secondary">
            <span class="badge bg-${activeBadge}">${j.active !== false ? "Active" : "Inactive"}</span>
            <span class="badge bg-${freqBadge}">${escapeHtml(j.frequency || "daily")}</span>
            <span class="text-muted">#${j.sequence || displayIdx + 1}</span>
          </div>
          ${j.description ? `<div class="mt-1 text-secondary small">${escapeHtml(j.description.substring(0, 80))}${j.description.length > 80 ? "..." : ""}</div>` : ""}
        </div>
        <div class="d-flex gap-2 flex-shrink-0">
          <button class="btn btn-primary editor-btn" onclick="editJob(${realIdx})">Edit</button>
          <button class="btn btn-danger editor-btn" onclick="confirmDeleteJob(${realIdx})">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  // job drag and drop
  let jobDragSrc = -1;
  list.addEventListener("dragstart", e => {
    const card = e.target.closest(".thread-drag-card");
    if (!card) return;
    jobDragSrc = parseInt(card.dataset.index);
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragend", e => {
    list.querySelectorAll(".thread-drag-card").forEach(c => c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"));
  });
  list.addEventListener("dragover", e => {
    e.preventDefault();
    const target = e.target.closest(".thread-drag-card");
    if (!target || jobDragSrc < 0) return;
    list.querySelectorAll(".thread-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
    const rect = target.getBoundingClientRect();
    target.classList.add(e.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
  });
  list.addEventListener("drop", e => {
    e.preventDefault();
    list.querySelectorAll(".thread-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
    const target = e.target.closest(".thread-drag-card");
    if (!target || jobDragSrc < 0) return;
    const dropIndex = parseInt(target.dataset.index);
    if (dropIndex === jobDragSrc) { jobDragSrc = -1; return; }
    const threads = loadThreads();
    const jobs = threads[jobsThreadIndex].jobs || [];
    const [moved] = jobs.splice(jobDragSrc, 1);
    const rect = target.getBoundingClientRect();
    const above = e.clientY < rect.top + rect.height / 2;
    let insertAt;
    if (jobDragSrc < dropIndex) {
      insertAt = above ? dropIndex - 1 : dropIndex;
    } else {
      insertAt = above ? dropIndex : dropIndex + 1;
    }
    jobs.splice(insertAt, 0, moved);
    jobs.forEach((jb, i) => jb.sequence = i + 1);
    threads[jobsThreadIndex].jobs = jobs;
    saveThreads(threads);
    jobDragSrc = -1;
    renderJobsEditor();
  });

  topTile.innerHTML = `
    <div class="d-flex gap-2">
      <button class="btn btn-primary editor-btn btn-wide" onclick="addNewJob()">Add Job</button>
      <button class="btn btn-success editor-btn btn-wide ms-auto" onclick="closeJobsEditor()">Done</button>
    </div>
  `;
  updateNavState();
}

function jobField(field, value) {
  if (!jobsBuffer) return;
  jobsBuffer[field] = value;
  if (field === "active") renderJobsEditor();
}

function editJob(index) {
  const threads = loadThreads();
  const jobs = threads[jobsThreadIndex].jobs || [];
  jobsBuffer = JSON.parse(JSON.stringify(jobs[index]));
  jobsEditingIdx = index; isNewJob = false;
  renderJobsEditor();
}

function cancelJobEdit() {
  if (isNewJob && jobsEditingIdx >= 0) {
    const threads = loadThreads();
    const jobs = threads[jobsThreadIndex].jobs || [];
    jobs.splice(jobsEditingIdx, 1);
    threads[jobsThreadIndex].jobs = jobs;
    saveThreads(threads);
  }
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
  renderJobsEditor();
}

function doneJobEdit() {
  if (jobsEditingIdx >= 0 && jobsBuffer) {
    const threads = loadThreads();
    const jobs = threads[jobsThreadIndex].jobs || [];
    jobs[jobsEditingIdx] = jobsBuffer;
    threads[jobsThreadIndex].jobs = jobs;
    saveThreads(threads);
  }
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
  renderJobsEditor();
}

function confirmDeleteJob(index) {
  jobsEditingIdx = index;
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete this job?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    const threads = loadThreads();
    const jobs = threads[jobsThreadIndex].jobs || [];
    jobs.splice(index, 1);
    jobs.forEach((j, i) => j.sequence = i + 1);
    threads[jobsThreadIndex].jobs = jobs;
    saveThreads(threads);
    bootstrap.Modal.getInstance(modalEl).hide();
    jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
    renderJobsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewJob() {
  const threads = loadThreads();
  const jobs = threads[jobsThreadIndex].jobs || [];
  const seq = jobs.length + 1;
  const newJob = { id: "job_" + Date.now(), title: "New Job", sequence: seq, description: "", active: true, frequency: "daily" };
  jobs.push(newJob);
  threads[jobsThreadIndex].jobs = jobs;
  saveThreads(threads);
  jobsBuffer = JSON.parse(JSON.stringify(newJob));
  jobsEditingIdx = jobs.length - 1; isNewJob = true;
  renderJobsEditor();
}

// SETTINGS
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
  renderMain();
}

function regenerateTiles() {
  localStorage.removeItem("planmydays_completed");
  closeSettings();
  renderMain();
}

function confirmClearAllData() {
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = "Clear ALL data? This cannot be undone.";
  document.getElementById("deleteConfirmBtn").onclick = function() {
    localStorage.removeItem("planmydays_threads");
    bootstrap.Modal.getInstance(modalEl).hide();
    closeSettings();
  };
  new bootstrap.Modal(modalEl).show();
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "darkly";
  applyTheme(savedTheme);
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
