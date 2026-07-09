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
  document.getElementById("jobsEditor").classList.add("d-none");
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

  // add button row
  const addRow = document.createElement("div");
  addRow.className = "d-flex gap-2 mb-3";
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-outline-primary btn-sm";
  addBtn.innerHTML = "&#43; Add card";
  addBtn.onclick = function() { showAddCardForm(); };
  addRow.appendChild(addBtn);
  container.appendChild(addRow);

  // inline add form (hidden initially)
  const addForm = document.createElement("div");
  addForm.id = "addCardForm";
  addForm.className = "card p-3 mb-3 d-none";
  container.appendChild(addForm);

  const streams = loadStreams();
  const completed = loadCompletedJobs();
  const todayOrder = loadTodayOrder();

  const allJobs = [];
  streams.forEach(t => {
    (t.jobs || []).forEach(j => {
      if (j.active !== false) {
        allJobs.push({ job: j, streamTitle: t.title, streamIdx: streams.indexOf(t) });
      }
    });
  });

  if (todayOrder) {
    const orderMap = {};
    todayOrder.forEach((id, i) => { orderMap[id] = i; });
    allJobs.sort((a, b) => (orderMap[a.job.id] !== undefined ? orderMap[a.job.id] : 999) - (orderMap[b.job.id] !== undefined ? orderMap[b.job.id] : 999));
  } else {
    allJobs.sort((a, b) => (a.job.sequence || 0) - (b.job.sequence || 0));
  }

  if (localStorage.getItem("hideDone") === "true") {
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

  const cardContainer = document.createElement("div");
  cardContainer.id = "todayCardList";

  if (allJobs.length === 0) {
    const msg = document.createElement("p");
    msg.className = "text-secondary";
    msg.textContent = "No active jobs yet. Add streams with active jobs to get started.";
    container.appendChild(msg);
    updateNavState();
    return;
  }

  allJobs.forEach(({ job, streamTitle, streamIdx }) => {
    const isDone = completed.includes(job.id);
    const freqBadge = job.frequency === "weekly" ? "info" : "primary";
    const streams = loadStreams();
    const stream = streams[streamIdx] || {};
    const streamImageUrl = getImageDataUrl(stream.image);
    const jobImageUrl = getImageDataUrl(job.image);
    const card = document.createElement("div");
    card.className = `card countdown-card mb-2 today-drag-card ${isDone ? "opacity-50" : ""}`;
    card.draggable = true;
    card.dataset.jobId = job.id;
    card.innerHTML = `
      <div class="row align-items-center">
        <div class="col-auto">
          <div class="drag-handle text-secondary" style="cursor:grab;font-size:1.2rem;line-height:1;display:inline-block;vertical-align:middle">&#9776;</div>
          <div class="form-check mb-0 d-inline-block ms-1">
            <input class="form-check-input job-checkbox" type="checkbox" data-job-id="${escapeHtml(job.id)}" ${isDone ? "checked" : ""}>
          </div>
        </div>
        <div class="col-auto d-flex align-items-center gap-1" style="min-width:68px">
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">${streamImageUrl ? `<img src="${streamImageUrl}" class="date-img" style="max-width:32px;max-height:32px">` : ""}</div>
          <div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center">${jobImageUrl ? `<img src="${jobImageUrl}" class="date-img" style="max-width:32px;max-height:32px">` : ""}</div>
        </div>
        <div class="col" style="min-width:0">
          <div class="d-flex align-items-center gap-2 mb-1">
            <h4 class="mb-0" style="${isDone ? 'text-decoration:line-through' : ''}">${escapeHtml(job.title)}</h4>
            <span class="badge bg-${freqBadge}">${escapeHtml(job.frequency || "daily")}</span>
          </div>
          <div class="text-secondary small">${escapeHtml(streamTitle)}</div>
          ${job.description ? `<div class="mt-1 text-secondary small">${escapeHtml(job.description)}</div>` : ""}
        </div>
      </div>
    `;
    cardContainer.appendChild(card);
  });

  container.appendChild(cardContainer);

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
      const card = this.closest(".today-drag-card");
      if (card) {
        card.classList.toggle("opacity-50", this.checked);
        const titleEl = card.querySelector("h4");
        if (titleEl) titleEl.style.textDecoration = this.checked ? "line-through" : "none";
      }
    });
  });

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
    const ids = cards.map(c => c.dataset.jobId);
    const srcIdx = ids.indexOf(todayDragSrc);
    const dstIdx = ids.indexOf(target.dataset.jobId);
    if (srcIdx < 0 || dstIdx < 0) { todayDragSrc = null; return; }
    ids.splice(srcIdx, 1);
    const rect = target.getBoundingClientRect();
    const above = e.clientY < rect.top + rect.height / 2;
    const insertAt = srcIdx < dstIdx ? (above ? dstIdx - 1 : dstIdx) : (above ? dstIdx : dstIdx + 1);
    ids.splice(insertAt, 0, todayDragSrc);
    saveTodayOrder(ids);
    todayDragSrc = null;
    renderMain();
  });

  updateNavState();
}

