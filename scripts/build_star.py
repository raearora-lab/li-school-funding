#!/usr/bin/env python3
"""Build public/data/star.json from the Nassau STAR extracts in data/star/.

The page reads that file only. Figures are copied from the CSVs, not recomputed
into new program totals, except sums used to check the county file against the
district rows.
"""
from __future__ import annotations

import csv
import json
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "star"
OUT = ROOT / "public" / "data" / "star.json"
YEARS = list(range(2019, 2026))


def die(msg: str) -> None:
    raise SystemExit(msg)


def blank(value: str | None) -> bool:
    return value is None or str(value).strip() == ""


def parse_int(value: str | None, field: str):
    if blank(value):
        return None
    number = Decimal(str(value).strip())
    if number != number.to_integral_value():
        die(f"{field} is not an integer: {value}")
    return int(number)


def parse_money(value: str | None, field: str):
    if blank(value):
        return None
    number = Decimal(str(value).strip())
    exponent = number.as_tuple().exponent
    if isinstance(exponent, int) and exponent < -2:
        die(f"{field} has more than two decimal places: {value}")
    return number.quantize(Decimal("0.01"))


def yes(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"yes", "true", "1"}


def read_csv(name: str) -> list[dict]:
    path = SRC / name
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def jsonify(value):
    if isinstance(value, Decimal):
        quantized = value.quantize(Decimal("0.01"))
        if quantized == quantized.to_integral_value():
            return int(quantized)
        return float(quantized)
    if isinstance(value, dict):
        return {key: jsonify(item) for key, item in value.items()}
    if isinstance(value, list):
        return [jsonify(item) for item in value]
    return value


