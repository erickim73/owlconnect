# ws_streamer.py
import asyncio, contextlib, io, queue, threading, re
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from agents.mentor_mentee_matching import init_MAN

router = APIRouter()

ANSI_RE = re.compile(r'\x1b\[[0-9;]*m')
OSC8_RE = re.compile(r'\x1b]8;[^\\]*\\|\x1b]8;;\\')

NOISE_SUBSTRS = (
    "HTTP/1.1", "httpx", "websockets", "uvicorn", "INFO ", "DEBUG ",
    "WARNING ", "ERROR ", "Traceback", "File \"/", "openrouter.ai/api",
)

ALLOW_PREFIXES = (
    "=== ", "✓", "✗", "✅", "❌", "ℹ️", "[session", "[done", "Mentor:", "Mentee:",
    "Negotiating with", "Potential mentors", "NEGOTIATION",
)

def clean_line(s: str) -> Optional[str]:
    s = OSC8_RE.sub("", s)
    s = ANSI_RE.sub("", s)
    # keep internal spacing; only trim edges
    s = s.rstrip("\r")  # don't strip spaces on the left
    s = s.strip("\n")
    # allow a true blank line to pass through
    if s.strip() == "":
        return ""               # IMPORTANT: return empty string, not None

    if s.startswith(ALLOW_PREFIXES):
        return s

    low = s.lower()
    if any(tok.lower() in low for tok in NOISE_SUBSTRS):
        return None

    # collapse tabs/multiple spaces into one, but keep within-line spacing
    if re.search(r'[A-Za-z]', s):
        return re.sub(r'[ \t]+', ' ', s).strip()

    return None

class LineBuffer(io.TextIOBase):
    """Accumulates writes; emits only newline-terminated lines (preserves blank lines)."""
    def __init__(self, q: "queue.Queue[Optional[str]]"):
        self.buf = ""
        self.q = q
    def write(self, s: str) -> int:
        if not s:
            return 0
        s = s.replace("\r\n", "\n").replace("\r", "\n")
        self.buf += s
        while True:
            i = self.buf.find("\n")
            if i == -1:
                break
            raw, self.buf = self.buf[:i], self.buf[i+1:]
            line = clean_line(raw)
            if line is not None:           # IMPORTANT: allow ""
                self.q.put(line)
        return len(s)
    def flush(self):
        if self.buf != "":
            line = clean_line(self.buf)
            self.buf = ""
            if line is not None:           # IMPORTANT: allow ""
                self.q.put(line)

@router.websocket("/ws/negotiation/{session_id}")
async def ws_negotiation(ws: WebSocket, session_id: str):
    await ws.accept()
    q: "queue.Queue[Optional[str]]" = queue.Queue()

    def run_and_capture():
        q.put(f"[session {session_id}] streaming started")
        writer = LineBuffer(q)
        with contextlib.redirect_stdout(writer):   # only stdout
            try:
                init_MAN()
            except Exception as e:
                q.put(f"✗ Error: {e!r}")
            finally:
                writer.flush()
                q.put(None)  # sentinel

    threading.Thread(target=run_and_capture, daemon=True).start()

    try:
        while True:
            item = await asyncio.to_thread(q.get)
            if item is None:
                if ws.application_state == WebSocketState.CONNECTED:
                    await ws.send_text("[done]")  # <-- final signal the client asked for
                break
            if ws.application_state == WebSocketState.CONNECTED:
                await ws.send_text(item)
            else:
                break
    except WebSocketDisconnect:
        pass