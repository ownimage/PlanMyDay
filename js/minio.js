// Minio (S3-compatible) client for PlanMyDay

function changeMinioEnabled(enabled) {
  localStorage.setItem("planmydays_minio_enabled", String(enabled));
  var fields = $id("minioFields");
  if (fields) {
    var inputs = fields.querySelectorAll("input, button");
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = !enabled;
  }
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

function setMinioPasswordVisible(show) {
  var input = $id("minioPassword");
  var eye = $id("minioPasswordEye");
  if (!input || !eye) return;
  input.type = show ? "text" : "password";
  if (show) {
    eye.innerHTML = '<path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755l-.165.165.28.28.066.07.01.002v-.322z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-1.404-1.404L12.364 12l-1.2-1.2L10.8 10.432 9.34 8.97l-4-4L5.22 4.85 0 15.06 1.06 16l1.536-1.536 9.49 9.49.89-.89.52-.52z"/>';
  } else {
    eye.innerHTML = '<path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>';
  }
}

function toggleMinioPassword() {
  var input = $id("minioPassword");
  if (!input) return;
  setMinioPasswordVisible(input.type === "password");
}

function hideMinioPassword() {
  setMinioPasswordVisible(false);
}

function changeMinioBucket(value) {
  localStorage.setItem("planmydays_minio_bucket", value);
}

function minioFriendlyError(e) {
  var msg = (e && e.message) || String(e);
  if (msg.indexOf("Failed to fetch") !== -1 || msg.indexOf("NetworkError") !== -1 || msg.indexOf("ERR_") !== -1) {
    msg = "Cannot reach Minio server. Check: (1) server URL is correct, (2) device and server are on the same network, (3) Minio has CORS set (mc admin config set myminio api cors_allow_origin=\"*\"), (4) HTTPS mixed content if the PWA is on HTTPS but Minio is on HTTP.";
  }
  return msg;
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
  var el = $id("minioEnabled");
  if (el) el.checked = config.enabled;
  el = $id("minioServer");
  if (el) el.value = config.server;
  el = $id("minioUsername");
  if (el) el.value = config.username;
  el = $id("minioPassword");
  if (el) el.value = config.password;
  el = $id("minioBucket");
  if (el) el.value = config.bucket;
  var fields = $id("minioFields");
  if (fields) {
    var inputs = fields.querySelectorAll("input, button");
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = !config.enabled;
  }
}

function updateMinioMenu() {
  var config = getMinioConfig();
  var items = document.querySelectorAll(".minio-menu-item");
  var show = config.enabled;
  for (var i = 0; i < items.length; i++) {
    items[i].style.display = show ? "" : "none";
  }
}

// --- Crypto helpers (Web Crypto API + pure JS fallback) ---

function hasSubtleCrypto() {
  return typeof crypto !== "undefined" && !!crypto.subtle;
}

function sha256(message) {
  var raw = new TextEncoder().encode(String(message));
  if (hasSubtleCrypto()) {
    return crypto.subtle.digest("SHA-256", raw).then(function(buf) {
      return bufToHex(new Uint8Array(buf));
    });
  }
  return Promise.resolve(hexFromBytes(sha256Core(raw)));
}

function hmacSign(keyData, message) {
  var key = typeof keyData === "string" ? new TextEncoder().encode(keyData) : new Uint8Array(keyData);
  var msg = new TextEncoder().encode(message);
  if (hasSubtleCrypto()) {
    return crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]).then(function(cKey) {
      return crypto.subtle.sign("HMAC", cKey, msg);
    });
  }
  return Promise.resolve(hmacSha256Core(key, msg));
}

function hexFromBytes(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) s += ("0" + bytes[i].toString(16)).slice(-2);
  return s;
}

