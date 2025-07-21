import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = "static"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Перенаправляем запрос к корню (/) на /index.html
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

# Убедимся, что директория static существует
if not os.path.exists(DIRECTORY):
    print(f"Directory '{DIRECTORY}' not found!")
    exit(1)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()