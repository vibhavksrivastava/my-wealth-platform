import re
import sys
import json
import pypdf

def extract_cas_pdf(pdf_path, password=None):
    reader = pypdf.PdfReader(pdf_path)
    if reader.is_encrypted:
        if not password:
            return {"error": "PDF is password protected. Please provide the statement password (usually your PAN in ALL CAPS)."}
        try:
            res = reader.decrypt(password)
            if res == 0:
                return {"error": "Incorrect PDF password. CAMS/CDSL CAS PDFs usually require your 10-character PAN in ALL CAPS or Date of Birth (DDMMYYYY)."}
        except Exception as e:
            return {"error": f"Failed to decrypt PDF: {str(e)}"}

    text = ""
    for page in reader.pages:
        page_text = page.extract_text() or ""
        text += "\n" + page_text

    text = text.replace('\xad', '').replace('\ufffd', '')

    # Extract Investor Name & PAN
    investor_name = ""
    investor_pan = ""
    pan_match = re.search(r'([A-Z\s]{4,40})\s+PAN:\s*([A-Z0-9]{10})', text)
    if pan_match:
        investor_name = re.sub(r'\s+', ' ', pan_match.group(1)).strip()
        investor_pan = pan_match.group(2).strip()
    else:
        name_match = re.search(r'In the single name of\s*\n\s*([^\n\(]+)\s*\(\s*PAN\s*:\s*([A-Z0-9]+)\s*\)', text)
        if name_match:
            investor_name = re.sub(r'\s+', ' ', name_match.group(1)).strip()
            investor_pan = name_match.group(2).strip()
        else:
            n2 = re.search(r'Name/Joint Name \(s\)[^\n]*\n([A-Z\s]{4,40})\n', text)
            if n2:
                investor_name = re.sub(r'\s+', ' ', n2.group(1)).strip()

    # Extract Total Portfolio Valuation
    total_val_match = re.search(r'T\s*otal Portfolio Value\s+([0-9,]+\.[0-9]{2})', text)
    total_val = float(total_val_match.group(1).replace(',', '')) if total_val_match else None

    # First build a mapping of ISIN to full Scheme Name and AMC from the Account Details section
    scheme_map = {}
    amc_map = {}
    folio_map = {}
    for m in re.finditer(r'AMC Name\s*:\s*([^\n]+)\s*\nScheme Name\s*:\s*([^\n]+(?:\n[^\n]+)?)\s*Scheme Code[^\n]*\s*\nFolio No\s*:\s*([^\n\s]+)[^\n]*\s*\n(?:[^\n]*\n)?ISIN\s*:\s*([A-Z0-9]{12})', text):
        amc = m.group(1).strip()
        scheme = re.sub(r'\s+', ' ', m.group(2).strip())
        folio = m.group(3).strip()
        isin = m.group(4).strip()
        scheme_map[isin] = scheme
        amc_map[isin] = amc
        folio_map[isin] = folio

    holdings = []
    lines = text.split('\n')
    i = 0
    in_summary_table = False

    while i < len(lines):
        line = lines[i].strip()
        if 'MUTUAL FUND UNITS HELD AS ON' in line:
            in_summary_table = True
        if in_summary_table and 'Grand T otal' in line:
            in_summary_table = False

        if in_summary_table:
            isin_match = re.search(r'(INF[0-9A-Z]{9})', line)
            if isin_match:
                isin = isin_match.group(1)
                
                # Retrieve Scheme Name from previous lines
                scheme_lines = []
                j = i - 1
                while j >= 0:
                    prev = lines[j].strip()
                    if not prev or prev.startswith('===') or prev.startswith('Central') or prev.startswith('Page') or prev.startswith('Summary') or prev.startswith('VIBHAV') or prev.startswith('MUTUAL') or prev.startswith('Scheme Name') or re.search(r'INF[0-9A-Z]{9}', prev):
                        break
                    scheme_lines.insert(0, prev)
                    j -= 1
                
                raw_scheme_name = ' '.join(scheme_lines).strip()
                # Clean up prefixes like LMGP - or LCDG -
                clean_scheme_name = re.sub(r'^[A-Z0-9]+\s*-\s*', '', raw_scheme_name)

                if isin in scheme_map:
                    clean_scheme_name = re.sub(r'^[A-Z0-9]+\s*-\s*', '', scheme_map[isin])

                tokens = line.split()
                isin_idx = tokens.index(isin)
                folio = tokens[isin_idx + 1] if len(tokens) > isin_idx + 1 else folio_map.get(isin, '')
                arn = tokens[isin_idx + 2] if len(tokens) > isin_idx + 2 else ''
                units_str = tokens[isin_idx + 3] if len(tokens) > isin_idx + 3 else '0'
                nav_str = tokens[isin_idx + 4] if len(tokens) > isin_idx + 4 else '0'
                cost_str = tokens[isin_idx + 5] if len(tokens) > isin_idx + 5 else '0'
                val_str = tokens[isin_idx + 6] if len(tokens) > isin_idx + 6 else '0'

                try:
                    units = float(units_str.replace(',', ''))
                except:
                    units = 0.0
                try:
                    nav = float(nav_str.replace(',', ''))
                except:
                    nav = 0.0
                try:
                    cost = float(cost_str.replace(',', ''))
                except:
                    cost = 0.0
                try:
                    val = float(val_str.replace(',', ''))
                except:
                    val = 0.0

                holdings.append({
                    "isin": isin,
                    "scheme": clean_scheme_name or f"Mutual Fund ({isin})",
                    "amc": amc_map.get(isin, clean_scheme_name.split()[0] if clean_scheme_name else "Mutual Fund"),
                    "folio": folio,
                    "arn": arn,
                    "units": units,
                    "nav": nav,
                    "cost": cost,
                    "valuation": val
                })
        i += 1

    # Fallback for standard CAMS/KFintech layout if CDSL table not found
    if len(holdings) == 0:
        cams_blocks = re.split(r'(?:Folio\s*No\.?\s*:?|Folio\s*:)\s*', text, flags=re.I)
        for block in cams_blocks[1:]:
            folio_m = re.match(r'^([A-Z0-9\/\-]+)', block.strip())
            folio = folio_m.group(1).strip() if folio_m else ""
            
            # Find scheme name
            lines_in_block = [l.strip() for l in block.split('\n') if l.strip()]
            scheme = ""
            for l in lines_in_block[:5]:
                if re.search(r'(?:fund|growth|dividend|direct|regular|plan|equity|debt|index|hybrid)', l, re.I) and not re.search(r'(?:folio|pan|kyc|statement|advisor)', l, re.I):
                    scheme = l
                    break

            val_m = re.search(r'(?:valuation|market\s*value|current\s*value)[^\d]*([0-9,]+\.[0-9]{2})', block, re.I)
            val = float(val_m.group(1).replace(',', '')) if val_m else 0.0

            cost_m = re.search(r'(?:cost\s*value|invested\s*amount|purchase\s*value)[^\d]*([0-9,]+\.[0-9]{2})', block, re.I)
            cost = float(cost_m.group(1).replace(',', '')) if cost_m else 0.0

            units_m = re.search(r'(?:closing\s*balance|closing\s*units|units)[^\d]*([0-9,]+\.[0-9]{2,4})', block, re.I)
            units = float(units_m.group(1).replace(',', '')) if units_m else 0.0

            nav_m = re.search(r'(?:nav\s*as\s*on|nav)[^\d]*([0-9,]+\.[0-9]{2,4})', block, re.I)
            nav = float(nav_m.group(1).replace(',', '')) if nav_m else 0.0

            if scheme and (val > 0 or units > 0):
                holdings.append({
                    "isin": "",
                    "scheme": scheme,
                    "amc": scheme.split()[0],
                    "folio": folio,
                    "arn": "",
                    "units": units,
                    "nav": nav,
                    "cost": cost,
                    "valuation": val
                })

    # Filter out zero balance holdings where valuation and units are 0
    active_holdings = [h for h in holdings if h['valuation'] > 0 or h['units'] > 0]

    return {
        "success": True,
        "investorName": investor_name,
        "pan": investor_pan,
        "totalValuation": total_val or sum(h['valuation'] for h in active_holdings),
        "totalCost": sum(h['cost'] for h in active_holdings),
        "holdingsCount": len(active_holdings),
        "holdings": active_holdings
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: parse_cas_pdf.py <pdf_path> [password]"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    password = sys.argv[2] if len(sys.argv) > 2 else None
    res = extract_cas_pdf(pdf_path, password)
    print(json.dumps(res, indent=2))
