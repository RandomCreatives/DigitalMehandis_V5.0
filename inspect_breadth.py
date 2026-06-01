import pdfplumber
import os

pages_to_check = ["attachments/Page 30.pdf", "attachments/Page 50.pdf"]
for path in pages_to_check:
    if os.path.exists(path):
        with pdfplumber.open(path) as pdf:
            text = pdf.pages[0].extract_text()
            print(f"--- {path} ---")
            print(text[:500])
            print("\n")
