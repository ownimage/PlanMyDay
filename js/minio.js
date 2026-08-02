// Minio (S3-compatible) client for PlanMyDay

function changeMinioEnabled(enabled) {
  localStorage.setItem("planmydays_minio_enabled", String(enabled));
  var fields = document.querySelectorAll("#minioFields input, #minioFields button");
  for (var i = 0; i < fields.length; i++) fields[i].disabled = !enabled;
  updateMinioMenu();
}

function changeMinioServer(value) {
  localStorage.setItem("planmydays_minio_server", value);
}

function changeMinioUsername(value) {
  localStorage.setItem("planmydays_minio_username", value);
}

function changeMinioPassword(value) {
  localStorage.setItem("planmydays_minio_password", value);
}

function toggleMinioPassword() {
  var input = document.getElementById("minioPassword");
  var eye = document.getElementById("minioPasswordEye");
  if (!input || !eye) return;
  var show = input.type === "password";
  input.type = show ? "text" : "password";
  if (show) {
    eye.innerHTML = '<path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755l-.165.165.28.28.066.07.01.002v-.322z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-1.404-1.404L12.364 12l-1.2-1.2L10.8 10.432 9.34 8.97l-4-4L5.22 4.85 0 15.06 1.06 16l1.536-1.536 9.49 9.49.89-.89.52-.52z"/>';
  } else {
    eye.innerHTML = '<path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>';
  }
}

function changeMinioBucket(value) {
  localStorage.setItem("planmydays_minio_bucket", value);
}

function showMinioAlert(message, type) {
  var existing = document.getElementById("minioAlertModal");
  if (existing) existing.remove();

  type = type || "info";
  var btnClass = type === "error" ? "btn-danger" : "btn-primary";
  var icon = type === "error"
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="text-danger mb-2" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="text-primary mb-2" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/></svg>';

  var html = '<div class="modal fade" id="minioAlertModal" tabindex="-1">' +
    '<div class="modal-dialog modal-dialog-centered">' +
    '<div class="modal-content">' +
    '<div class="modal-body text-center py-4">' +
    icon +
    '<p class="mb-3 fs-6 text-break">' + message.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</p>' +
    '<button class="btn ' + btnClass + ' editor-btn flex-fill" data-bs-dismiss="modal">OK</button>' +
    '</div>' +
    '</div></div></div>';

  document.body.insertAdjacentHTML("beforeend", html);
  var modalEl = document.getElementById("minioAlertModal");
  modalEl.addEventListener("hidden.bs.modal", function() {
    var m = document.getElementById("minioAlertModal");
    if (m) m.remove();
  });
  new bootstrap.Modal(modalEl).show();
}

function getMinioConfig() {
  return {
    enabled: localStorage.getItem("planmydays_minio_enabled") === "true",
    server: (localStorage.getItem("planmydays_minio_server") || "").replace(/\/+$/, ""),
    username: localStorage.getItem("planmydays_minio_username") || "",
    password: localStorage.getItem("planmydays_minio_password") || "",
    bucket: localStorage.getItem("planmydays_minio_bucket") || ""
  };
}

function loadMinioSettings() {
  var config = getMinioConfig();
  var el = document.getElementById("minioEnabled");
  if (el) el.checked = config.enabled;
  el = document.getElementById("minioServer");
  if (el) el.value = config.server;
  el = document.getElementById("minioUsername");
  if (el) el.value = config.username;
  el = document.getElementById("minioPassword");
  if (el) el.value = config.password;
  el = document.getElementById("minioBucket");
  if (el) el.value = config.bucket;
  var fields = document.querySelectorAll("#minioFields input, #minioFields button");
  for (var i = 0; i < fields.length; i++) fields[i].disabled = !config.enabled;
}

function updateMinioMenu() {
  var config = getMinioConfig();
  var items = document.querySelectorAll(".minio-menu-item");
  for (var i = 0; i < items.length; i++) {
    items[i].style.display = config.enabled ? "" : "none";
  }
}

// --- Crypto helpers (Web Crypto API) ---

function sha256(message) {
  var msg = new TextEncoder().encode(message);
  return crypto.subtle.digest("SHA-256", msg).then(function(buf) {
    return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
  });
}

function hmacSign(keyData, message) {
  var raw = typeof keyData === "string" ? new TextEncoder().encode(keyData) : keyData;
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]).then(function(cKey) {
    var msg = new TextEncoder().encode(message);
    return crypto.subtle.sign("HMAC", cKey, msg);
  });
}

function getSignatureKey(key, dateStamp, region, service) {
  return hmacSign("AWS4" + key, dateStamp).then(function(kDate) {
    return hmacSign(kDate, region).then(function(kRegion) {
      return hmacSign(kRegion, service).then(function(kService) {
        return hmacSign(kService, "aws4_request");
      });
    });
  });
}

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
}

// --- Minio S3 request ---

