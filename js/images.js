let editingImageIndex = -1;
let isNewImage = false;
let isDuplicateImage = false;
let editImageBackup = null;
let imageNameSearch = "";
let imagesPage = 0;
let imagesTotalPages = 1;
const IMAGES_PAGE_SIZE = 30;
const MAX_RASTER_DIM = 1024;

function loadImages() {
  return JSON.parse(localStorage.getItem("planmydays_images") || "[]");
}

function saveImages(images) {
  localStorage.setItem("planmydays_images", JSON.stringify(images));
}

function getImageColors(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:image/svg+xml,")) {
    return { line: "", fill: "", strokeWidth: "" };
  }
  const svgPart = dataUrl.substring("data:image/svg+xml,".length);
  const decoded = decodeURIComponent(svgPart);
  const decodeVal = v => v && v.startsWith("%23") ? "#" + v.substring(3) : v;
  const lineMatch = decoded.match(/\bstroke\s*=\s*["']([^"']+)["']/i);
  const fillMatch = decoded.match(/\bfill\s*=\s*["']([^"']+)["']/i);
  const swMatch = decoded.match(/\bstroke-width\s*=\s*["']([^"']+)["']/i);
  return {
    line: lineMatch ? decodeVal(lineMatch[1]) : "",
    fill: fillMatch ? decodeVal(fillMatch[1]) : "",
    strokeWidth: swMatch ? swMatch[1] : ""
  };
}

function updateSvgColor(dataUrl, attr, newColor) {
  if (!dataUrl || !dataUrl.startsWith("data:image/svg+xml,")) return dataUrl;
  const svgPart = dataUrl.substring("data:image/svg+xml,".length);
  const decoded = decodeURIComponent(svgPart);
  const regex = new RegExp(`\\b${attr}\\s*=\\s*["'][^"']*["']`, 'g');
  const encoded = newColor && newColor.startsWith("#")
    ? newColor
    : newColor || "none";
  const updated = decoded.replace(regex, (m) => {
    const quote = m.includes('"') ? '"' : "'";
    return `${attr}=${quote}${encoded}${quote}`;
  });
  return "data:image/svg+xml," + encodeURIComponent(updated);
}

function isSvgDataUrl(dataUrl) {
  return !!dataUrl && dataUrl.indexOf("data:image/svg+xml,") === 0;
}

function isDarkTheme() {
  return (document.documentElement.getAttribute("data-bs-theme") || "dark") === "dark";
}

function getThemeKey() {
  return isDarkTheme() ? "dark" : "light";
}

function themeKey(themeIdx) {
  return themeIdx === 0 ? "light" : "dark";
}

function getThemeOverride(img, themeIdx) {
  return (img.themes && img.themes[themeKey(themeIdx)]) || {};
}

function ensureThemeOverride(img, themeIdx) {
  const key = themeKey(themeIdx);
  if (!img.themes) img.themes = {};
  if (!img.themes[key]) img.themes[key] = { line: null, fill: null, width: null };
  return img.themes[key];
}

function getThemedImageDataUrl(img, themeKey) {
  if (!img) return null;
  if (!isSvgDataUrl(img.data)) return img.data;
  const key = themeKey || getThemeKey();
  const t = (img.themes && img.themes[key]) || {};
  let out = img.data;
  if (t.line != null && t.line !== "") out = applySvgAttr(out, "stroke", t.line);
  if (t.fill != null && t.fill !== "") out = applySvgAttr(out, "fill", t.fill);
  if (t.width != null && t.width !== "") out = applySvgAttr(out, "stroke-width", t.width);
  return out;
}

function applySvgAttr(dataUrl, attr, value) {
  const svgPart = dataUrl.substring("data:image/svg+xml,".length);
  const decoded = decodeURIComponent(svgPart);
  const rx = new RegExp(`\\b${attr}\\s*=\\s*["'][^"']*["']`);
  if (rx.test(decoded)) {
    return updateSvgColor(dataUrl, attr, value);
  }
  const encoded = value && value.startsWith("#") ? value : value || "none";
  const updated = decoded.replace(/<svg([\s>])/i, `<svg ${attr}="${encoded}"$1`);
  return "data:image/svg+xml," + encodeURIComponent(updated);
}

