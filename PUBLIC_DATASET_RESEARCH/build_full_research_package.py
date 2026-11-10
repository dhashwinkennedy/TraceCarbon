"""
MASTER BUILD SCRIPT FOR SCOPE3TRACK PUBLIC INDUSTRIAL DATASET RESEARCH PACKAGE
Strictly confined to PUBLIC_DATASET_RESEARCH/

Executes:
1. generate_workbook.py -> Creates 05_AUDIT_WORKBOOK/Scope3Track_Company_Source_Audit.xlsx (11 worksheets)
2. generate_structured_data.py -> Creates 03_STRUCTURED_DISCLOSURES/ & 04_FACTOR_DATASET_REFERENCES/
3. generate_markdown_reports.py -> Creates 01_COMPANY_RESEARCH/, 02_ORIGINAL_SOURCE_DOCUMENTS/, 06_FINAL_RESEARCH_REPORT/, and README.md
"""

import sys
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def run_script(script_name):
    script_path = BASE_DIR / script_name
    print(f"--- Running {script_name} ---")
    result = subprocess.run([sys.executable, str(script_path)], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error in {script_name}:\n{result.stderr}")
        sys.exit(1)
    print(result.stdout.strip())

def main():
    print("=====================================================================")
    print("STARTING FULL RE-BUILD OF PUBLIC_DATASET_RESEARCH ARTIFACTS")
    print("=====================================================================")
    run_script("generate_workbook.py")
    run_script("generate_structured_data.py")
    run_script("generate_markdown_reports.py")
    print("=====================================================================")
    print("BUILD COMPLETE: ALL ARTIFACTS VERIFIED AND UP TO DATE.")
    print("=====================================================================")

if __name__ == "__main__":
    main()