function minioRequest(method, bucket, objKey, queryParams, body, config) {
  var server = config.server;
  var region = "us-east-1";
  var service = "s3";

  var now = new Date();
  var amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  var dateStamp = amzDate.substring(0, 8);

  var path = "/";
  if (bucket) path += bucket;
  if (bucket && objKey) path += "/" + objKey.split("/").map(encodeURIComponent).join("/");

  var qsParts = [];
  if (queryParams) {
    Object.keys(queryParams).sort().forEach(function(k) {
      if (queryParams[k] !== null && queryParams[k] !== undefined) {
        qsParts.push(encodeURIComponent(k) + "=" + encodeURIComponent(queryParams[k]));
      }
    });
  }
  var qs = qsParts.join("&");

  var bodyStr = body || "";
  var bodyPromise = body ? sha256(bodyStr) : sha256("");

  return bodyPromise.then(function(payloadHash) {
    var fullPath = server + path + (qs ? "?" + qs : "");
    var url = new URL(fullPath);

    var reqHeaders = {
      "Host": url.host,
      "X-Amz-Date": amzDate,
      "X-Amz-Content-Sha256": payloadHash
    };
    if (body) {
      reqHeaders["Content-Type"] = "application/json";
    }

    var headerKeys = Object.keys(reqHeaders).sort();
    var canonicalHeaders = "";
    var signedHeadersList = [];
    for (var i = 0; i < headerKeys.length; i++) {
      var k = headerKeys[i];
      var lk = k.toLowerCase();
      canonicalHeaders += lk + ":" + reqHeaders[k] + "\n";
      signedHeadersList.push(lk);
    }
    var signedHeaders = signedHeadersList.join(";");

    var canonicalRequest = method + "\n" + path + "\n" + qs + "\n" + canonicalHeaders + "\n" + signedHeaders + "\n" + payloadHash;

    var credentialScope = dateStamp + "/" + region + "/" + service + "/aws4_request";
    return sha256(canonicalRequest).then(function(crHash) {
      var stringToSign = "AWS4-HMAC-SHA256\n" + amzDate + "\n" + credentialScope + "\n" + crHash;
      return getSignatureKey(config.password, dateStamp, region, service).then(function(signingKey) {
        return hmacSign(signingKey, stringToSign).then(function(rawSig) {
          var sigHex = bufToHex(rawSig);
          var authHeader = "AWS4-HMAC-SHA256 Credential=" + config.username + "/" + credentialScope + ", SignedHeaders=" + signedHeaders + ", Signature=" + sigHex;

          var fetchHeaders = {};
          for (var i = 0; i < headerKeys.length; i++) {
            fetchHeaders[headerKeys[i]] = reqHeaders[headerKeys[i]];
          }
          fetchHeaders["Authorization"] = authHeader;

          var fetchOpts = { method: method, headers: fetchHeaders };
          if (body) fetchOpts.body = bodyStr;

          return fetch(fullPath, fetchOpts).then(function(response) {
            return response.text().then(function(text) {
              if (!response.ok) throw new Error("Minio request failed: HTTP " + response.status + " - " + text);
              return text;
            });
          });
        });
      });
    });
  });
}

// --- Minio API operations ---

function minioListBuckets(config) {
  return minioRequest("GET", null, null, null, null, config).then(function(text) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(text, "text/xml");
    var buckets = [];
    xml.querySelectorAll("Buckets > Bucket").forEach(function(b) {
      var name = b.querySelector("Name");
      if (name) buckets.push(name.textContent);
    });
    return buckets;
  });
}

function minioListObjects(bucket, config) {
  return minioRequest("GET", bucket, null, { "list-type": "2" }, null, config).then(function(text) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(text, "text/xml");
    var objects = [];
    xml.querySelectorAll("Contents").forEach(function(c) {
      var key = c.querySelector("Key");
      if (key) objects.push(key.textContent);
    });
    return objects;
  });
}

function minioGetObject(bucket, key, config) {
  return minioRequest("GET", bucket, key, null, null, config);
}

function minioPutObject(bucket, key, data, config) {
  return minioRequest("PUT", bucket, key, null, data, config);
}

// --- Export to Minio ---

function exportToMinio() {
  var config = getMinioConfig();
  if (!config.enabled) return;

  if (!config.server || !config.username || !config.password || !config.bucket) {
    showMinioAlert("Please configure all Minio settings first.", "error");
    return;
  }

  var data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    streams: JSON.parse(localStorage.getItem("planmydays_streams") || "[]"),
    images: JSON.parse(localStorage.getItem("planmydays_images") || "[]")
  };

  var d = new Date();
  var ts = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0");
  var filename = "planmydays-" + ts + ".json";

  var body = JSON.stringify(data, null, 2);

  minioPutObject(config.bucket, filename, body, config).then(function() {
    showMinioAlert("Exported " + filename + " to Minio bucket " + config.bucket, "info");
  }).catch(function(e) {
    showMinioAlert("Minio export failed: " + e.message, "error");
  });
}

// --- Import from Minio ---

function importFromMinio() {
  var config = getMinioConfig();
  if (!config.enabled) return;

  if (!config.server || !config.username || !config.password) {
    showMinioAlert("Please configure Minio server, username and password first.", "error");
    return;
  }

  showMinioImportModal();
}

