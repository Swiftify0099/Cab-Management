"""
Universal DB Migration & Schema Verification Script (Root Launcher).
Executes backend/scripts/verify_all_db_migrations.py from project root.
"""
import asyncio
import os
import sys

# Ensure backend and backend/common directories are in Python path
root_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
backend_dir = os.path.join(root_dir, "backend")
common_dir = os.path.join(backend_dir, "common")
scripts_dir = os.path.join(backend_dir, "scripts")

for p in [root_dir, backend_dir, common_dir, scripts_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from verify_all_db_migrations import verify_and_migrate_all_db

if __name__ == "__main__":
    asyncio.run(verify_and_migrate_all_db())
