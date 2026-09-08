importScripts("js/build-number.js");

const CACHE = "planmydays-" + BUILD_NUMBER;

const PRECACHE_URLS = [
  ".",
  "index.html",
  "manifest.json",
  "icon.svg",
  "ShareMyDays/sampleImages.json",
  "ShareMyDays/css/styles.css",
  "css/styles.css",
  "ShareMyDays/css/themes/cerulean/bootstrap.min.css",
  "ShareMyDays/css/themes/cosmo/bootstrap.min.css",
  "ShareMyDays/css/themes/cyborg/bootstrap.min.css",
  "ShareMyDays/css/themes/darkly/bootstrap.min.css",
  "ShareMyDays/css/themes/flatly/bootstrap.min.css",
  "ShareMyDays/css/themes/journal/bootstrap.min.css",
  "ShareMyDays/css/themes/litera/bootstrap.min.css",
  "ShareMyDays/css/themes/lumen/bootstrap.min.css",
  "ShareMyDays/css/themes/lux/bootstrap.min.css",
  "ShareMyDays/css/themes/materia/bootstrap.min.css",
  "ShareMyDays/css/themes/minty/bootstrap.min.css",
  "ShareMyDays/css/themes/morph/bootstrap.min.css",
  "ShareMyDays/css/themes/pulse/bootstrap.min.css",
  "ShareMyDays/css/themes/quartz/bootstrap.min.css",
  "ShareMyDays/css/themes/sandstone/bootstrap.min.css",
  "ShareMyDays/css/themes/simplex/bootstrap.min.css",
  "ShareMyDays/css/themes/sketchy/bootstrap.min.css",
  "ShareMyDays/css/themes/slate/bootstrap.min.css",
  "ShareMyDays/css/themes/solar/bootstrap.min.css",
  "ShareMyDays/css/themes/spacelab/bootstrap.min.css",
  "ShareMyDays/css/themes/superhero/bootstrap.min.css",
  "ShareMyDays/css/themes/united/bootstrap.min.css",
  "ShareMyDays/css/themes/vapor/bootstrap.min.css",
  "ShareMyDays/css/themes/yeti/bootstrap.min.css",
  "ShareMyDays/css/themes/zephyr/bootstrap.min.css",
  "ShareMyDays/vendor/bootstrap.bundle.min.js",
  "ShareMyDays/vendor/flatpickr.min.js",
  "ShareMyDays/vendor/flatpickr.min.css",
  "ShareMyDays/vendor/qrcode.min.js",
  "ShareMyDays/vendor/sortable.min.js",
  "ShareMyDays/vendor/bmc-default-yellow.png",
  "ShareMyDays/vendor/bootstrap-icons.css",
  "ShareMyDays/vendor/fonts/bootstrap-icons.woff",
  "ShareMyDays/vendor/fonts/bootstrap-icons.woff2",
  "ShareMyDays/vendor/remixicon.css",
  "ShareMyDays/vendor/fonts/remixicon.woff",
  "ShareMyDays/vendor/fonts/remixicon.woff2",
  "ShareMyDays/vendor/fontawesome/css/fontawesome.min.css",
  "ShareMyDays/vendor/fontawesome/css/solid.min.css",
  "ShareMyDays/vendor/fontawesome/css/regular.min.css",
  "ShareMyDays/vendor/fontawesome/css/brands.min.css",
  "ShareMyDays/vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "ShareMyDays/vendor/fontawesome/webfonts/fa-regular-400.woff2",
  "ShareMyDays/vendor/fontawesome/webfonts/fa-brands-400.woff2",
  "ShareMyDays/vendor/material-symbols.css",
  "ShareMyDays/vendor/fonts/MaterialSymbolsOutlined.woff2",
  "ShareMyDays/vendor/fontawesome-icons.json",
  "ShareMyDays/vendor/material-symbols-names.json",
  "ShareMyDays/css/fonts/fonts.css",
  "ShareMyDays/css/fonts/4iCs6KVjbNBYlgoKcg72j00.woff2",
  "ShareMyDays/css/fonts/4iCs6KVjbNBYlgoKcQ72j00.woff2",
  "ShareMyDays/css/fonts/4iCs6KVjbNBYlgoKcw72j00.woff2",
  "ShareMyDays/css/fonts/4iCs6KVjbNBYlgoKew72j00.woff2",
  "ShareMyDays/css/fonts/4iCs6KVjbNBYlgoKfA72j00.woff2",
  "ShareMyDays/css/fonts/4iCs6KVjbNBYlgoKfw72.woff2",
  "ShareMyDays/css/fonts/4iCv6KVjbNBYlgoCxCvjs2yNL4U.woff2",
  "ShareMyDays/css/fonts/4iCv6KVjbNBYlgoCxCvjsGyN.woff2",
  "ShareMyDays/css/fonts/4iCv6KVjbNBYlgoCxCvjtGyNL4U.woff2",
  "ShareMyDays/css/fonts/4iCv6KVjbNBYlgoCxCvjvGyNL4U.woff2",
  "ShareMyDays/css/fonts/4iCv6KVjbNBYlgoCxCvjvmyNL4U.woff2",
  "ShareMyDays/css/fonts/4iCv6KVjbNBYlgoCxCvjvWyNL4U.woff2",
  "ShareMyDays/css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7jsDJT9g.woff2",
  "ShareMyDays/css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7ksDJT9g.woff2",
  "ShareMyDays/css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7nsDI.woff2",
  "ShareMyDays/css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7osDJT9g.woff2",
  "ShareMyDays/css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7psDJT9g.woff2",
  "ShareMyDays/css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7qsDJT9g.woff2",
  "ShareMyDays/css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7rsDJT9g.woff2",
  "ShareMyDays/css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qN67lqDY.woff2",
  "ShareMyDays/css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qNa7lqDY.woff2",
  "ShareMyDays/css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qNK7lqDY.woff2",
  "ShareMyDays/css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qNq7lqDY.woff2",
  "ShareMyDays/css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qO67lqDY.woff2",
  "ShareMyDays/css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7l.woff2",
  "ShareMyDays/css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qPK7lqDY.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwkxduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwlBduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwlxdu.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmBduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmhduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmRduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmxduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwkxduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwlBduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwlxdu.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmBduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmhduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmRduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmxduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwkxduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwlBduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwlxdu.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmBduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmhduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmRduz8A.woff2",
  "ShareMyDays/css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmxduz8A.woff2",
  "ShareMyDays/css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNBeudwk.woff2",
  "ShareMyDays/css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNdeudwk.woff2",
  "ShareMyDays/css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNheudwk.woff2",
  "ShareMyDays/css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNleudwk.woff2",
  "ShareMyDays/css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNpeudwk.woff2",
  "ShareMyDays/css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNReuQ.woff2",
  "ShareMyDays/css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNteudwk.woff2",
  "ShareMyDays/css/fonts/CSR64z1Qlv-GDxkbKVQ_fO0KTet_.woff2",
  "ShareMyDays/css/fonts/CSR64z1Qlv-GDxkbKVQ_fO4KTet_.woff2",
  "ShareMyDays/css/fonts/CSR64z1Qlv-GDxkbKVQ_fO8KTet_.woff2",
  "ShareMyDays/css/fonts/CSR64z1Qlv-GDxkbKVQ_fOAKTQ.woff2",
  "ShareMyDays/css/fonts/CSR64z1Qlv-GDxkbKVQ_fOMKTet_.woff2",
  "ShareMyDays/css/fonts/CSR64z1Qlv-GDxkbKVQ_fOQKTet_.woff2",
  "ShareMyDays/css/fonts/CSR64z1Qlv-GDxkbKVQ_fOwKTet_.woff2",
  "ShareMyDays/css/fonts/JTUSjIg1_i6t8kCHKm459W1hyzbi.woff2",
  "ShareMyDays/css/fonts/JTUSjIg1_i6t8kCHKm459Wdhyzbi.woff2",
  "ShareMyDays/css/fonts/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2",
  "ShareMyDays/css/fonts/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2",
  "ShareMyDays/css/fonts/JTUSjIg1_i6t8kCHKm459WZhyzbi.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3-UBGEe.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3CUBGEe.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3iUBGEe.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3KUBGEe.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3OUBGEe.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3yUBA.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMawCUBGEe.woff2",
  "ShareMyDays/css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMaxKUBGEe.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqW106F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWt06F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtE6F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtk6F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtU6F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWu06F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWuk6F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWuU6F.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWvU6F15M.woff2",
  "ShareMyDays/css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWxU6F15M.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-muw.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS2mu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSCmu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSGmu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSOmu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSumu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSymu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTUGmu1aB.woff2",
  "ShareMyDays/css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTVOmu1aB.woff2",
  "ShareMyDays/css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t1R-s.woff2",
  "ShareMyDays/css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t4R-tCKQ.woff2",
  "ShareMyDays/css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t6R-tCKQ.woff2",
  "ShareMyDays/css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t7R-tCKQ.woff2",
  "ShareMyDays/css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7txR-tCKQ.woff2",
  "ShareMyDays/css/fonts/q5uGsou0JOdh94bfuQltOxU.woff2",
  "ShareMyDays/css/fonts/q5uGsou0JOdh94bfvQlt.woff2",
  "ShareMyDays/css/fonts/QGYpz_kZZAGCONcK2A4bGOj8mNhN.woff2",
  "ShareMyDays/css/fonts/S6u8w4BMUTPHjxsAUi-qJCY.woff2",
  "ShareMyDays/css/fonts/S6u8w4BMUTPHjxsAXC-q.woff2",
  "ShareMyDays/css/fonts/S6u9w4BMUTPHh6UVSwaPGR_p.woff2",
  "ShareMyDays/css/fonts/S6u9w4BMUTPHh6UVSwiPGQ.woff2",
  "ShareMyDays/css/fonts/S6u9w4BMUTPHh7USSwaPGR_p.woff2",
  "ShareMyDays/css/fonts/S6u9w4BMUTPHh7USSwiPGQ.woff2",
  "ShareMyDays/css/fonts/S6uyw4BMUTPHjx4wXg.woff2",
  "ShareMyDays/css/fonts/S6uyw4BMUTPHjxAwXjeu.woff2",
  "ShareMyDays/css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa0ZL7SUc.woff2",
  "ShareMyDays/css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1pL7SUc.woff2",
  "ShareMyDays/css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2",
  "ShareMyDays/css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2",
  "ShareMyDays/css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2",
  "ShareMyDays/css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7SUc.woff2",
  "ShareMyDays/css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2",
  "ShareMyDays/css/fonts/XRXV3I6Li01BKofIMeaBXso.woff2",
  "ShareMyDays/css/fonts/XRXV3I6Li01BKofINeaB.woff2",
  "ShareMyDays/css/fonts/XRXV3I6Li01BKofIO-aBXso.woff2",
  "ShareMyDays/css/fonts/XRXV3I6Li01BKofIOOaBXso.woff2",
  "ShareMyDays/css/fonts/XRXV3I6Li01BKofIOuaBXso.woff2",
  "js/build-number.js",
  "ShareMyDays/js/components/styles.js",
  "ShareMyDays/js/components/smd-button.js",
  "ShareMyDays/js/components/smd-image.js",
  "ShareMyDays/js/components/smd-modal.js",
  "ShareMyDays/js/components/smd-image-card.js",
  "ShareMyDays/js/components/smd-image-select.js",
  "ShareMyDays/js/components/smd-page.js",
  "ShareMyDays/js/components/smd-tabs.js",
  "js/components/pmd-stream-header.js",
  "js/components/pmd-stream-job-card.js",
  "js/components/pmd-job-search-card.js",
"ShareMyDays/js/smd-app.js",
  "ShareMyDays/js/smd-minio.js",
  "ShareMyDays/js/smd-settings.js",
  "ShareMyDays/js/smd-images.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
  // Do NOT skipWaiting() here: activation is user-driven via the SKIP_WAITING
  // message from the page's "Update available" prompt.
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      const activePrefixes = [CACHE];
      return Promise.all(
        keys.filter(k => !activePrefixes.some(p => k === p || k.startsWith(p)))
              .map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    // MinIO S3 server or other external host — handled directly by the browser
    return;
  }
  // Cache by PATHNAME so versioned requests (js/app.js?v=...) hit the same
  // precached entries as their unversioned forms.
  event.respondWith(
    caches.open(CACHE).then(cache => cache.match(url.pathname, { ignoreSearch: true }).then(cached => {
      const network = fetch(req).then(response => {
        if (response && response.status === 200) {
          cache.put(url.pathname, response.clone());
        }
        return response;
      }).catch(() => {
        if (req.mode === "navigate") return cache.match("index.html");
        return cached;
      });
      return cached || network;
    }))
  );
});