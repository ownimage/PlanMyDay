import os
import socket
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

Handler = SimpleHTTPRequestHandler
Handler.extensions_map.update({
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
})

try:
    # A large accept backlog so 30 parallel test shards can connect at once.
    ThreadingHTTPServer.request_queue_size = 512
    ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()
except OSError:
    # Port already in use (another shard started the server first): fall back to
    # binding on the same port, or just serve whatever got there.
    socket.setdefaulttimeout(30)
    ThreadingHTTPServer(("127.0.0.1", 8080), Handler).serve_forever()