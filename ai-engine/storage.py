import os
import uuid
from pathlib import Path

def upload_dir() -> Path:
    d = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
    d.mkdir(parents=True, exist_ok=True)
    return d

def save_file(content: bytes, original_name: str) -> Path:
    ext = Path(original_name).suffix.lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        ext = ".bin"
    name = f"{uuid.uuid4().hex}{ext}"
    p = upload_dir() / name
    p.write_bytes(content)
    return p
