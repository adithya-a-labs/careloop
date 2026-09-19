"""Reset local CareLoop state and reapply migrations plus synthetic seed data."""
import subprocess

subprocess.run(["supabase", "db", "reset"], check=True)
print("CareLoop demo state reset")