function showMinioImportModal() {
  var existing = document.getElementById("minioImportModal");
  if (existing) existing.remove();

  var html = '<div class="modal fade" id="minioImportModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">' +
    '<div class="modal-dialog modal-lg modal-dialog-scrollable">' +
    '<div class="modal-content">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">Import from Minio</h3>' +
    '<button type="button" class="btn-close" data-bs-dismiss="modal" onclick="closeMinioImport()"></button>' +
    '</div>' +
    '<div class="modal-body" id="minioImportBody">' +
    '<div class="text-center py-5"><div class="spinner-border"></div><p class="mt-2">Loading buckets...</p></div>' +
    '</div>' +
    '</div></div></div>';

  document.body.insertAdjacentHTML("beforeend", html);

  var modalEl = document.getElementById("minioImportModal");
  modalEl.addEventListener("hidden.bs.modal", function() {
    var m = document.getElementById("minioImportModal");
    if (m) m.remove();
  });
  new bootstrap.Modal(modalEl).show();

  loadMinioBuckets();
}

function closeMinioImport() {
  var el = document.getElementById("minioImportModal");
  if (el) {
    var modal = bootstrap.Modal.getInstance(el);
    if (modal) modal.hide();
  }
}

function loadMinioBuckets() {
  var body = document.getElementById("minioImportBody");
  if (!body) return;
  var config = getMinioConfig();

  minioListBuckets(config).then(function(buckets) {
    if (buckets.length === 0) {
      closeMinioImport();
      showMinioAlert("No buckets found. Check your Minio server connection.", "info");
      return;
    }
    body.innerHTML = '<h5>Select a bucket:</h5>' +
      buckets.map(function(b) {
        var escaped = b.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        return '<button class="btn btn-outline-primary w-100 mb-2 btn-lg text-start" onclick="loadMinioBucketFiles(\'' + escaped + '\')">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="me-2" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>' +
          b + '</button>';
      }).join("");
  }).catch(function(e) {
    closeMinioImport();
    showMinioAlert("Failed to list buckets: " + e.message, "error");
  });
}

function loadMinioBucketFiles(bucket) {
  var body = document.getElementById("minioImportBody");
  if (!body) return;
  var config = getMinioConfig();

  body.innerHTML = '<div class="d-flex align-items-center gap-2 mb-3">' +
    '<button class="btn btn-sm btn-outline-secondary" onclick="loadMinioBuckets()">&#8592; Back</button>' +
    '<h5 class="mb-0">Bucket: ' + bucket.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</h5></div>' +
    '<div class="text-center py-3"><div class="spinner-border"></div><p class="mt-2">Loading files...</p></div>';

  minioListObjects(bucket, config).then(function(objects) {
    var jsonFiles = objects.filter(function(o) { return o.toLowerCase().endsWith(".json"); });

    body.innerHTML = '<div class="d-flex align-items-center gap-2 mb-3">' +
      '<button class="btn btn-sm btn-outline-secondary" onclick="loadMinioBuckets()">&#8592; Back</button>' +
      '<h5 class="mb-0">Bucket: ' + bucket.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '</h5></div>';

    if (jsonFiles.length === 0) {
      body.innerHTML += '<p class="text-secondary">No JSON files found in this bucket.</p>';
      return;
    }

    body.innerHTML += '<h6>Select a file to import:</h6><ul class="list-group">' +
      jsonFiles.map(function(f) {
        var escapedBucket = bucket.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
        var escapedKey = f.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
        return '<li class="list-group-item list-group-item-action d-flex align-items-center gap-2" style="cursor:pointer" onclick="importMinioFile(\'' + escapedBucket + '\', \'' + escapedKey + '\')">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.414A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0H4zm5 1.5v2a1 1 0 0 0 1 1h2l-3-3z"/></svg>' +
          f + '</li>';
      }).join("") +
      "</ul>";
  }).catch(function(e) {
    closeMinioImport();
    showMinioAlert("Failed to list files: " + e.message, "error");
  });
}

function importMinioFile(bucket, key) {
  var config = getMinioConfig();
  var body = document.getElementById("minioImportBody");
  if (!body) return;

  body.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div><p class="mt-2">Downloading ' + key.replace(/</g, "&lt;").replace(/>/g, "&gt;") + '...</p></div>';

  minioGetObject(bucket, key, config).then(function(content) {
    var data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      showMinioAlert("Invalid JSON file: " + e.message, "error");
      loadMinioBucketFiles(bucket);
      return;
    }

    if (!data || (!data.streams && !data.images)) {
      showMinioAlert("Invalid backup file: missing streams or images data.", "error");
      loadMinioBucketFiles(bucket);
      return;
    }

    if (data.streams) localStorage.setItem("planmydays_streams", JSON.stringify(data.streams));
    if (data.images) localStorage.setItem("planmydays_images", JSON.stringify(data.images));

    closeMinioImport();
    showMinioAlert("Imported " + key + " successfully.", "info");
    if (typeof regenerateTiles === "function") regenerateTiles();
  }).catch(function(e) {
    showMinioAlert("Import failed: " + e.message, "error");
    loadMinioBucketFiles(bucket);
  });
}