function showAddCardForm() {
  const form = document.getElementById("addCardForm");
  if (!form) return;
  form.classList.toggle("d-none");
  if (form.classList.contains("d-none")) return;
  const streams = loadStreams();
  if (streams.length === 0) {
    streams.push({ title: "General", sequence: 1, jobs: [] });
    saveStreams(streams);
  }
  form.innerHTML = `
    <div class="mb-2">
      <input class="form-control" id="newCardTitle" placeholder="Job title" value="">
    </div>
    <div class="mb-2">
      <textarea class="form-control" id="newCardDesc" placeholder="Description (optional)" rows="2"></textarea>
    </div>
    <div class="row mb-2">
      <div class="col">
        <select class="form-select" id="newCardFreq">
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <div class="col">
        <select class="form-select" id="newCardStream">
          ${streams.map(t => `<option value="${escapeHtml(t.title)}">${escapeHtml(t.title)}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="d-flex gap-2">
      <button class="btn btn-primary editor-btn" onclick="addTodayCard()">Add</button>
      <button class="btn btn-secondary editor-btn" onclick="document.getElementById('addCardForm').classList.add('d-none')">Cancel</button>
    </div>
  `;
}

function addTodayCard() {
  const title = document.getElementById("newCardTitle").value.trim();
  if (!title) return;
  const desc = document.getElementById("newCardDesc").value.trim();
  const freq = document.getElementById("newCardFreq").value;
  const streamTitle = document.getElementById("newCardStream").value;
  const streams = loadStreams();
  let stream = streams.find(t => t.title === streamTitle);
  if (!stream) { stream = streams[0]; }
  const jobs = stream.jobs || [];
  const newJob = { id: "job_" + Date.now(), title, sequence: jobs.length + 1, description: desc, active: true, frequency: freq };
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

function renderStreamsEditor() {
  const list = document.getElementById("streamEditorList");
  const addTile = document.getElementById("addStreamTile");
  const topTile = document.getElementById("addStreamTileTop");
  const filterEl = document.getElementById("streamEditorFilters");
  const singleEditor = document.getElementById("singleStreamEditor");

  document.getElementById("jobsEditor").classList.add("d-none");
  list.innerHTML = ""; addTile.innerHTML = ""; topTile.innerHTML = ""; filterEl.innerHTML = ""; singleEditor.innerHTML = "";

  const streams = loadStreams();

  if (editingIndex >= 0) {
    list.classList.add("d-none"); addTile.classList.add("d-none");
    topTile.classList.add("d-none"); filterEl.classList.add("d-none");
    singleEditor.classList.remove("d-none");

    const t = streams[editingIndex];
    const data = editBuffer || t;

    singleEditor.innerHTML = `
      <div class="d-flex align-items-center mb-3">
        <h3 class="mb-0">${isNew ? "Add Stream" : "Edit Stream"}</h3>
      </div>
      <div class="card p-3 card-edited">
        <div class="mb-2">
          <label class="form-label">Title</label>
          <input class="form-control" value="${escapeHtml(data.title || "")}" oninput="editField('title', this.value)">
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
            <button class="btn btn-outline-primary btn-sm" onclick="openImagePicker(function(name){ editField('image', name); updateStreamImagePreview(name); })">Choose</button>
            ${data.image ? `<button class="btn btn-outline-danger btn-sm" onclick="editField('image','');updateStreamImagePreview(null)">Remove</button>` : ""}
          </div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button class="btn btn-success editor-btn" onclick="doneEdit()">OK</button>
          <button class="btn btn-secondary editor-btn ms-auto" onclick="cancelEdit()">Cancel</button>
        </div>
      </div>
    `;
    updateNavState();
    return;
  }

  list.classList.remove("d-none"); addTile.classList.remove("d-none");
  topTile.classList.remove("d-none"); filterEl.classList.remove("d-none");
  singleEditor.classList.add("d-none");

  const sorted = [...streams].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  sorted.forEach((t, displayIdx) => {
    const realIdx = streams.indexOf(t);
    const streamImgUrl = getImageDataUrl(t.image);

    const card = document.createElement("div");
    card.className = "card p-3 mb-3 stream-drag-card";
    card.draggable = true;
    card.dataset.index = realIdx;
    card.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <div class="drag-handle text-secondary" style="cursor:grab;font-size:1.3rem;line-height:1">&#9776;</div>
        ${streamImgUrl ? `<div style="width:40px;height:40px;flex-shrink:0"><img src="${streamImgUrl}" class="date-img" style="max-width:40px;max-height:40px"></div>` : ""}
        <div class="flex-fill" style="min-width:0">
          <div class="fw-bold editor-title mb-1">${escapeHtml(t.title)}</div>
          <div class="d-flex gap-2 align-items-center small text-secondary">
            <span class="text-muted">#${t.sequence || displayIdx + 1}</span>
          </div>
          ${t.description ? `<div class="mt-1 text-secondary small">${escapeHtml(t.description.substring(0, 80))}${t.description.length > 80 ? "..." : ""}</div>` : ""}
        </div>
        <div class="d-flex gap-2 flex-shrink-0">
          <button class="btn btn-primary editor-btn" onclick="editStream(${realIdx})">Edit</button>
          <button class="btn btn-info editor-btn" onclick="openJobsEditor(${realIdx})">Jobs</button>
          <button class="btn btn-danger editor-btn" onclick="confirmDeleteStream(${realIdx})">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

    // drag and drop handlers
    let dragSrcIndex = -1;
    list.addEventListener("dragstart", e => {
      const card = e.target.closest(".stream-drag-card");
      if (!card) return;
      dragSrcIndex = parseInt(card.dataset.index);
      card.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    list.addEventListener("dragend", e => {
      document.querySelectorAll(".stream-drag-card").forEach(c => c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"));
    });
    list.addEventListener("dragover", e => {
      e.preventDefault();
      const target = e.target.closest(".stream-drag-card");
      if (!target || dragSrcIndex < 0) return;
      document.querySelectorAll(".stream-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
      const rect = target.getBoundingClientRect();
      target.classList.add(e.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
    });
    list.addEventListener("drop", e => {
      e.preventDefault();
      document.querySelectorAll(".stream-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
      const target = e.target.closest(".stream-drag-card");
      if (!target || dragSrcIndex < 0) return;
      const dropIndex = parseInt(target.dataset.index);
      if (dropIndex === dragSrcIndex) { dragSrcIndex = -1; return; }
      const streams = loadStreams();
      const [moved] = streams.splice(dragSrcIndex, 1);
      const rect = target.getBoundingClientRect();
      const above = e.clientY < rect.top + rect.height / 2;
      let insertAt;
      if (dragSrcIndex < dropIndex) {
        const actualDropIdx = dropIndex - 1;
        insertAt = above ? actualDropIdx : actualDropIdx + 1;
      } else {
        insertAt = above ? dropIndex : dropIndex + 1;
      }
      streams.splice(insertAt, 0, moved);
      streams.forEach((t, i) => t.sequence = i + 1);
      saveStreams(streams);
      dragSrcIndex = -1;
      renderStreamsEditor();
    });

  topTile.innerHTML = `
    <div class="d-flex gap-2">
      <button class="btn btn-primary editor-btn btn-wide" onclick="addNewStream()">Add Stream</button>
      <button class="btn btn-success editor-btn btn-wide ms-auto" onclick="closeStreamsEditor()">Done</button>
    </div>
  `;
  updateNavState();
}

function editField(field, value) {
  if (!editBuffer) return;
  editBuffer[field] = value;
}

function updateStreamImagePreview(name) {
  const preview = document.getElementById("streamImagePreview");
  const nameEl = document.getElementById("streamImageName");
  if (!preview) return;
  const url = getImageDataUrl(name);
  if (url) {
    preview.innerHTML = `<img src="${url}" class="date-img" style="max-width:50px;max-height:50px">`;
    if (nameEl) nameEl.textContent = name;
  } else {
    preview.innerHTML = `<span class="text-secondary small">none</span>`;
    if (nameEl) nameEl.textContent = "";
  }
}
function updateJobImagePreview(name) {
  const preview = document.getElementById("jobImagePreview");
  const nameEl = document.getElementById("jobImageName");
  if (!preview) return;
  const url = getImageDataUrl(name);
  if (url) {
    preview.innerHTML = `<img src="${url}" class="date-img" style="max-width:50px;max-height:50px">`;
    if (nameEl) nameEl.textContent = name;
  } else {
    preview.innerHTML = `<span class="text-secondary small">none</span>`;
    if (nameEl) nameEl.textContent = "";
  }
}

function editStream(index) {
  const streams = loadStreams();
  editBuffer = JSON.parse(JSON.stringify(streams[index]));
  editingIndex = index; isNew = false;
  renderStreamsEditor();
}

function cancelEdit() {
  if (isNew && editingIndex >= 0) {
    const streams = loadStreams();
    streams.splice(editingIndex, 1);
    saveStreams(streams);
  }
  editingIndex = -1; editBuffer = null; isNew = false;
  renderStreamsEditor();
}

function doneEdit() {
  if (editingIndex >= 0 && editBuffer) {
    const streams = loadStreams();
    streams[editingIndex] = editBuffer;
    saveStreams(streams);
  }
  editingIndex = -1; editBuffer = null; isNew = false;
  renderStreamsEditor();
}

function confirmDeleteStream(index) {
  editingIndex = index;
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete this stream?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    const streams = loadStreams();
    streams.splice(index, 1);
    streams.forEach((t, i) => t.sequence = i + 1);
    saveStreams(streams);
    bootstrap.Modal.getInstance(modalEl).hide();
    editingIndex = -1; editBuffer = null; isNew = false;
    renderStreamsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewStream() {
  const streams = loadStreams();
  const seq = streams.length + 1;
  const newStream = { title: "New Stream", sequence: seq, description: "", jobs: [] };
  streams.push(newStream);
  saveStreams(streams);
  editBuffer = JSON.parse(JSON.stringify(newStream));
  editingIndex = streams.length - 1; isNew = true;
  renderStreamsEditor();
  const el = document.getElementById("streamsEditor");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// JOBS EDITOR
let jobsStreamIndex = -1;
let jobsEditingIdx = -1;
let jobsBuffer = null;
let isNewJob = false;

function openJobsEditor(streamIdx) {
  jobsStreamIndex = streamIdx;
  document.getElementById("streamsEditorHeader").classList.add("d-none");
  document.getElementById("streamEditorList").classList.add("d-none");
  document.getElementById("addStreamTile").classList.add("d-none");
  document.getElementById("addStreamTileTop").classList.add("d-none");
  document.getElementById("streamEditorFilters").classList.add("d-none");
  document.getElementById("singleStreamEditor").classList.add("d-none");
  document.getElementById("jobsEditor").classList.remove("d-none");
  renderJobsEditor();
}

function closeJobsEditor() {
  document.getElementById("jobsEditor").classList.add("d-none");
  document.getElementById("streamsEditorHeader").classList.remove("d-none");
  document.getElementById("streamEditorList").classList.remove("d-none");
  document.getElementById("addStreamTile").classList.remove("d-none");
  document.getElementById("addStreamTileTop").classList.remove("d-none");
  document.getElementById("streamEditorFilters").classList.remove("d-none");
  jobsStreamIndex = -1; jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
  renderStreamsEditor();
}

function renderJobsEditor() {
  const streams = loadStreams();
  const stream = streams[jobsStreamIndex];
  if (!stream) { closeJobsEditor(); return; }

  const jobs = stream.jobs || [];
  const header = document.getElementById("jobsEditorHeader");
  const list = document.getElementById("jobsList");
  const addTile = document.getElementById("addJobTile");
  const topTile = document.getElementById("addJobTileTop");
  const singleEditor = document.getElementById("singleJobEditor");

  list.innerHTML = ""; addTile.innerHTML = ""; topTile.innerHTML = ""; singleEditor.innerHTML = "";

  document.getElementById("jobsEditorTitle").textContent = `Jobs List: ${escapeHtml(stream.title)}`;

  if (jobsEditingIdx >= 0) {
    list.classList.add("d-none"); addTile.classList.add("d-none");
    topTile.classList.add("d-none"); singleEditor.classList.remove("d-none");

    const job = jobs[jobsEditingIdx];
    const data = jobsBuffer || job;

    const jobHeading = isNewJob ? "Add Job" : "Edit Job";
    singleEditor.innerHTML = `
      <div class="d-flex align-items-center mb-3">
        <h3 class="mb-0">${jobHeading}</h3>
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
        <div class="mb-2">
          <label class="form-label">Image</label>
          <div class="d-flex align-items-center gap-2">
            <div style="width:50px;height:50px;border:1px solid var(--bs-border-color);border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0" id="jobImagePreview">
              ${getImageDataUrl(data.image) ? `<img src="${getImageDataUrl(data.image)}" class="date-img" style="max-width:50px;max-height:50px">` : `<span class="text-secondary small">none</span>`}
            </div>
            <span class="small text-secondary" id="jobImageName">${escapeHtml(data.image || "")}</span>
            <button class="btn btn-outline-primary btn-sm" onclick="openImagePicker(function(name){ jobField('image', name); updateJobImagePreview(name); })">Choose</button>
            ${data.image ? `<button class="btn btn-outline-danger btn-sm" onclick="jobField('image','');updateJobImagePreview(null)">Remove</button>` : ""}
          </div>
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
    const freqBadge = j.frequency === "weekly" ? "info" : "primary";
    const jobImgUrl = getImageDataUrl(j.image);
    const card = document.createElement("div");
    card.className = "card p-3 mb-3 stream-drag-card";
    card.draggable = true;
    card.dataset.index = realIdx;
    card.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <div class="drag-handle text-secondary" style="cursor:grab;font-size:1.3rem;line-height:1">&#9776;</div>
        ${jobImgUrl ? `<div style="width:40px;height:40px;flex-shrink:0"><img src="${jobImgUrl}" class="date-img" style="max-width:40px;max-height:40px"></div>` : ""}
        <div class="flex-fill" style="min-width:0">
          <div class="fw-bold editor-title mb-1">${escapeHtml(j.title)}</div>
          <div class="d-flex gap-2 align-items-center small text-secondary">
            <label class="form-check-label mb-0 me-1" style="cursor:pointer">
              <input class="form-check-input active-toggle" type="checkbox" data-job-idx="${realIdx}" ${j.active !== false ? "checked" : ""} style="cursor:pointer">
              Active
            </label>
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

  // active toggle handler
  list.querySelectorAll(".active-toggle").forEach(cb => {
    cb.addEventListener("change", function() {
      const idx = parseInt(this.dataset.jobIdx);
      const streams = loadStreams();
      const jobs = streams[jobsStreamIndex].jobs || [];
      if (jobs[idx]) jobs[idx].active = this.checked;
      saveStreams(streams);
      renderJobsEditor();
    });
  });

  // job drag and drop
  let jobDragSrc = -1;
  list.addEventListener("dragstart", e => {
    const card = e.target.closest(".stream-drag-card");
    if (!card) return;
    jobDragSrc = parseInt(card.dataset.index);
    card.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  list.addEventListener("dragend", e => {
    list.querySelectorAll(".stream-drag-card").forEach(c => c.classList.remove("dragging", "drag-over-top", "drag-over-bottom"));
  });
  list.addEventListener("dragover", e => {
    e.preventDefault();
    const target = e.target.closest(".stream-drag-card");
    if (!target || jobDragSrc < 0) return;
    list.querySelectorAll(".stream-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
    const rect = target.getBoundingClientRect();
    target.classList.add(e.clientY < rect.top + rect.height / 2 ? "drag-over-top" : "drag-over-bottom");
  });
  list.addEventListener("drop", e => {
    e.preventDefault();
    list.querySelectorAll(".stream-drag-card").forEach(c => c.classList.remove("drag-over-top", "drag-over-bottom"));
    const target = e.target.closest(".stream-drag-card");
    if (!target || jobDragSrc < 0) return;
    const dropIndex = parseInt(target.dataset.index);
    if (dropIndex === jobDragSrc) { jobDragSrc = -1; return; }
    const streams = loadStreams();
    const jobs = streams[jobsStreamIndex].jobs || [];
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
    streams[jobsStreamIndex].jobs = jobs;
    saveStreams(streams);
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
  const streams = loadStreams();
  const jobs = streams[jobsStreamIndex].jobs || [];
  jobsBuffer = JSON.parse(JSON.stringify(jobs[index]));
  jobsEditingIdx = index; isNewJob = false;
  renderJobsEditor();
}

function cancelJobEdit() {
  if (isNewJob && jobsEditingIdx >= 0) {
    const streams = loadStreams();
    const jobs = streams[jobsStreamIndex].jobs || [];
    jobs.splice(jobsEditingIdx, 1);
    streams[jobsStreamIndex].jobs = jobs;
    saveStreams(streams);
  }
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
  renderJobsEditor();
}

function doneJobEdit() {
  if (jobsEditingIdx >= 0 && jobsBuffer) {
    const streams = loadStreams();
    const jobs = streams[jobsStreamIndex].jobs || [];
    jobs[jobsEditingIdx] = jobsBuffer;
    streams[jobsStreamIndex].jobs = jobs;
    saveStreams(streams);
  }
  jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
  renderJobsEditor();
}

function confirmDeleteJob(index) {
  jobsEditingIdx = index;
  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").textContent = 'Delete this job?';
  document.getElementById("deleteConfirmBtn").onclick = function() {
    const streams = loadStreams();
    const jobs = streams[jobsStreamIndex].jobs || [];
    jobs.splice(index, 1);
    jobs.forEach((j, i) => j.sequence = i + 1);
    streams[jobsStreamIndex].jobs = jobs;
    saveStreams(streams);
    bootstrap.Modal.getInstance(modalEl).hide();
    jobsEditingIdx = -1; jobsBuffer = null; isNewJob = false;
    renderJobsEditor();
  };
  new bootstrap.Modal(modalEl).show();
}

function addNewJob() {
  const streams = loadStreams();
  const jobs = streams[jobsStreamIndex].jobs || [];
  const seq = jobs.length + 1;
  const newJob = { id: "job_" + Date.now(), title: "New Job", sequence: seq, description: "", active: true, frequency: "daily" };
  jobs.push(newJob);
  streams[jobsStreamIndex].jobs = jobs;
  saveStreams(streams);
  jobsBuffer = JSON.parse(JSON.stringify(newJob));
  jobsEditingIdx = jobs.length - 1; isNewJob = true;
  renderJobsEditor();
}

// SETTINGS
function openSettings() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("settingsPage").classList.remove("d-none");

  const savedTheme = localStorage.getItem("theme") || "darkly";
  const themeSel = document.getElementById("themeSelector");
  if (themeSel) themeSel.value = savedTheme;
  const savedFontSize = localStorage.getItem("fontSize") || "xlarge";
  const fontSizeSel = document.getElementById("fontSizeSelector");
  if (fontSizeSel) fontSizeSel.value = savedFontSize;
  const autoHide = localStorage.getItem("autoHideMenu") === "true";
  const autoHideCb = document.getElementById("autoHideMenu");
  if (autoHideCb) autoHideCb.checked = autoHide;
  const hideDone = localStorage.getItem("hideDone") === "true";
  const hideDoneCb = document.getElementById("hideDone");
  if (hideDoneCb) hideDoneCb.checked = hideDone;
  const showDanger = localStorage.getItem("showDanger") === "true";
  const showDangerCb = document.getElementById("showDanger");
  if (showDangerCb) showDangerCb.checked = showDanger;
  ["clearAllDataRow", "refreshAppRow"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("d-none", !showDanger);
  });
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
    localStorage.removeItem("planmydays_streams");
    bootstrap.Modal.getInstance(modalEl).hide();
    closeSettings();
  };
  new bootstrap.Modal(modalEl).show();
}

document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "darkly";
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
