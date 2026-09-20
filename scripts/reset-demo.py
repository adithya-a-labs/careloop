"""Backward-compatible entry point for ``python scripts/reset_demo.py``."""

from reset_demo import main

if __name__ == "__main__":
    raise SystemExit(main())
