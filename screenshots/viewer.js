const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const SCREENSHOTS_DIR = __dirname;
const PORT = 3000;

function scanThemes() {
  const themes = [];
  const entries = fs.readdirSync(SCREENSHOTS_DIR);

  for (const entry of entries) {
    const themePath = path.join(SCREENSHOTS_DIR, entry);
    if (entry === 'viewer.html' || entry === 'viewer.js') continue;
    const stat = fs.statSync(themePath);
    if (!stat.isDirectory()) continue;

    const images = fs.readdirSync(themePath)
      .filter(f => /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(f))
      .sort();

    themes.push({ theme: entry, images });
  }

  themes.sort((a, b) => a.theme.localeCompare(b.theme));
  return themes;
}

const HTML_HEAD = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Screenshot Viewer</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.toolbar {
  flex-shrink: 0;
  background: #16213e;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
  position: relative;
  z-index: 100;
}
.toolbar h1 {
  font-size: 1.2em;
  font-weight: 600;
  margin-right: auto;
  color: #f0f0f0;
}
.toolbar button {
  padding: 8px 18px;
  border: 1px solid #3a3a5c;
  border-radius: 6px;
  background: #0f3460;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.2s;
  white-space: nowrap;
}
.toolbar button:hover { background: #1a4a7a; }
#filterPanel {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  width: 600px;
  background: #16213e;
  border: 1px solid #3a3a5c;
  border-radius: 6px;
  padding: 12px;
  max-height: 400px;
  overflow: auto;
  z-index: 200;
}
#filterPanel.open { display: block; }
#filterPanel .panel-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #3a3a5c;
}
#filterPanel label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  cursor: pointer;
  padding: 2px 0;
}
#filterPanel input[type="checkbox"] {
  accent-color: #4a9eff;
}
.filter-toggle {
  position: relative;
}
.scroll-container {
  flex: 1;
  overflow: auto;
}
.scroll-container::-webkit-scrollbar { height: 10px; width: 10px; }
.scroll-container::-webkit-scrollbar-track { background: #111; }
.scroll-container::-webkit-scrollbar-thumb { background: #3a3a5c; border-radius: 4px; }
.content { min-width: max-content; padding: 8px 20px 20px 20px; }
.theme-section { margin-bottom: 4px; }
.theme-section.drag-over { outline: 2px dashed #4a9eff; outline-offset: -2px; border-radius: 8px; }
.theme-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: #16213e;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 1em;
  font-weight: 600;
  transition: background 0.15s;
  position: sticky;
  left: 0;
}
.theme-header:hover { background: #1e2d50; }
.theme-header.dragging { opacity: 0.4; }
.drag-handle {
  cursor: grab;
  color: #555;
  font-size: 1.1em;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
  flex-shrink: 0;
}
.drag-handle:hover { color: #aaa; }
.drag-handle:active { cursor: grabbing; }
.theme-header .arrow {
  font-size: 0.8em;
  transition: transform 0.2s;
  min-width: 14px;
  text-align: center;
}
.theme-section.open .theme-header .arrow { transform: rotate(90deg); }
.theme-header .theme-name { text-transform: capitalize; }
.theme-header .image-count {
  font-size: 0.8em;
  color: #888;
  font-weight: 400;
  margin-left: auto;
}
.theme-body { display: none; padding: 10px 0 4px 0; white-space: nowrap; }
.theme-section.open .theme-body { display: block; }
.image-card {
  display: inline-block;
  vertical-align: top;
  margin-right: 12px;
  text-align: center;
  min-width: 120px;
}
.image-card:last-child { margin-right: 0; }
.image-card img {
  height: 400px;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
  display: block;
  background: #222;
}
.image-card .image-name {
  margin-top: 6px;
  font-size: 0.72em;
  color: #999;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
</head>
<body>
<div class="toolbar">
  <h1>Screenshot Viewer</h1>
  <div class="filter-toggle">
    <button onclick="toggleFilterPanel()">Filter &#9662;</button>
    <div id="filterPanel">
      <div class="panel-bar">
        <button onclick="selectAllImages()">Select / Deselect</button>
      </div>
      <div id="imageCheckboxes"></div>
    </div>
  </div>
  <button onclick="openAll()">Open All</button>
  <button onclick="collapseAll()">Collapse All</button>
  <button onclick="refreshImages()">Refresh</button>
</div>
<div class="scroll-container">
<div class="content" id="container">
`;

const HTML_FOOT = `
</div>
</div>
<script>
(function() {
  var container = document.getElementById('container');
  var dragEl = null;

  function indexOf(el) {
    var children = container.children;
    for (var i = 0; i < children.length; i++) {
      if (children[i] === el) return i;
    }
    return -1;
  }

  function refreshIds() {
    var sections = container.querySelectorAll('.theme-section');
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      s.id = 'section-' + i;
      var header = s.querySelector('.theme-header');
      header.setAttribute('onclick', 'toggleSection(' + i + ')');
      var body = s.querySelector('.theme-body');
      if (body) body.id = 'body-' + i;
    }
  }

  container.addEventListener('dragstart', function(e) {
    dragEl = e.target.closest('.theme-section');
    if (!dragEl) return;
    dragEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setTimeout(function() { if (dragEl) dragEl.style.display = 'none'; }, 0);
  });

  container.addEventListener('dragend', function(e) {
    if (!dragEl) return;
    dragEl.style.display = '';
    dragEl.classList.remove('dragging');
    var all = container.querySelectorAll('.theme-section');
    for (var i = 0; i < all.length; i++) { all[i].classList.remove('drag-over'); }
    dragEl = null;
  });

  container.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragEl) return;

    var target = e.target.closest('.theme-section');
    if (!target || target === dragEl) return;

    var children = Array.from(container.children);
    var dragIdx = children.indexOf(dragEl);
    var targetIdx = children.indexOf(target);

    if (dragIdx < targetIdx) {
      container.insertBefore(dragEl, target.nextSibling);
    } else {
      container.insertBefore(dragEl, target);
    }
    refreshIds();
  });

  container.addEventListener('dragenter', function(e) {
    var section = e.target.closest('.theme-section');
    if (section && section !== dragEl) {
      section.classList.add('drag-over');
    }
  });

  container.addEventListener('dragleave', function(e) {
    var section = e.target.closest('.theme-section');
    if (section && section !== dragEl) {
      section.classList.remove('drag-over');
    }
  });

  container.addEventListener('drop', function(e) {
    e.preventDefault();
    var all = container.querySelectorAll('.theme-section');
    for (var i = 0; i < all.length; i++) { all[i].classList.remove('drag-over'); }
  });

  var sel = document.getElementById('imageCheckboxes');
  var cards = container.querySelectorAll('.image-card');
  var names = [];
  for (var c = 0; c < cards.length; c++) {
    var name = cards[c].querySelector('.image-name').textContent;
    if (names.indexOf(name) === -1 && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(name)) {
      names.push(name);
      var display = name.replace(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i, '');
      var lbl = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.setAttribute('data-name', name);
      cb.setAttribute('onchange', 'filterImagesByCheckbox()');
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(display));
      sel.appendChild(lbl);
    }
  }

  window.filterImagesByCheckbox = function() {
    var checkedNames = {};
    var inputs = document.querySelectorAll('#imageCheckboxes input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].checked) checkedNames[inputs[i].getAttribute('data-name')] = true;
    }
    var anyChecked = Object.keys(checkedNames).length > 0;
    var cards = container.querySelectorAll('.image-card');
    for (var c = 0; c < cards.length; c++) {
      var name = cards[c].querySelector('.image-name').textContent;
      if (!anyChecked) {
        cards[c].style.display = '';
      } else if (checkedNames[name]) {
        cards[c].style.display = '';
      } else {
        cards[c].style.display = 'none';
      }
    }
  };

  window.selectAllImages = function() {
    var inputs = document.querySelectorAll('#imageCheckboxes input[type="checkbox"]');
    var allChecked = true;
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].checked) { allChecked = false; break; }
    }
    var newState = !allChecked;
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = newState;
    }
    window.filterImagesByCheckbox();
  };

  window.toggleFilterPanel = function() {
    var panel = document.getElementById('filterPanel');
    panel.classList.toggle('open');
  };

  document.addEventListener('click', function(e) {
    var panel = document.getElementById('filterPanel');
    var toggle = document.querySelector('.filter-toggle');
    if (!panel.contains(e.target) && !toggle.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  window.toggleSection = function(index) {
    document.getElementById('section-' + index).classList.toggle('open');
  };
  window.openAll = function() {
    document.querySelectorAll('.theme-section').forEach(function(s) { s.classList.add('open'); });
  };
  window.collapseAll = function() {
    document.querySelectorAll('.theme-section').forEach(function(s) { s.classList.remove('open'); });
  };

  window.refreshImages = function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/themes', true);
    xhr.onload = function() {
      if (xhr.status !== 200) return;
      var themes = JSON.parse(xhr.responseText);

      var checkedBoxes = {};
      var inputs = document.querySelectorAll('#imageCheckboxes input[type="checkbox"]');
      for (var i = 0; i < inputs.length; i++) {
        checkedBoxes[inputs[i].getAttribute('data-name')] = inputs[i].checked;
      }

      var openSections = {};
      var sections = container.querySelectorAll('.theme-section');
      for (var s = 0; s < sections.length; s++) {
        var themeName = sections[s].querySelector('.theme-name').textContent;
        openSections[themeName] = sections[s].classList.contains('open');
      }

      var existing = {};
      while (container.firstChild) {
        var sec = container.firstChild;
        var name = sec.querySelector('.theme-name').textContent;
        existing[name] = sec;
        container.removeChild(sec);
      }

      for (var t = 0; t < themes.length; t++) {
        var theme = themes[t];
        var sec = existing[theme.theme] || document.createElement('div');
        sec.className = 'theme-section open';
        sec.id = 'section-' + t;
        sec.setAttribute('draggable', 'true');

        if (openSections.hasOwnProperty(theme.theme)) {
          if (!openSections[theme.theme]) sec.classList.remove('open');
        }

        var header = sec.querySelector('.theme-header');
        if (!header) {
          header = document.createElement('div');
          header.className = 'theme-header';
          var handle = document.createElement('span');
          handle.className = 'drag-handle';
          handle.innerHTML = '&#9776;';
          handle.setAttribute('draggable', 'true');
          handle.title = 'Drag to reorder';
          var arrow = document.createElement('span');
          arrow.className = 'arrow';
          arrow.innerHTML = '&#9654;';
          header.appendChild(handle);
          header.appendChild(arrow);
          var nameSpan = document.createElement('span');
          nameSpan.className = 'theme-name';
          header.appendChild(nameSpan);
          var countSpan = document.createElement('span');
          countSpan.className = 'image-count';
          header.appendChild(countSpan);
          sec.appendChild(header);
        }
        header.setAttribute('onclick', 'toggleSection(' + t + ')');
        header.querySelector('.theme-name').textContent = theme.theme;
        header.querySelector('.image-count').textContent = theme.images.length + ' images';

        var body = sec.querySelector('.theme-body');
        if (!body) {
          body = document.createElement('div');
          body.className = 'theme-body';
          sec.appendChild(body);
        }
        body.id = 'body-' + t;
        body.innerHTML = '';
        var flushts = Date.now();
        for (var img = 0; img < theme.images.length; img++) {
          var src = theme.theme + '/' + theme.images[img];
          body.innerHTML += '<div class="image-card"><img src="' + src + '?v=' + flushts + '" alt="' + theme.images[img] + '" loading="lazy"><div class="image-name">' + theme.images[img] + '</div></div>';
        }

        sec.style.display = '';
        container.appendChild(sec);
      }

      var sel = document.getElementById('imageCheckboxes');
      sel.innerHTML = '';
      var names = [];
      var allCards = container.querySelectorAll('.image-card');
      for (var c = 0; c < allCards.length; c++) {
        var name = allCards[c].querySelector('.image-name').textContent;
        if (names.indexOf(name) === -1 && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(name)) {
          names.push(name);
          var display = name.replace(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i, '');
          var lbl = document.createElement('label');
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = checkedBoxes.hasOwnProperty(name) ? checkedBoxes[name] : true;
          cb.setAttribute('data-name', name);
          cb.setAttribute('onchange', 'filterImagesByCheckbox()');
          lbl.appendChild(cb);
          lbl.appendChild(document.createTextNode(display));
          sel.appendChild(lbl);
        }
      }

      window.filterImagesByCheckbox();
    };
    xhr.send();
  };
})();
</script>
</body>
</html>`;

function buildBody(themes) {
  let html = '';
  const ts = Date.now();
  for (let i = 0; i < themes.length; i++) {
    const t = themes[i];
    html += `<div class="theme-section open" id="section-${i}" draggable="true">`;
    html += `  <div class="theme-header" onclick="toggleSection(${i})">`;
    html += `    <span class="drag-handle" draggable="true" title="Drag to reorder">&#9776;</span>`;
    html += `    <span class="arrow">&#9654;</span>`;
    html += `    <span class="theme-name">${t.theme}</span>`;
    html += `    <span class="image-count">${t.images.length} images</span>`;
    html += `  </div>`;
    html += `  <div class="theme-body" id="body-${i}">`;
    for (const img of t.images) {
      const src = t.theme + '/' + img;
      html += `    <div class="image-card">`;
      html += `      <img src="${src}?v=${ts}" alt="${img}" loading="lazy">`;
      html += `      <div class="image-name">${img}</div>`;
      html += `    </div>`;
    }
    html += `  </div>`;
    html += `</div>`;
  }
  return html;
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/') {
    const themes = scanThemes();
    const html = HTML_HEAD + buildBody(themes) + HTML_FOOT;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  if (urlPath === '/api/themes') {
    const themes = scanThemes();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(themes));
    return;
  }

  const filePath = path.join(SCREENSHOTS_DIR, urlPath.replace(/\//g, path.sep));
  if (!filePath.startsWith(SCREENSHOTS_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css'
  };

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Screenshot viewer: http://localhost:${PORT}`);
  const cmd = process.platform === 'win32'
    ? `start http://localhost:${PORT}`
    : process.platform === 'darwin'
      ? `open http://localhost:${PORT}`
      : `xdg-open http://localhost:${PORT}`;
  exec(cmd);
});