function updateEditPreview(img, themeIdx) {
  const editedCard = document.querySelector('#imageEditModalBody .card.card-edited');
  if (editedCard) {
    const imgEl = editedCard.querySelector('img.date-img');
    if (imgEl) imgEl.src = getThemedImageDataUrl(img, themeKey(themeIdx));
  }
}

function buildThemeSection(themeIdx, label) {
  const images = loadImages();
  const img = images[editingImageIndex];
  if (!img) return "";
  const base = getImageColors(img.data);
  const override = getThemeOverride(img, themeIdx);
  const effLine = override.line != null ? override.line : base.line;
  const effFill = override.fill != null ? override.fill : base.fill;
  const lineVal = effLine !== "none" && effLine ? effLine : "#000000";
  const fillVal = effFill !== "none" && effFill ? effFill : "#ffffff";
  const widthVal = override.width != null ? override.width : (base.strokeWidth || "2");
  return `
        <div class="pt-2 mt-2 border-top">
          <div class="fw-bold mb-1">${label}</div>
          <div class="d-flex flex-column gap-2">
            <div class="d-flex gap-2 align-items-center">
              <label class="form-label mb-0" style="min-width:45px">Line:</label>
              <input type="color" value="${lineVal}" oninput="editImageColor(${editingImageIndex}, ${themeIdx}, 'stroke', this.value)">
              <label class="form-check-label mb-0">
                <input type="checkbox" ${effLine === 'none' || !effLine ? 'checked' : ''} onchange="editImageStrokeNone(${editingImageIndex}, ${themeIdx}, this.checked)">
                none
              </label>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <label class="form-label mb-0" style="min-width:45px">Fill:</label>
              <input type="color" value="${fillVal}" oninput="editImageColor(${editingImageIndex}, ${themeIdx}, 'fill', this.value)">
              <label class="form-check-label mb-0">
                <input type="checkbox" ${effFill === 'none' || !effFill ? 'checked' : ''} onchange="editImageFillNone(${editingImageIndex}, ${themeIdx}, this.checked)">
                none
              </label>
            </div>
            <div class="d-flex gap-2 align-items-center">
              <label class="form-label mb-0" style="min-width:45px">Width:</label>
              <input type="number" min="0.5" max="10" step="0.5" value="${widthVal}" style="width:70px" class="form-control form-control-sm d-inline-block" oninput="editImageStrokeWidth(${editingImageIndex}, ${themeIdx}, this.value)">
            </div>
          </div>
        </div>
  `;
}

