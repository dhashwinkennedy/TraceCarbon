import os
import httpx
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://127.0.0.1:8000/api/v1"
client = httpx.Client(base_url=BASE_URL, timeout=30)

supplier_credentials = [
    ("SUP-001", "supplier.steel@axiomx.demo", "AxiomX!Steel#2026"),
    ("SUP-002", "supplier.rubber@axiomx.demo", "AxiomX!Rubber#2026"),
    ("SUP-003", "supplier.aluminium@axiomx.demo", "AxiomX!Aluminium#2026"),
    ("SUP-004", "supplier.cement@axiomx.demo", "AxiomX!Cement#2026"),
    ("SUP-005", "supplier.chemical@axiomx.demo", "AxiomX!Chemical#2026"),
    ("SUP-006", "supplier.packaging@axiomx.demo", "AxiomX!Packaging#2026"),
    ("SUP-007", "supplier.textile@axiomx.demo", "AxiomX!Textile#2026"),
    ("SUP-008", "supplier.glass@axiomx.demo", "AxiomX!Glass#2026"),
    ("SUP-009", "supplier.polymer@axiomx.demo", "AxiomX!Polymer#2026"),
    ("SUP-010", "supplier.machinery@axiomx.demo", "AxiomX!Machinery#2026")
]

print("=" * 80)
print("TESTING SUPPLIER PORTAL SUBMISSION VISIBILITY (API)")
print("=" * 80)

for sid, email, pwd in supplier_credentials:
    res = client.post("/auth/login", json={"email": email, "password": pwd})
    if res.status_code != 200:
        print(f"FAILED LOGIN: {sid} ({email}) - {res.status_code}")
        continue
    tok = res.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    
    sub_res = client.get("/supplier/submissions", headers=h)
    if sub_res.status_code != 200:
        print(f"FAILED GET SUBMISSIONS: {sid} - {sub_res.status_code}")
        continue
    items = sub_res.json().get("items", [])
    periods = [i.get("reporting_month") for i in items]
    sub_ids = [i.get("id") for i in items]
    print(f"{sid:<8} | Visible in Portal: {len(items)} reports | Periods: {periods} | IDs: {sub_ids}")
