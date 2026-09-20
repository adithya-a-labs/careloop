"""Backward-compatible entry point for ``python scripts/seed_demo.py``."""

from seed_demo import main

if __name__ == "__main__":
    raise SystemExit(main())