function renderImagesEditor() {
  const list = document.getElementById("imagesList");
  const topTile = document.getElementById("addImageTileTop");
  const filterEl = document.getElementById("imageFilters");
  const singleEditor = document.getElementById("singleImageEditor");

  list.innerHTML = "";
  topTile.innerHTML = "";
  filterEl.innerHTML = "";
  singleEditor.innerHTML = "";

  const images = loadImages();

  if (editingImageIndex >= 0) {
    list.classList.remove("d-none");
    topTile.classList.remove("d-none");
    filterEl.classList.remove("d-none");
    singleEditor.classList.add("d-none");

    const img = images[editingImageIndex];
    const hasData = img.data && img.data.length > 0;
    const colorEditorHtml = (!img.data || isSvgDataUrl(img.data))
      ? buildThemeSection(0, "Light theme") + buildThemeSection(1, "Dark theme")
      : "";

    document.getElementById("imageEditModalTitle").textContent = isNewImage ? "Add Image" : (isDuplicateImage ? "Duplicate Image" : "Edit Image");
    document.getElementById("imageEditModalBody").innerHTML = `
      <div class="card p-3 card-edited">
        <div class="mb-2">
          <label class="form-label mb-1">Name</label>
          <input class="form-control" value="${escapeHtml(img.name)}" onchange="editImageField('name', this.value); checkDuplicateName()" oninput="checkDuplicateName()">
          <div id="imageNameError" class="text-danger mt-1" style="display:none">ERROR: There is already an image with this name.</div>
        </div>
        <div class="d-flex gap-2 align-items-center mb-2">
          <div style="width:45px;flex-shrink:0"></div>
          ${hasData
            ? `<img src="${getThemedImageDataUrl(img)}" class="date-img">`
            : `<div class="date-img d-flex align-items-center justify-content-center text-secondary border rounded">No image</div>`
          }
          <button id="btnImageUpload" class="btn btn-primary btn-sm text-nowrap" onclick="openImageUpload(${editingImageIndex})">Upload</button>
        </div>
        ${colorEditorHtml}
        <div class="d-flex gap-2 mt-3">
          <button id="btnImageEditOk" class="btn btn-success editor-btn flex-fill" onclick="doneImageEdit(${editingImageIndex})">OK</button>
          <button id="btnImageEditCancel" class="btn btn-secondary editor-btn flex-fill" onclick="cancelImageEdit()">Cancel</button>
        </div>
      </div>
    `;

    const modalEl = document.getElementById("imageEditModal");
    let modal = bootstrap.Modal.getInstance(modalEl);
    if (!modal) {
      modal = new bootstrap.Modal(modalEl);
    }
    modal.show();
    updateNavState();
    return;
  }

  list.classList.remove("d-none");
  topTile.classList.remove("d-none");
  filterEl.classList.remove("d-none");
  singleEditor.classList.add("d-none");

  const filtered = images.filter((img, index) => {
    if (imageNameSearch && !img.name.toLowerCase().includes(imageNameSearch.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  imagesTotalPages = Math.ceil(filtered.length / IMAGES_PAGE_SIZE) || 1;
  if (imagesPage >= imagesTotalPages) imagesPage = imagesTotalPages - 1;
  const start = imagesPage * IMAGES_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + IMAGES_PAGE_SIZE);

  pageItems.forEach((img) => {
    const card = document.createElement("div");
    card.className = "card p-3 mb-3";
    const inUse = isImageInUse(img.name);
    const themedData = getThemedImageDataUrl(img);
    card.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <div style="width:40px;height:40px;flex-shrink:0">
          ${themedData ? `<img src="${themedData}" class="date-img" style="max-width:40px;max-height:40px">` : ""}
        </div>
        <span class="fw-bold editor-title flex-grow-1 text-truncate">${escapeHtml(img.name)}</span>
        <div class="image-actions d-flex gap-3 flex-shrink-0">
          <button class="btn btn-danger btn-sm d-flex align-items-center justify-content-center" style="width:36px;height:36px" title="Delete" ${inUse ? "disabled" : ""} onclick="confirmDeleteImage(${images.indexOf(img)})">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
          </button>
          <button class="btn btn-info btn-sm d-flex align-items-center justify-content-center" style="width:36px;height:36px" title="Duplicate" onclick="duplicateImage(${images.indexOf(img)})">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><rect x="1" y="1" width="9" height="9" rx="1"/><rect x="6" y="6" width="9" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
          </button>
          <button class="btn btn-primary btn-sm d-flex align-items-center justify-content-center" style="width:36px;height:36px" title="Edit" onclick="startEditImage(${images.indexOf(img)})">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106a.5.5 0 0 1-.707-.708l-1.28 1.28-1.414-1.414 1.28-1.28a.5.5 0 0 1-.708-.708z"/></svg>
          </button>
        </div>
      </div>
    `;
    list.appendChild(card);
  });

  if (imagesTotalPages > 1) {
    const nav = document.createElement("div");
    nav.className = "d-flex justify-content-center align-items-center gap-3 mt-3 mb-2";
    nav.innerHTML = `
      <button class="btn btn-outline-secondary btn-sm" onclick="imagesPage=Math.max(0,imagesPage-1);renderImagesEditor()" ${imagesPage === 0 ? 'disabled' : ''}>Previous</button>
      <span class="text-nowrap">Page ${imagesPage + 1} of ${imagesTotalPages}</span>
      <button class="btn btn-outline-secondary btn-sm" onclick="imagesPage=Math.min(imagesTotalPages-1,imagesPage+1);renderImagesEditor()" ${imagesPage >= imagesTotalPages - 1 ? 'disabled' : ''}>Next</button>
    `;
    list.appendChild(nav);
  }

  topTile.innerHTML = `
    <div class="d-flex gap-2">
      <button id="btnAddImage" class="btn btn-primary editor-btn btn-wide" onclick="addNewImage()">Add Image</button>
      <button id="btnImagesDone" class="btn btn-success editor-btn btn-wide ms-auto" onclick="closeImagesEditor()">Done</button>
    </div>
  `;

  filterEl.classList.remove("d-none");
  filterEl.innerHTML = `
    <div class="d-flex gap-2 align-items-center">
      <input class="form-control" type="search" placeholder="Search image names..." value="${escapeHtml(imageNameSearch)}" oninput="setImageNameSearch(this.value)">
      <button id="btnImageFilterClear" class="btn btn-outline-secondary btn-sm" onclick="imageNameSearch='';imagesPage=0;renderImagesEditor()">Clear</button>
    </div>
  `;
  updateNavState();
}

function setImageNameSearch(val) {
  imageNameSearch = val;
  imagesPage = 0;
  renderImagesEditor();
  const input = document.querySelector('#imageFilters input[type="search"]');
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function startEditImage(index) {
  const images = loadImages();
  editImageBackup = JSON.parse(JSON.stringify(images[index]));
  editingImageIndex = index;
  isNewImage = false;
  isDuplicateImage = false;
  renderImagesEditor();
  checkDuplicateName();
}

function duplicateImage(index) {
  const images = loadImages();
  if (index < 0 || index >= images.length) return;
  const src = images[index];

  let baseName = src.name.replace(/\s*\(\d+\)\s*$/, "").trim();
  const trailingNum = baseName.match(/^(.*?)\s+(\d+)$/);

  const existingNames = new Set(images.map(i => i.name));
  let newName;

  if (trailingNum) {
    const namePart = trailingNum[1];
    let num = parseInt(trailingNum[2], 10);
    while (existingNames.has(`${namePart} ${num + 1}`)) num++;
    newName = `${namePart} ${num + 1}`;
  } else {
    let n = 2;
    while (existingNames.has(`${baseName} ${n}`)) n++;
    newName = `${baseName} ${n}`;
  }

  const copy = JSON.parse(JSON.stringify(src));
  copy.name = newName;
  images.push(copy);
  saveImages(images);

  editingImageIndex = images.length - 1;
  isNewImage = false;
  isDuplicateImage = true;
  editImageBackup = JSON.parse(JSON.stringify(copy));
  renderImagesEditor();
}

function editImageField(field, value) {
  const images = loadImages();
  if (editingImageIndex < 0 || editingImageIndex >= images.length) return;
  const trimmed = value.trim();
  if (field === 'name') {
    const oldName = images[editingImageIndex].name;
    if (oldName !== trimmed) {
      images[editingImageIndex].name = trimmed;
      saveImages(images);
      return;
    }
  }
  images[editingImageIndex][field] = trimmed;
  saveImages(images);
}

function editImageColor(index, themeIdx, attr, value) {
  const images = loadImages();
  if (index < 0 || index >= images.length) return;
  const img = images[index];
  const override = ensureThemeOverride(img, themeIdx);
  if (attr === 'stroke') override.line = value;
  else if (attr === 'fill') override.fill = value;
  saveImages(images);
  updateEditPreview(img, themeIdx);
}

function editImageFillNone(index, themeIdx, checked) {
  const images = loadImages();
  if (index < 0 || index >= images.length) return;
  const img = images[index];
  const override = ensureThemeOverride(img, themeIdx);
  if (checked) {
    override.fill = "none";
  } else {
    const base = getImageColors(img.data);
    override.fill = base.fill && base.fill !== "none" ? base.fill : "#000000";
  }
  saveImages(images);
  updateEditPreview(img, themeIdx);
}

function editImageStrokeNone(index, themeIdx, checked) {
  const images = loadImages();
  if (index < 0 || index >= images.length) return;
  const img = images[index];
  const override = ensureThemeOverride(img, themeIdx);
  if (checked) {
    override.line = "none";
  } else {
    const base = getImageColors(img.data);
    override.line = base.line && base.line !== "none" ? base.line : "#000000";
  }
  saveImages(images);
  updateEditPreview(img, themeIdx);
}

function editImageStrokeWidth(index, themeIdx, value) {
  const images = loadImages();
  if (index < 0 || index >= images.length) return;
  const img = images[index];
  const override = ensureThemeOverride(img, themeIdx);
  override.width = value || "2";
  saveImages(images);
  updateEditPreview(img, themeIdx);
}

function normalizeSvgForEditing(svgText) {
  svgText = svgText.replace(/<\?xml[^>]*\?>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  const rootHasStroke = /<svg[^>]*\bstroke\s*=/i.test(svgText);
  const rootHasFill = /<svg[^>]*\bfill\s*=/i.test(svgText);
  const firstStroke = svgText.match(/\bstroke\s*=\s*["']([^"']+)["']/i);
  const firstFill = svgText.match(/\bfill\s*=\s*["']([^"']+)["']/i);
  if (!rootHasStroke) {
    const val = firstStroke ? firstStroke[1] : "currentColor";
    svgText = svgText.replace(/<svg/i, `<svg stroke="${val}"`);
  }
  if (!rootHasFill) {
    const val = firstFill ? firstFill[1] : "none";
    svgText = svgText.replace(/<svg/i, `<svg fill="${val}"`);
  }
  return svgText;
}

function openImageUpload(index) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".png,.jpg,.jpeg,.gif,.ico,.svg,.webp";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const images = loadImages();
      if (index < 0 || index >= images.length) return;
      const img = images[index];
      if (isSvgFile(file)) {
        const svgText = normalizeSvgForEditing(evt.target.result);
        img.data = "data:image/svg+xml," + encodeURIComponent(svgText);
        img.themes = { light: { line: null, fill: null, width: null }, dark: { line: null, fill: null, width: null } };
      } else {
        processRasterUpload(evt.target.result, file, result => {
          img.data = result;
          img.themes = null;
          saveImages(images);
          renderImagesEditor();
        });
        return;
      }
      saveImages(images);
      renderImagesEditor();
    };
    if (isSvgFile(file)) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function isSvgFile(file) {
  return file.type === "image/svg+xml" || (file.name && file.name.toLowerCase().endsWith(".svg"));
}

function processRasterUpload(dataUrl, file, callback) {
  const isGif = file.type === "image/gif" || (file.name && file.name.toLowerCase().endsWith(".gif"));
  const isIco = file.type === "image/x-icon" || file.type === "image/vnd.microsoft.icon" || (file.name && file.name.toLowerCase().endsWith(".ico"));
  if (isGif) {
    callback(dataUrl);
    return;
  }
  const isJpg = file.type === "image/jpeg" || (file.name && /\.jpe?g$/i.test(file.name));
  const image = new Image();
  image.onload = () => {
    if (!image.naturalWidth && !image.naturalHeight) {
      callback(dataUrl);
      return;
    }
    const scale = Math.min(1, MAX_RASTER_DIM / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale >= 1 && !isIco) {
      callback(dataUrl);
      return;
    }
    const w = Math.max(1, Math.round(image.naturalWidth * scale));
    const h = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, w, h);
    const mime = isIco || !isJpg ? "image/png" : "image/jpeg";
    const out = mime === "image/jpeg" ? canvas.toDataURL("image/jpeg", 0.85) : canvas.toDataURL("image/png");
    callback(out.length > dataUrl.length ? dataUrl : out);
  };
  image.onerror = () => callback(dataUrl);
  image.src = dataUrl;
}

function addNewImage() {
  const images = loadImages();
  const name = "New Image " + (images.length + 1);
  images.push({ name, data: "" });
  saveImages(images);
  imageNameSearch = "";
  editingImageIndex = images.length - 1;
  isNewImage = true;
  isDuplicateImage = false;
  renderImagesEditor();
  const editorEl = document.getElementById("imagesEditor");
  if (editorEl) editorEl.scrollIntoView({ behavior: "smooth", block: "start" });
  checkDuplicateName();
}

function checkDuplicateName() {
  const images = loadImages();
  const input = document.querySelector('#imageEditModalBody .card-edited input.form-control');
  if (!input) return;
  const trimmed = input.value.trim();
  const hasDuplicate = images.some((img, i) => i !== editingImageIndex && img.name === trimmed);
  const errorEl = document.getElementById("imageNameError");
  const okBtn = document.querySelector('#imageEditModalBody .btn-success.editor-btn');
  if (errorEl) errorEl.style.display = hasDuplicate ? "block" : "none";
  if (okBtn) okBtn.disabled = hasDuplicate;
}

function doneImageEdit(index) {
  const images = loadImages();
  if (images.some((img, i) => i !== index && img.name === images[index].name)) return;
  imageNameSearch = "";
  const sorted = images.slice().sort((a, b) => a.name.localeCompare(b.name));
  const pos = sorted.findIndex(img => img.name === images[index].name);
  imagesPage = pos >= 0 ? Math.floor(pos / IMAGES_PAGE_SIZE) : 0;
  editingImageIndex = -1;
  isNewImage = false;
  isDuplicateImage = false;
  editImageBackup = null;
  safeHideModal("imageEditModal");
  renderImagesEditor();
}

function cancelImageEdit() {
  if (editingImageIndex >= 0) {
    const images = loadImages();
    if (isNewImage) {
      images.splice(editingImageIndex, 1);
    } else if (editImageBackup) {
      images[editingImageIndex] = editImageBackup;
    }
    saveImages(images);
  }
  editingImageIndex = -1;
  isNewImage = false;
  isDuplicateImage = false;
  editImageBackup = null;
  safeHideModal("imageEditModal");
  renderImagesEditor();
}

function confirmDeleteImage(index) {
  const images = loadImages();
  const name = images[index].name;

  const modalEl = document.getElementById("deleteConfirmModal");
  document.getElementById("deleteConfirmMessage").innerHTML =
    `Delete image "<strong>${escapeHtml(name)}</strong>"?`;
  document.getElementById("deleteConfirmBtn").onclick = function() {
    safeHideModal("deleteConfirmModal");
    deleteImage(index);
  };
  new bootstrap.Modal(modalEl).show();
}

function deleteImage(index) {
  const images = loadImages();
  images.splice(index, 1);
  saveImages(images);
  renderImagesEditor();
}

function openImagesEditor() {
  document.getElementById("countdownContainer").classList.add("d-none");
  document.getElementById("streamsEditor").classList.add("d-none");
  document.getElementById("settingsPage").classList.add("d-none");
  document.getElementById("imagesEditor").classList.remove("d-none");
  imagesPage = 0;
  renderImagesEditor();
}

function closeImagesEditor() {
  document.getElementById("imagesEditor").classList.add("d-none");
  document.getElementById("countdownContainer").classList.remove("d-none");
  editingImageIndex = -1;
  isNewImage = false;
  isDuplicateImage = false;
  editImageBackup = null;
  renderMain();
}

function getImageByName(name) {
  if (!name) return null;
  const images = loadImages();
  return images.find(i => i.name === name) || null;
}
function isImageInUse(name) {
  if (!name) return false;
  const streams = loadStreams();
  return streams.some(s => s.image === name || (s.jobs || []).some(j => j.image === name));
}
function getImageDataUrl(name) {
  const img = getImageByName(name);
  return img ? getThemedImageDataUrl(img) : null;
}

let imagePickerCallback = null;
let imagePickerSearch = "";

function openImagePicker(callback) {
  imagePickerCallback = callback;
  imagePickerSearch = "";
  const modalIds = ["streamEditModal", "jobEditModal"];
  const openModals = [];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.classList.contains("show")) return;
    const inst = bootstrap.Modal.getInstance(el);
    if (inst) {
      openModals.push(inst);
      // Prevent hidden modals from intercepting clicks while they fade out
      el.querySelector(".modal-dialog").style.pointerEvents = "none";
      inst.hide();
    } else {
      // Force-hide modal that has no Bootstrap instance
      el.classList.remove("show");
      el.setAttribute("aria-hidden", "true");
      el.removeAttribute("aria-modal");
      el.style.display = "none";
    }
  });
  const modalEl = document.getElementById("imagePickerModal");
  modalEl.style.zIndex = "1060";
  modalEl.addEventListener("hidden.bs.modal", function onHide() {
    modalEl.removeEventListener("hidden.bs.modal", onHide);
    modalEl.style.zIndex = "";
    imagePickerCallback = null;
    imagePickerSearch = "";
    openModals.forEach(inst => {
      inst.show();
      inst._element.querySelector(".modal-dialog").style.pointerEvents = "";
    });
  });
  new bootstrap.Modal(modalEl).show();
  renderImagePicker();
  setTimeout(() => {
    const input = modalEl.querySelector(".image-picker-search");
    if (input) { input.focus(); input.value = ""; }
  }, 200);
}

function closeImagePicker() {
  const modalEl = document.getElementById("imagePickerModal");
  const modal = bootstrap.Modal.getInstance(modalEl);
  if (modal) safeHideModal("imagePickerModal");
  imagePickerCallback = null;
  imagePickerSearch = "";
}

function renderImagePicker() {
  const modal = document.getElementById("imagePickerModal");
  const list = modal.querySelector(".image-picker-list");
  list.innerHTML = "";

  const images = loadImages();
  const filtered = images.filter(img => {
    if (imagePickerSearch && !img.name.toLowerCase().includes(imagePickerSearch.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));

  if (filtered.length === 0) {
    list.innerHTML = `<div class="text-secondary w-100 text-center py-4">${imagePickerSearch ? "No images match your search." : "No images available."}</div>`;
    return;
  }

  filtered.forEach(img => {
    const item = document.createElement("div");
    item.className = "image-picker-item text-center";
    item.style.cssText = "width:95px;cursor:pointer;border:2px solid transparent;border-radius:8px;padding:6px;transition:border-color 0.15s";
    item.innerHTML = `<img src="${getThemedImageDataUrl(img)}" class="date-img" style="width:64px;height:64px;object-fit:contain;display:block;margin:0 auto"><div style="font-size:0.75rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px">${escapeHtml(img.name)}</div>`;
    item.onclick = () => { selectImagePickerItem(img.name); };
    item.onmouseenter = () => { item.style.borderColor = "var(--bs-primary)"; };
    item.onmouseleave = () => { item.style.borderColor = "transparent"; };
    list.appendChild(item);
  });
}

function selectImagePickerItem(name) {
  if (imagePickerCallback) imagePickerCallback(name);
  closeImagePicker();
}

function filterImagePicker(val) {
  imagePickerSearch = val;
  renderImagePicker();
}

function clearImagePickerFilter() {
  imagePickerSearch = "";
  const input = document.querySelector(".image-picker-search");
  if (input) input.value = "";
  renderImagePicker();
}

function seedSampleImages() {
  if (localStorage.getItem("planmydays_images")) return;
  fetch("sampleImages.json?v=" + (typeof BUILD_NUMBER !== "undefined" ? BUILD_NUMBER : Date.now()))
    .then(res => res.json())
    .then(data => {
      if (data && data.images) {
        saveImages(data.images);
      }
    })
    .catch(() => {});
}

function showUploadDialog() {
  let dlg = document.getElementById("uploadProgressDialog");
  if (!dlg) {
    dlg = document.createElement("div");
    dlg.id = "uploadProgressDialog";
    dlg.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center";
    dlg.innerHTML = '<div style="background:var(--bs-body-bg,#1e1e1e);padding:2rem;border-radius:12px;text-align:center;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,0.3)">'
      + '<div class="spinner-border mb-3" role="status"></div>'
      + '<div>Uploading Standard Images…</div></div>';
    document.body.appendChild(dlg);
  }
  dlg.classList.remove("d-none");
}

function hideUploadDialog() {
  const dlg = document.getElementById("uploadProgressDialog");
  if (dlg) dlg.classList.add("d-none");
}

function uploadStandardImages() {
  showUploadDialog();
  fetch("sampleImages.json?v=" + (typeof BUILD_NUMBER !== "undefined" ? BUILD_NUMBER : Date.now()))
    .then(res => res.json())
    .then(data => {
      if (!data || !data.images) return;
      const existing = loadImages();
      const existingNames = new Set(existing.map(img => img.name));
      let added = 0;
      data.images.forEach(img => {
        if (!existingNames.has(img.name)) {
          existing.push(img);
          existingNames.add(img.name);
          added++;
        }
      });
      if (added > 0) {
        saveImages(existing);
        renderImagesEditor();
      }
    })
    .catch(() => {})
    .finally(() => hideUploadDialog());
}