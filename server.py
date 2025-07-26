import http.server
import socketserver
import os

PORT = 8000  # Порт 80 для соответствия домену
DIRECTORY = "static"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Перенаправляем / и /static/ на /index.html
        if self.path in ['/', '/static/']:
            self.path = '/index.html'
        try:
            return super().do_GET()
        except BrokenPipeError:
            print("BrokenPipeError: Client disconnected")
            pass
        except FileNotFoundError:
            self.send_error(404, "File not found")
            return

# Проверка директории и файла
if not os.path.exists(DIRECTORY):
    print(f"Error: Directory '{DIRECTORY}' not found!")
    exit(1)
if not os.path.exists(os.path.join(DIRECTORY, "index.html")):
    print(f"Error: File 'index.html' not found in '{DIRECTORY}'!")
    exit(1)

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://0.0.0.0:{PORT}")
        httpd.serve_forever()
except OSError as e:
    print(f"Error: Port {PORT} is already in use or requires sudo. Details: {e}")
    exit(1)
