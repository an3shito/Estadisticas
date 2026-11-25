"""Prueba el control de edición en Chrome con un origen y un perfil de pruebas."""
import getpass
import http.server
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import threading
import time

root = Path(__file__).resolve().parent.parent
artifacts = root / 'liga-navidad' / 'artifacts'
artifacts.mkdir(parents=True, exist_ok=True)
candidates = [
    shutil.which('google-chrome'), shutil.which('chromium'), shutil.which('chrome'),
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
]
browser = next((candidate for candidate in candidates if candidate and Path(candidate).is_file()), None)
if not browser:
    raise SystemExit('No se encontró Chrome ni Edge para ejecutar las pruebas.')
password = getpass.getpass('Contraseña de administrador para las pruebas: ') if sys.stdin.isatty() else sys.stdin.readline().rstrip('\r\n')
if not password:
    raise SystemExit('Introduce la contraseña para comprobar el acceso.')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path == '/__tick':
            # Espera real para operaciones criptográficas cuando Chrome usa tiempo virtual.
            time.sleep(0.025)
            self.send_response(204)
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        if self.path == '/__test_password':
            content = password.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        super().do_GET()


server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
command = [
    browser, '--headless=new', '--disable-gpu', '--disable-background-networking',
    '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + str(artifacts / 'chrome-access-checks'),
    '--window-size=1100,1200', '--virtual-time-budget=30000',
    '--screenshot=' + str(artifacts / 'access-checks.png'), '--dump-dom',
    f'http://127.0.0.1:{server.server_port}/checks/access.browser.html',
]
try:
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8',
                            errors='replace', timeout=55,
                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
finally:
    server.shutdown()
    password = ''
report = re.search(r'<pre id="test-results">(.*?)</pre>', result.stdout, re.S)
print(report.group(1) if report else 'No se recibió un informe de las pruebas.')
(artifacts / 'access-checks-dom.html').write_text(result.stdout, encoding='utf-8')
if result.returncode or 'data-test-status="passed"' not in result.stdout:
    print(result.stderr[-1000:])
    raise SystemExit(1)