function sha256Core(bytes) {
  var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var l = bytes.length;
  var bitLenHi = Math.floor(l / 0x20000000);
  var bitLenLo = (l << 3) >>> 0;
  var paddedLength = Math.ceil((l + 9) / 64) * 64;
  var m = new Uint8Array(paddedLength);
  m.set(bytes);
  m[l] = 0x80;
  m[paddedLength - 8] = bitLenHi >>> 24;
  m[paddedLength - 7] = bitLenHi >>> 16;
  m[paddedLength - 6] = bitLenHi >>> 8;
  m[paddedLength - 5] = bitLenHi;
  m[paddedLength - 4] = bitLenLo >>> 24;
  m[paddedLength - 3] = bitLenLo >>> 16;
  m[paddedLength - 2] = bitLenLo >>> 8;
  m[paddedLength - 1] = bitLenLo;
  var w = new Int32Array(64);
  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
  for (var chunk = 0; chunk < paddedLength; chunk += 64) {
    for (var i = 0; i < 16; i++) {
      w[i] = (m[chunk + i * 4] << 24) | (m[chunk + i * 4 + 1] << 16) | (m[chunk + i * 4 + 2] << 8) | (m[chunk + i * 4 + 3]);
    }
    for (var j = 16; j < 64; j++) {
      var s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      var s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (var k = 0; k < 64; k++) {
      var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      var ch = (e & f) ^ (~e & g);
      var temp1 = (h + S1 + ch + K[k] + w[k]) | 0;
      var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  var out = new Uint8Array(32);
  for (var n = 0; n < 8; n++) {
    out[n * 4] = H[n] >>> 24; out[n * 4 + 1] = H[n] >>> 16; out[n * 4 + 2] = H[n] >>> 8; out[n * 4 + 3] = H[n];
  }
  return out;
}

function hmacSha256Core(key, msg) {
  var blockSize = 64;
  if (key.length > blockSize) key = sha256Core(key);
  var ipad = new Uint8Array(blockSize);
  var opad = new Uint8Array(blockSize);
  for (var i = 0; i < blockSize; i++) {
    var kb = i < key.length ? key[i] : 0;
    ipad[i] = kb ^ 0x36;
    opad[i] = kb ^ 0x5c;
  }
  var inner = new Uint8Array(ipad.length + msg.length);
  inner.set(ipad);
  inner.set(msg, ipad.length);
  var innerHash = sha256Core(inner);
  var outer = new Uint8Array(opad.length + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, opad.length);
  return sha256Core(outer);
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
    showMinioAlert("Minio export failed: " + minioFriendlyError(e), "error");
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
    '<button type="button" class="btn btn-sm ms-auto" data-bs-dismiss="modal" onclick="closeMinioImport()" style="font-size:1.5rem;line-height:1;padding:0 0.25rem;color:inherit;border:none;background:none">&times;</button>' +
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

  var config = getMinioConfig();
  if (config.bucket) {
    loadMinioBucketFiles(config.bucket);
  } else {
    loadMinioBuckets();
  }
}

function closeMinioImport() {
  var el = document.getElementById("minioImportModal");
  if (el) {
    var modal = bootstrap.Modal.getInstance(el);
    if (modal) safeHideModal("minioImportModal");
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
    showMinioAlert("Failed to list buckets: " + minioFriendlyError(e), "error");
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
    var jsonFiles = objects.filter(function(o) { return o.toLowerCase().endsWith(".json"); }).sort().reverse();

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
    showMinioAlert("Failed to list files: " + minioFriendlyError(e), "error");
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
    var msg = e.message || "";
    if (msg.indexOf("Failed to fetch") !== -1 || msg.indexOf("NetworkError") !== -1) {
      msg = "Cannot reach Minio server. Check server URL, network, CORS, and HTTPS mixed content.";
    }
    showMinioAlert("Import failed: " + msg, "error");
    loadMinioBucketFiles(bucket);
  });
}

document.addEventListener("DOMContentLoaded", function() {
  var minioTab = document.getElementById("minio-tab");
  if (minioTab) minioTab.addEventListener("hidden.bs.tab", hideMinioPassword);
});