def main() -> None:
    crosswalk = read_csv("nassau_district_code_crosswalk.csv")
    history = read_csv("nassau_star_reimbursement_by_district_2019-2025.csv")
    county_rows = read_csv("nassau_star_reimbursement_county_2019-2025.csv")
    savings_rows = read_csv("nassau_star_max_savings_class1_by_district_2025.csv")
    funding = json.loads((ROOT / "public" / "data" / "funding.json").read_text())
    funding_by_id = {row["id"]: row for row in funding["rows"]}

    if len(crosswalk) != 56:
        die(f"expected 56 crosswalk rows, found {len(crosswalk)}")
    if len(history) != 56 * 7:
        die(f"expected 392 history rows, found {len(history)}")
    if len(county_rows) != 7:
        die(f"expected 7 county rows, found {len(county_rows)}")
    if len(savings_rows) != 56:
        die(f"expected 56 max-savings rows, found {len(savings_rows)}")

    by_beds_year: dict[tuple[str, int], dict] = {}
    for row in history:
        beds = row["beds_code"].strip()
        year = parse_int(row["levy_year"], "levy_year")
        key = (beds, year)
        if key in by_beds_year:
            die(f"duplicate history row for {beds} {year}")
        by_beds_year[key] = row

    savings_by_beds = {row["beds_code"].strip(): row for row in savings_rows}
    if len(savings_by_beds) != 56:
        die("duplicate beds code in max-savings file")

    districts = []
    for row in crosswalk:
        beds = row["beds_code"].strip()
        name = row["district_name"].strip()
        chsd = yes(row["is_central_high_school_district"])
        group = row["chsd_group"].strip() or None
        osc = parse_int(row["osc_star_revenue_fy2024_25"], f"{name} osc")
        if osc is None:
            die(f"{name} is missing Comptroller STAR revenue")
        published = yes(row["dtf_reimbursement_row_published"])
        if published == chsd:
            die(f"{name} CHSD flag does not match dtf_reimbursement_row_published")

        fund = funding_by_id.get(beds)
        if fund is None:
            die(f"{name} ({beds}) is not in funding.json")
        if fund["name"] != name or fund["county"] != "Nassau" or fund["nces"] != row["nces_id"].strip():
            die(f"{name} does not match funding.json identity")
        if fund["star"] != osc:
            die(f"{name} OSC STAR {osc} != funding.json {fund['star']}")

        years = {}
        for year in YEARS:
            source = by_beds_year.get((beds, year))
            if source is None:
                die(f"missing {name} levy year {year}")
            if source["district_name"].strip() != name:
                die(f"name mismatch for {beds} {year}")
            if yes(source["is_central_high_school_district"]) != chsd:
                die(f"CHSD flag mismatch for {name} {year}")
            counts = {
                "basic_count": parse_int(source["basic_exemption_count"], f"{name} {year} basic count"),
                "basic_dollars": parse_int(source["basic_reimbursement_dollars"], f"{name} {year} basic dollars"),
                "enhanced_count": parse_int(source["enhanced_exemption_count"], f"{name} {year} enhanced count"),
                "enhanced_dollars": parse_int(source["enhanced_reimbursement_dollars"], f"{name} {year} enhanced dollars"),
                "total_dollars": parse_int(source["total_reimbursement_dollars"], f"{name} {year} total"),
            }
            if source["source_dataset_id"].strip() != "aa3i-eamx":
                die(f"unexpected district dataset for {name}")
            if chsd:
                if any(value is not None for value in counts.values()):
                    die(f"{name} {year} should be blank")
                years[str(year)] = None
                continue
            if any(value is None for value in counts.values()):
                die(f"{name} {year} is missing a figure")
            if counts["basic_dollars"] + counts["enhanced_dollars"] != counts["total_dollars"]:
                die(f"{name} {year} Basic + Enhanced != total")
            if counts["basic_count"] < 0 or counts["enhanced_count"] < 0:
                die(f"{name} {year} has a negative count")
            years[str(year)] = {
                "school_year": source["school_year"].strip(),
                "prepared": source["data_preparation_date"].strip(),
                **counts,
            }

        savings = savings_by_beds.get(beds)
        if savings is None:
            die(f"missing max savings for {name}")
        max_fields = {
            "basic_credit": parse_money(savings["basic_star_credit_max_savings"], f"{name} basic credit"),
            "basic_exemption": parse_money(savings["basic_star_exemption_max_savings"], f"{name} basic exemption"),
            "enhanced_credit": parse_money(savings["enhanced_star_credit_max_savings"], f"{name} enhanced credit"),
            "enhanced_exemption": parse_money(savings["enhanced_star_exemption_max_savings"], f"{name} enhanced exemption"),
        }
        if savings["source_dataset_id"].strip() != "jajz-mu5n":
            die(f"unexpected max-savings dataset for {name}")
        if chsd:
            if any(value is not None for value in max_fields.values()) or savings["tax_class"].strip():
                die(f"{name} should not have a Class 1 maximum")
            maximum = None
        else:
            if any(value is None for value in max_fields.values()):
                die(f"{name} is missing a Class 1 maximum")
            if parse_int(savings["levy_year"], "max levy year") != 2025:
                die(f"{name} max savings is not levy year 2025")
            maximum = {
                "levy_year": 2025,
                "school_year": savings["school_year"].strip(),
                "tax_class": savings["tax_class"].strip(),
                "tax_class_label": savings["tax_class_label"].strip(),
                **max_fields,
            }

        districts.append({
            "id": beds,
            "nces": row["nces_id"].strip(),
            "name": name,
            "orpts": row["orpts_school_district_code"].strip(),
            "chsd": chsd,
            "chsd_group": None if chsd else group,
            "osc_star_fy2024_25": osc,
            "max_savings": maximum,
            "years": years,
        })

    components: dict[str, list[dict]] = {}
    for district in districts:
        if district["chsd_group"]:
            components.setdefault(district["chsd_group"], []).append(
                {"id": district["id"], "name": district["name"]}
            )
    for district in districts:
        if district["chsd"]:
            kids = components.get(district["name"])
            if not kids:
                die(f"{district['name']} has no component districts")
            district["components"] = sorted(kids, key=lambda item: item["name"])

    if sum(1 for district in districts if district["chsd"]) != 3:
        die("expected 3 central high school districts")
    if sum(1 for district in districts if district["chsd_group"]) != 11:
        die("expected 11 component elementary districts")

    county = []
    for row in county_rows:
        if row["county"].strip() != "Nassau" or row["source_dataset_id"].strip() != "vdat-cgbe":
            die("unexpected county row")
        year = parse_int(row["levy_year"], "county year")
        record = {
            "year": year,
            "school_year": row["school_year"].strip(),
            "basic_count": parse_int(row["basic_exemption_count"], "county basic count"),
            "basic_dollars": parse_int(row["basic_reimbursement_dollars"], "county basic dollars"),
            "enhanced_count": parse_int(row["enhanced_exemption_count"], "county enhanced count"),
            "enhanced_dollars": parse_int(row["enhanced_reimbursement_dollars"], "county enhanced dollars"),
            "total_dollars": parse_int(row["total_reimbursement_dollars"], "county total"),
            "district_rows_dollars": parse_int(row["sum_of_53_dtf_district_rows_dollars"], "county district sum"),
            "gap_dollars": parse_int(row["county_minus_53_district_rows_dollars"], "county gap"),
            "district_rows_basic_count": parse_int(row["sum_of_53_dtf_district_rows_basic_count"], "county basic sum"),
            "district_rows_enhanced_count": parse_int(row["sum_of_53_dtf_district_rows_enhanced_count"], "county enhanced sum"),
            "prepared": row["data_preparation_date"].strip(),
        }
        if record["basic_dollars"] + record["enhanced_dollars"] != record["total_dollars"]:
            die(f"county {year} Basic + Enhanced != total")
        if record["district_rows_dollars"] + record["gap_dollars"] != record["total_dollars"]:
            die(f"county {year} district rows + gap != total")
        summed = {"basic_count": 0, "basic_dollars": 0, "enhanced_count": 0, "enhanced_dollars": 0, "total_dollars": 0, "rows": 0}
        for district in districts:
            year_row = district["years"][str(year)]
            if year_row is None:
                continue
            if year_row["school_year"] != record["school_year"] or year_row["prepared"] != record["prepared"]:
                die(f"{district['name']} {year} school year or preparation date != county file")
            summed["rows"] += 1
            for key in ("basic_count", "basic_dollars", "enhanced_count", "enhanced_dollars", "total_dollars"):
                summed[key] += year_row[key]
        if summed["rows"] != 53 or summed["total_dollars"] != record["district_rows_dollars"]:
            die(f"levy year {year} district-row sum {summed['total_dollars']} != county file {record['district_rows_dollars']}")
        if summed["basic_count"] != record["district_rows_basic_count"] or summed["enhanced_count"] != record["district_rows_enhanced_count"]:
            die(f"levy year {year} district count sums do not match the county file")
        if summed["basic_dollars"] + summed["enhanced_dollars"] != summed["total_dollars"]:
            die(f"levy year {year} summed dollars do not add up")
        county.append(record)

    county.sort(key=lambda record: record["year"])
    if [record["year"] for record in county] != YEARS:
        die("county years are not 2019-2025")

    osc_total = sum(district["osc_star_fy2024_25"] for district in districts)
    osc_chsd = sum(district["osc_star_fy2024_25"] for district in districts if district["chsd"])
    if osc_total != 190734040 or osc_chsd != 19669519:
        die(f"unexpected OSC totals {osc_total} / {osc_chsd}")

    headlines = {district["name"]: district for district in districts}
    levittown = headlines["Levittown UFSD"]["years"]["2025"]
    if levittown["total_dollars"] != 12206510 or levittown["basic_count"] + levittown["enhanced_count"] != 7062:
        die("Levittown 2025 check failed")
    if levittown["basic_count"] != 5132 or levittown["enhanced_count"] != 1930:
        die("Levittown 2025 Basic/Enhanced counts check failed")
    if headlines["Levittown UFSD"]["years"]["2019"]["total_dollars"] != 21264408:
        die("Levittown 2019 check failed")
    if headlines["Manhasset UFSD"]["years"]["2025"]["total_dollars"] != 604129:
        die("Manhasset 2025 check failed")
    if headlines["Massapequa UFSD"]["years"]["2025"]["total_dollars"] != 8782938:
        die("Massapequa 2025 check failed")
    county_2025 = next(record for record in county if record["year"] == 2025)
    if county_2025["total_dollars"] != 178413557 or county_2025["gap_dollars"] != 403859:
        die("county 2025 check failed")
    if county_2025["basic_count"] != 105345 or county_2025["basic_dollars"] != 92742259:
        die("county 2025 Basic check failed")
    if county_2025["enhanced_count"] != 35535 or county_2025["enhanced_dollars"] != 85671298:
        die("county 2025 Enhanced check failed")
    if county_2025["district_rows_dollars"] != 178009698:
        die("2025 district-row sum check failed")
    county_2024 = next(record for record in county if record["year"] == 2024)
    if county_2024["total_dollars"] != 191161029 or county_2024["district_rows_dollars"] != 190734039:
        die("county 2024 check failed")
    savings = headlines["Levittown UFSD"]["max_savings"]
    if savings["basic_credit"] != Decimal("1162.00") or savings["basic_exemption"] != Decimal("1139.00"):
        die("Levittown max Basic savings check failed")
    if savings["enhanced_credit"] != Decimal("3304.08") or savings["enhanced_exemption"] != Decimal("3304.08"):
        die("Levittown max Enhanced savings check failed")
    lawrence = headlines["Lawrence UFSD"]["max_savings"]
    if lawrence["basic_credit"] != Decimal("443.64") or lawrence["basic_exemption"] != Decimal("440.00"):
        die("Lawrence max savings check failed")
    for district in districts:
        if district["chsd"] and district["max_savings"] is not None:
            die(f"{district['name']} should not have max savings")
        if not district["chsd"] and district["max_savings"] is None:
            die(f"{district['name']} is missing max savings")

    district_url = history[0]["source_url"].strip()
    county_url = county_rows[0]["source_url"].strip()
    savings_url = savings_rows[0]["source_url"].strip()
    payload = {
        "retrieved": "2026-11-20",
        "years": YEARS,
        "default_year": 2025,
        "sources": {
            "district": {
                "id": "aa3i-eamx",
                "title": "NYS School Tax Relief (STAR) Reimbursement by School District: Beginning Levy Year 1998",
                "url": district_url,
            },
            "county": {
                "id": "vdat-cgbe",
                "title": "NYS School Tax Relief (STAR) Reimbursement by County: Beginning Levy Year 1998",
                "url": county_url,
            },
            "max_savings": {
                "id": "jajz-mu5n",
                "title": "STAR Credit and Exemption History: Beginning 2019",
                "url": savings_url,
            },
        },
        "osc_fy2024_25": {
            "account": "1085",
            "fiscal_year": "2024-25",
            "nassau_total": osc_total,
            "central_high_school_total": osc_chsd,
        },
        "county": county,
        "districts": districts,
    }
    encoded = jsonify(payload)
    text = json.dumps(encoded, indent=2) + "\n"
    for snippet in ("3304.08", "443.64", "3147.01", "1517.29", "178413557", "12206510"):
        if snippet not in text:
            die(f"serialized JSON is missing {snippet}")
    if "not published" in text.lower() or "confidential" in text.lower():
        die("JSON should carry figures only; the page copy explains what is unpublished")
    OUT.write_text(text)
    check = json.loads(text)
    got = next(item for item in check["districts"] if item["name"] == "Levittown UFSD")
    if got["years"]["2025"]["total_dollars"] != 12206510 or got["max_savings"]["enhanced_credit"] != 3304.08:
        die("reread check failed")
    print(f"wrote {OUT.relative_to(ROOT)} ({len(check['districts'])} districts)")


if __name__ == "__main__":
    main()
