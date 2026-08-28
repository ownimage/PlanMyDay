import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

Handler = SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
})

ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()