"""Phase 2.10.1: Path Traversal Security & Safe Containment Test Suite

Verifies that the evidence retrieval endpoints strictly enforce Path.relative_to()
containment inside the resolved upload directory, preventing:
- Relative traversal (../)
- Sibling-directory prefix collisions (/uploads_evil)
- Symlink escapes pointing outside the upload directory
"""
import sys, os
from pathlib import Path
from unittest.mock import patch
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()
os.environ["MONGODB_DB"] = "scope3track_final_qa"
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))

from fastapi.testclient import TestClient
from backend.app.main import app, ROOT, settings

def run_path_security_tests():
    print("=" * 70)
    print("Phase 2.10.1: Running Path Traversal Security & Containment Tests")
    print("=" * 70)

    with TestClient(app) as client:
        # 1. Authenticate as assigned auditor (auditor-xyz)
        auth_res = client.post(
            "/api/v1/auth/login",
            json={"email": "auditor.xyz@scope3track.demo", "password": "AuditorDemo123!"}
        )
        assert auth_res.status_code == 200, f"Login failed: {auth_res.text}"
        token = auth_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        sid = "c07ed2f9-8dcf-440b-bcbb-75914427543c" # SUP-005 FY2023-24
        upload_folder = (ROOT / settings.upload_dir).resolve()
        
        # -------------------------------------------------------------
        # Test 1: Valid PDF inside upload directory
        # -------------------------------------------------------------
        valid_pdf_eid = "36c88aaa-8fc9-4993-b2cc-3976c49ede5b"
        r1 = client.get(
            f"/api/v1/auditor/submissions/{sid}/evidence/{valid_pdf_eid}/file",
            headers=headers
        )
        print(f"Test 1 [Valid PDF]: Status {r1.status_code}, Content-Type: {r1.headers.get('content-type')}")
        assert r1.status_code == 200, f"Expected 200, got {r1.status_code}: {r1.text}"
        assert r1.headers.get("content-type") == "application/pdf"
        assert len(r1.content) > 0

        # -------------------------------------------------------------
        # Test 2: Valid Image inside upload directory
        # -------------------------------------------------------------
        valid_png_eid = "c50011b4-fdc2-42a5-afb0-2739d7146ec9"
        r2 = client.get(
            f"/api/v1/auditor/submissions/{sid}/evidence/{valid_png_eid}/file",
            headers=headers
        )
        print(f"Test 2 [Valid Image]: Status {r2.status_code}, Content-Type: {r2.headers.get('content-type')}")
        assert r2.status_code == 200, f"Expected 200, got {r2.status_code}: {r2.text}"
        assert r2.headers.get("content-type") == "image/png"
        assert len(r2.content) > 0

        # -------------------------------------------------------------
        # Test 3: ../ Traversal Attempt
        # -------------------------------------------------------------
        fake_traversal_doc = {
            "id": "sec-test-traversal-dotdot",
            "submission_id": sid,
            "filename": "main.py",
            "stored_filename": "../backend/app/main.py",
            "size": 1024
        }
        from backend.app.main import find as real_find
        def mock_find_traversal(coll, doc_id):
            if coll == "evidence_documents":
                return fake_traversal_doc
            return real_find(coll, doc_id)

        with patch("backend.app.main.find", side_effect=mock_find_traversal):
            r3 = client.get(
                f"/api/v1/auditor/submissions/{sid}/evidence/sec-test-traversal-dotdot/file",
                headers=headers
            )
            print(f"Test 3 [../ Traversal]: Status {r3.status_code}, Detail: {r3.json().get('detail')}")
            assert r3.status_code == 403, f"Expected 403, got {r3.status_code}"
            assert "outside upload directory" in r3.json()["detail"]

        # -------------------------------------------------------------
        # Test 4: Sibling-Directory Prefix Attack (/uploads_evil)
        # -------------------------------------------------------------
        # Simulates a sibling folder named uploads_evil that shares the 'uploads' string prefix
        fake_sibling_doc = {
            "id": "sec-test-sibling-prefix",
            "submission_id": sid,
            "filename": "confidential_leak.txt",
            "stored_filename": "../uploads_evil/confidential_leak.txt",
            "size": 512
        }
        def mock_find_sibling(coll, doc_id):
            if coll == "evidence_documents":
                return fake_sibling_doc
            return real_find(coll, doc_id)

        with patch("backend.app.main.find", side_effect=mock_find_sibling):
            r4 = client.get(
                f"/api/v1/auditor/submissions/{sid}/evidence/sec-test-sibling-prefix/file",
                headers=headers
            )
            print(f"Test 4 [Sibling Prefix /uploads_evil]: Status {r4.status_code}, Detail: {r4.json().get('detail')}")
            assert r4.status_code == 403, f"Expected 403, got {r4.status_code}"
            assert "outside upload directory" in r4.json()["detail"]

        # -------------------------------------------------------------
        # Test 5: Symlink Pointing Outside Upload Directory
        # -------------------------------------------------------------
        # Create a real test file outside uploads and attempt symlink creation
        outside_file = (ROOT / "secret_sensitive_data.txt").resolve()
        outside_file.write_text("SUPER_SECRET_PAYLOAD_DO_NOT_LEAK")
        symlink_file = upload_folder / "test_escape_symlink.pdf"
        
        symlink_supported = False
        try:
            if symlink_file.exists() or symlink_file.is_symlink():
                symlink_file.unlink()
            os.symlink(outside_file, symlink_file)
            symlink_supported = True
            print("Symlink creation supported by current OS privileges")
        except (OSError, NotImplementedError) as err:
            print(f"Native symlink creation requires elevated OS privileges on Windows ({err})")

        if symlink_supported:
            fake_symlink_doc = {
                "id": "sec-test-symlink-escape",
                "submission_id": sid,
                "filename": "test_escape_symlink.pdf",
                "stored_filename": "test_escape_symlink.pdf",
                "size": 64
            }
            def mock_find_sym(coll, doc_id):
                if coll == "evidence_documents":
                    return fake_symlink_doc
                return real_find(coll, doc_id)

            with patch("backend.app.main.find", side_effect=mock_find_sym):
                r5 = client.get(
                    f"/api/v1/auditor/submissions/{sid}/evidence/sec-test-symlink-escape/file",
                    headers=headers
                )
                print(f"Test 5 [Symlink Escape Real]: Status {r5.status_code}, Detail: {r5.json().get('detail')}")
                assert r5.status_code == 403
                assert "outside upload directory" in r5.json()["detail"]
            symlink_file.unlink(missing_ok=True)
        else:
            # Simulate symlink resolution behavior: a stored file resolving to the outside target
            fake_symlink_doc = {
                "id": "sec-test-symlink-simulated",
                "submission_id": sid,
                "filename": "test_escape_symlink.pdf",
                "stored_filename": "../../secret_sensitive_data.txt",
                "size": 64
            }
            def mock_find_sym_sim(coll, doc_id):
                if coll == "evidence_documents":
                    return fake_symlink_doc
                return real_find(coll, doc_id)

            with patch("backend.app.main.find", side_effect=mock_find_sym_sim):
                r5 = client.get(
                    f"/api/v1/auditor/submissions/{sid}/evidence/sec-test-symlink-simulated/file",
                    headers=headers
                )
                print(f"Test 5 [Symlink Escape Simulated]: Status {r5.status_code}, Detail: {r5.json().get('detail')}")
                assert r5.status_code == 403
                assert "outside upload directory" in r5.json()["detail"]

        outside_file.unlink(missing_ok=True)

        print("-" * 70)
        print("ALL 5 PATH TRAVERSAL & CONTAINMENT TESTS PASSED SUCCESSFULLY!")
        print("=" * 70)

if __name__ == "__main__":
    run_path_security_tests()
