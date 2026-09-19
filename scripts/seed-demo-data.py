"""Seed local Supabase using its CLI. Requires Supabase CLI on PATH."""
import subprocess

subprocess.run(["supabase", "db", "reset"], check=True)
print("CareLoop demo data seeded from supabase/seed.sql")
