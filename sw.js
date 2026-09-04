importScripts("js/build-number.js");

const CACHE = "planmydays-" + BUILD_NUMBER;

const PRECACHE_URLS = [
  ".",
  "index.html",
  "manifest.json",
  "icon.svg",
  "sampleImages.json",
  "css/styles.css",
  "css/themes/cerulean/bootstrap.min.css",
  "css/themes/cosmo/bootstrap.min.css",
  "css/themes/cyborg/bootstrap.min.css",
  "css/themes/darkly/bootstrap.min.css",
  "css/themes/flatly/bootstrap.min.css",
  "css/themes/journal/bootstrap.min.css",
  "css/themes/litera/bootstrap.min.css",
  "css/themes/lumen/bootstrap.min.css",
  "css/themes/lux/bootstrap.min.css",
  "css/themes/materia/bootstrap.min.css",
  "css/themes/minty/bootstrap.min.css",
  "css/themes/morph/bootstrap.min.css",
  "css/themes/pulse/bootstrap.min.css",
  "css/themes/quartz/bootstrap.min.css",
  "css/themes/sandstone/bootstrap.min.css",
  "css/themes/simplex/bootstrap.min.css",
  "css/themes/sketchy/bootstrap.min.css",
  "css/themes/slate/bootstrap.min.css",
  "css/themes/solar/bootstrap.min.css",
  "css/themes/spacelab/bootstrap.min.css",
  "css/themes/superhero/bootstrap.min.css",
  "css/themes/united/bootstrap.min.css",
  "css/themes/vapor/bootstrap.min.css",
  "css/themes/yeti/bootstrap.min.css",
  "css/themes/zephyr/bootstrap.min.css",
  "vendor/bootstrap.bundle.min.js",
  "vendor/flatpickr.min.js",
  "vendor/flatpickr.min.css",
  "vendor/qrcode.min.js",
  "vendor/sortable.min.js",
  "vendor/bmc-default-yellow.png",
  "css/fonts/fonts.css",
  "css/fonts/4iCs6KVjbNBYlgoKcg72j00.woff2",
  "css/fonts/4iCs6KVjbNBYlgoKcQ72j00.woff2",
  "css/fonts/4iCs6KVjbNBYlgoKcw72j00.woff2",
  "css/fonts/4iCs6KVjbNBYlgoKew72j00.woff2",
  "css/fonts/4iCs6KVjbNBYlgoKfA72j00.woff2",
  "css/fonts/4iCs6KVjbNBYlgoKfw72.woff2",
  "css/fonts/4iCv6KVjbNBYlgoCxCvjs2yNL4U.woff2",
  "css/fonts/4iCv6KVjbNBYlgoCxCvjsGyN.woff2",
  "css/fonts/4iCv6KVjbNBYlgoCxCvjtGyNL4U.woff2",
  "css/fonts/4iCv6KVjbNBYlgoCxCvjvGyNL4U.woff2",
  "css/fonts/4iCv6KVjbNBYlgoCxCvjvmyNL4U.woff2",
  "css/fonts/4iCv6KVjbNBYlgoCxCvjvWyNL4U.woff2",
  "css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7jsDJT9g.woff2",
  "css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7ksDJT9g.woff2",
  "css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7nsDI.woff2",
  "css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7osDJT9g.woff2",
  "css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7psDJT9g.woff2",
  "css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7qsDJT9g.woff2",
  "css/fonts/6xK1dSBYKcSV-LCoeQqfX1RYOo3qPZ7rsDJT9g.woff2",
  "css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qN67lqDY.woff2",
  "css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qNa7lqDY.woff2",
  "css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qNK7lqDY.woff2",
  "css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qNq7lqDY.woff2",
  "css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qO67lqDY.woff2",
  "css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qOK7l.woff2",
  "css/fonts/6xK3dSBYKcSV-LCoeQqfX1RYOo3qPK7lqDY.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwkxduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwlBduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwlxdu.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmBduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmhduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmRduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3i54rwmxduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwkxduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwlBduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwlxdu.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmBduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmhduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmRduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ig4vwmxduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwkxduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwlBduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwlxdu.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmBduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmhduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmRduz8A.woff2",
  "css/fonts/6xKydSBYKcSV-LCoeQqfX1RYOo3ik4zwmxduz8A.woff2",
  "css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNBeudwk.woff2",
  "css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNdeudwk.woff2",
  "css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNheudwk.woff2",
  "css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNleudwk.woff2",
  "css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNpeudwk.woff2",
  "css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNReuQ.woff2",
  "css/fonts/CSR54z1Qlv-GDxkbKVQ_dFsvWNteudwk.woff2",
  "css/fonts/CSR64z1Qlv-GDxkbKVQ_fO0KTet_.woff2",
  "css/fonts/CSR64z1Qlv-GDxkbKVQ_fO4KTet_.woff2",
  "css/fonts/CSR64z1Qlv-GDxkbKVQ_fO8KTet_.woff2",
  "css/fonts/CSR64z1Qlv-GDxkbKVQ_fOAKTQ.woff2",
  "css/fonts/CSR64z1Qlv-GDxkbKVQ_fOMKTet_.woff2",
  "css/fonts/CSR64z1Qlv-GDxkbKVQ_fOQKTet_.woff2",
  "css/fonts/CSR64z1Qlv-GDxkbKVQ_fOwKTet_.woff2",
  "css/fonts/JTUSjIg1_i6t8kCHKm459W1hyzbi.woff2",
  "css/fonts/JTUSjIg1_i6t8kCHKm459Wdhyzbi.woff2",
  "css/fonts/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2",
  "css/fonts/JTUSjIg1_i6t8kCHKm459WRhyzbi.woff2",
  "css/fonts/JTUSjIg1_i6t8kCHKm459WZhyzbi.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3-UBGEe.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3CUBGEe.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3GUBGEe.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3iUBGEe.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3KUBGEe.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3OUBGEe.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3yUBA.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMawCUBGEe.woff2",
  "css/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMaxKUBGEe.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqW106F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWt06F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtE6F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtk6F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWtU6F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWu06F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWuk6F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWuU6F.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWvU6F15M.woff2",
  "css/fonts/memtYaGs126MiZpBA-UFUIcVXSCEkx2cmqvXlWqWxU6F15M.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS-muw.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTS2mu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSCmu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSGmu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSKmu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSOmu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSumu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSymu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTUGmu1aB.woff2",
  "css/fonts/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTVOmu1aB.woff2",
  "css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t1R-s.woff2",
  "css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t4R-tCKQ.woff2",
  "css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t6R-tCKQ.woff2",
  "css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7t7R-tCKQ.woff2",
  "css/fonts/pe0TMImSLYBIv1o4X1M8ce2xCx3yop4tQpF_MeTm0lfGWVpNn64CL7U8upHZIbMV51Q42ptCp7txR-tCKQ.woff2",
  "css/fonts/q5uGsou0JOdh94bfuQltOxU.woff2",
  "css/fonts/q5uGsou0JOdh94bfvQlt.woff2",
  "css/fonts/QGYpz_kZZAGCONcK2A4bGOj8mNhN.woff2",
  "css/fonts/S6u8w4BMUTPHjxsAUi-qJCY.woff2",
  "css/fonts/S6u8w4BMUTPHjxsAXC-q.woff2",
  "css/fonts/S6u9w4BMUTPHh6UVSwaPGR_p.woff2",
  "css/fonts/S6u9w4BMUTPHh6UVSwiPGQ.woff2",
  "css/fonts/S6u9w4BMUTPHh7USSwaPGR_p.woff2",
  "css/fonts/S6u9w4BMUTPHh7USSwiPGQ.woff2",
  "css/fonts/S6uyw4BMUTPHjx4wXg.woff2",
  "css/fonts/S6uyw4BMUTPHjxAwXjeu.woff2",
  "css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa0ZL7SUc.woff2",
  "css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1pL7SUc.woff2",
  "css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2",
  "css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2",
  "css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2JL7SUc.woff2",
  "css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2pL7SUc.woff2",
  "css/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa2ZL7SUc.woff2",
  "css/fonts/XRXV3I6Li01BKofIMeaBXso.woff2",
  "css/fonts/XRXV3I6Li01BKofINeaB.woff2",
  "css/fonts/XRXV3I6Li01BKofIO-aBXso.woff2",
  "css/fonts/XRXV3I6Li01BKofIOOaBXso.woff2",
  "css/fonts/XRXV3I6Li01BKofIOuaBXso.woff2",
  "js/build-number.js",
  "js/components/smd-button.js",
  "js/components/smd-page.js",
  "js/components/smd-tabs.js",
  "js/components/pmd-stream-header.js",
  "js/components/pmd-stream-job-card.js",
  "js/components/pmd-job-search-card.js",
  "js/minio.js",
  "js/settings.js",
  "js/app.js",
  "js/images.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
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
  if (new URL(req.url).origin !== self.location.origin) {
    // MinIO S3 server or other external host — handled directly by the browser
    return;
  }
  event.respondWith(
    caches.open(CACHE).then(cache => {
      return cache.match(req).then(cached => {
        const fetchPromise = fetch(req).then(response => {
          if (response && response.status === 200) {
            cache.put(req, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      });
    })
  );
});