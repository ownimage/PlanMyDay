// regen_sample_images.js
//
// Round-trips the sample image set between sampleImages.json (the data-URL
// based store the app seeds from) and native image files in ./sampleImages/.
//
//   node regen_sample_images.js extract     sampleImages.json       -> sampleImages/
//   node regen_sample_images.js             (default) = regen
//   node regen_sample_images.js regen       sampleImages/           -> sampleImages.json
//
// Rules:
//   - Filenames use the image name with every space (and any other character
//     invalid on Windows) replaced by "_" plus a mime-derived extension
//     (.svg/.gif/.ico/.png/.jpg/.webp).
//   - SVG data URLs are "data:image/svg+xml," + encodeURIComponent(svg);
//     binary payloads are base64 data URLs.
//   - `regen` is NON-DESTRUCTIVE about metadata: for every image already in
//     sampleImages.json it keeps ALL fields as-is (lineColor, fillColor,
//     themes, strokeWidth, _prevFill, _prevStroke, …) and only replaces the
//     `data` when a matching file exists. Images with no matching file keep
//     their original entry untouched. New files (not in the json) are appended.
//   - File <-> name matching is FUZZY: names are canonicalised (lowercase, any
//     run of non-alphanumerics collapses to "_"), so "DIY b/w" matches
//     DIY_b_w.svg, "Noughts & Crosses" matches Noughts_&_Crosses.svg, etc.

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const JSON_FILE = path.join(ROOT, "sampleImages.json");
const IMG_DIR = path.join(ROOT, "sampleImages");

const EXT_BY_MIME = [
  [/svg\+?xml/, "svg"],
  [/^image\/png/, "png"],
  [/^image\/gif/, "gif"],
  [/^image\/x-icon/, "ico"],
  [/^image\/jpeg/, "jpg"],
  [/^image\/webp/, "webp"]
];

const DATA_URL_PREFIX = {
  png: "image/png",
  gif: "image/gif",
  ico: "image/x-icon",
  jpg: "image/jpeg",
  webp: "image/webp"
};

// --- name <-> filename helpers ----------------------------------------------

function extOf(file) {
  const i = file.lastIndexOf(".");
  return i >= 0 ? file.slice(i + 1).toLowerCase() : "";
}

function nameToFile(name, ext) {
  return name.replace(/[\\/:*?"<>|]/g, "_").replace(/ /g, "_") + "." + ext;
}

function fileToName(file) {
  const i = file.lastIndexOf(".");
  return (i >= 0 ? file.slice(0, i) : file).replace(/_/g, " ");
}

// Canonical key used for fuzzy matching. Lowercases and collapses every run of
// non-alphanumeric characters to a single "_", so input "DIY b/w", "DIY_b_w"
// and "DIY b w" all canonicalise to the same key.
function canonical(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// --- data URL helpers -------------------------------------------------------

function extFromDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma).toLowerCase(); // "data:image/svg+xml" | "data:image/png;base64"
  const mime = meta.replace(/^data:/, "").replace(/;.*$/, "");
  for (const [re, ext] of EXT_BY_MIME) {
    if (re.test(mime)) return ext;
  }
  return /;base64/i.test(meta) ? "bin" : "svg";
}

function decodeDataUrl(dataUrl) {
  const comma = dataUrl.indexOf(",");
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (/;base64/i.test(meta)) return Buffer.from(payload, "base64");
  return Buffer.from(decodeURIComponent(payload), "utf8");
}

function encodeDataUrl(ext, content) {
  if (ext === "svg") {
    return "data:image/svg+xml," + encodeURIComponent(content.toString("utf8"));
  }
  const mime = DATA_URL_PREFIX[ext] || "application/octet-stream";
  return "data:" + mime + ";base64," + content.toString("base64");
}

// --- extract: json -> files -------------------------------------------------

function extract() {
  if (!fs.existsSync(JSON_FILE)) {
    console.error("sampleImages.json not found");
    process.exit(1);
  }
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const images = JSON.parse(fs.readFileSync(JSON_FILE, "utf8")).images || [];
  let written = 0;
  for (const img of images) {
    if (!img || !img.name || !img.data) continue;
    const file = nameToFile(img.name, extFromDataUrl(img.data));
    fs.writeFileSync(path.join(IMG_DIR, file), decodeDataUrl(img.data));
    written++;
  }
  console.log(`Extracted ${written} images to ${path.relative(ROOT, IMG_DIR)}/`);
}

// --- regen: files -> json ---------------------------------------------------

function regen() {
  if (!fs.existsSync(IMG_DIR)) {
    console.error("sampleImages/ folder not found — run `node regen_sample_images.js extract` first");
    process.exit(1);
  }
  let prev = { images: [] };
  if (fs.existsSync(JSON_FILE)) {
    try { prev = JSON.parse(fs.readFileSync(JSON_FILE, "utf8")); } catch (e) {}
  }

  const files = fs.readdirSync(IMG_DIR).filter((f) => fs.statSync(path.join(IMG_DIR, f)).isFile());

  // Index files by canonicalised base name (a name may have several files).
  const byCanonical = new Map();
  for (const file of files) {
    const key = canonical(fileToName(file));
    if (!byCanonical.has(key)) byCanonical.set(key, []);
    byCanonical.get(key).push(file);
  }

  const usedFiles = new Set();
  const images = [];

  for (const prevImg of Array.isArray(prev.images) ? prev.images : []) {
    if (!prevImg || !prevImg.name) continue;
    const key = canonical(prevImg.name);
    const candidates = byCanonical.get(key) || [];
    const origExt = prevImg.data ? extFromDataUrl(prevImg.data) : null;
    const hit = candidates.find((f) => origExt && extOf(f) === origExt) || candidates[0];

    if (!hit) {
      // No matching file: leave the original entry completely untouched.
      images.push(prevImg);
      continue;
    }
    usedFiles.add(hit);
    // Clone the existing entry and only replace `data`: keeps the original key
    // order and every metadata field (lineColor, fillColor, themes, strokeWidth,
    // _prevFill, _prevStroke, …) exactly as-is → minimal diff.
    const entry = Object.assign({}, prevImg);
    entry.name = prevImg.name;
    entry.data = encodeDataUrl(extOf(hit), fs.readFileSync(path.join(IMG_DIR, hit)));
    images.push(entry);
  }

  // Append files that didn't match any existing image.
  files
    .filter((f) => !usedFiles.has(f))
    .sort((a, b) => a.localeCompare(b))
    .forEach((file) => {
      images.push({ name: fileToName(file), data: encodeDataUrl(extOf(file), fs.readFileSync(path.join(IMG_DIR, file))) });
    });

  fs.writeFileSync(JSON_FILE, JSON.stringify({ images }, null, 2));
  console.log(`Regenerated sampleImages.json with ${images.length} images.`);
}

const mode = process.argv[2] || "regen";
if (mode === "extract") extract();
else if (mode === "regen") regen();
else {
  console.error('Unknown mode "' + mode + '" — use "extract" or "regen"');
  process.exit(1);
}