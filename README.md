# Long Island school districts: funding sources

Static site (no build step) in `public/`. Companion to the enrollment & budgets site.

- Data: `public/data/funding.json` (from `/workspace/li-schools/li_funding.csv`), boundaries copied from the sibling site.
- Nassau STAR exemptions: `python3 scripts/build_star.py` writes `public/data/star.json` from `data/star/`. That table is STAR exemptions on the district's tax bills (DTF `aa3i-eamx` / `vdat-cgbe`, levy years 2019–2025). It is not added to Comptroller account 1085, which stays the STAR revenue column.
- Rebuild data: `python3 scripts/build_funding.py` (run from /workspace/li-schools) then the li_funding.csv step, then `python3 scripts/export_json.py`.
- Sources: NYS Comptroller Financial Data for Local Governments, school districts FY2025 (2024-25) account-level file (snapshot 2026-10-30); NYSED FARU 2026-27 enacted state aid file DBSAA1 (05/19/26); NYSED 2026-27 Property Tax Report Card.
- `.github/workflows/deploy.yml` deploys `public/` on every push to `main`, using the `CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` repo secrets (same setup as nassau-enrollment-map).
- Live: https://li-school-funding.pages.dev/
- Companion enrollment and budgets page: https://li-school-districts.pages.dev/
