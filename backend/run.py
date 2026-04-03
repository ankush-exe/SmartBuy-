"""Convenience script: runs the FastAPI server with uvicorn."""
from pathlib import Path

import uvicorn

if __name__ == "__main__":
    backend_dir = Path(__file__).resolve().parent
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        app_dir=str(backend_dir),
        reload_dirs=[str(backend_dir / "app")],
    )
