import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

class SubPathOnlyHandler(SimpleHTTPRequestHandler):
    # Faithfully mimics a GitHub Pages deployment of the repo at
    # /PlanMyDay/: the app is reachable ONLY under that prefix, and every
    # origin-root path (/, /css/..., /js/..., /vendor/..., /sw.js) is a 404.
    # This makes absolute asset URLs ("/css/themes/...") fail here, exactly as
    # they do on ownimage.github.io/PlanMyDay/ when the URL is mis-derived.
    def translate_path(self, path):
        prefix = "/PlanMyDay"
        if path.startswith(prefix + "/") or path == prefix:
            real = path[len(prefix):] or "/"
            return super().translate_path(real)
        # Map any origin-root request to a non-existent file -> 404.
        return super().translate_path("/__no_such_origin_root_app__")

Handler = SubPathOnlyHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
})

ThreadingHTTPServer(("127.0.0.1", 8081), Handler).serve_forever()