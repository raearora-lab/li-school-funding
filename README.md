# Long Island school districts: funding sources

Static site (no build step) in `public/`. Companion to the enrollment & budgets site.

- Data: `public/data/funding.json` (from `/workspace/li-schools/li_funding.csv`), boundaries copied from the sibling site.
- Rebuild data: `python3 scripts/build_funding.py` (run from /workspace/li-schools) then the li_funding.csv step, then `python3 scripts/export_json.py`.
- Sources: NYS Comptroller Financial Data for Local Governments, school districts FY2025 (2024-25) account-level file (snapshot 2026-10-30); NYSED FARU 2026-27 enacted state aid file DBSAA1 (05/19/26); NYSED 2026-27 Property Tax Report Card.
- Not deployed. Deploy later with `npx wrangler pages deploy public --project-name li-school-funding` once approved.
