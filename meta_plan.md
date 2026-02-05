# Certificate Generation System - Meta Plan

## Overview

A unified certificate generation system for AI Karyashala bootcamp that generates bulk certificates, thumbnails for social sharing, static web pages, and PDF files for distribution.

---

## What This System Does

```
┌─────────────────────────────────────────────────────────────────┐
│                    CERTIFICATE GENERATOR                        │
│                                                                 │
│  Input:                                                         │
│    • students.csv (single source of truth)                      │
│    • student_images/ (photos)                                   │
│    • certificate-renderer.js (single rendering logic)           │
│                                                                 │
│  Output:                                                        │
│    • /pdfs/{rollno}.pdf         → Google Drive sharing          │
│    • /{rollno}/index.html       → Website pages with OG tags    │
│    • /{rollno}/preview.jpg      → Social media thumbnails       │
│    • /assets/                   → Shared JS, CSS, images        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
students.csv + student_images/
              ↓
        generate.py (Python + Playwright)
              ↓
        Headless Chrome loads render.html
              ↓
        certificate-renderer.js renders on canvas
              ↓
    ┌─────────┴─────────┬──────────────┬─────────────┐
    ↓                   ↓              ↓             ↓
 Full Cert (PNG)    Thumbnail      PDF File     index.html
 (3508x2480)       (1200x630)    {rollno}.pdf   with OG tags
    ↓                   ↓              ↓             ↓
 [internal]        /{rollno}/      /pdfs/       /{rollno}/
                  preview.jpg                   index.html
```

---

## Final Directory Structure

```
/Certificates-KIET/
├── generate.py              # Main Python script (CLI)
├── render.html              # Hidden page for Playwright rendering
├── template.html            # Template for student pages
├── requirements.txt         # playwright
├── students.csv             # Student data
│
├── assets/
│   ├── js/
│   │   └── certificate-renderer.js   # THE rendering logic
│   ├── css/
│   │   └── style.css                 # Minimal styles for viewer
│   ├── images/                       # Logos, signatures, backgrounds
│   └── student_images/               # Student photos
│
├── [GENERATED]/
│   ├── pdfs/                         # For Google Drive
│   │   ├── AIK24B21.pdf
│   │   ├── AIK24B22.pdf
│   │   └── ...
│   │
│   ├── AIK24B21/                     # Per-student folder
│   │   ├── index.html                # Viewable page with OG tags
│   │   └── preview.jpg               # Social thumbnail
│   ├── AIK24B22/
│   │   ├── index.html
│   │   └── preview.jpg
│   └── ...
│
└── index.html               # Optional: landing page listing all certificates
```

---

## CLI Interface

```bash
# One-time setup
pip install -r requirements.txt
playwright install chromium

# Generate everything
python generate.py --all --base-url "https://aikaryashala.com/bootcamp/kiet"

# Or individual tasks
python generate.py --pdfs                    # Only PDFs for Google Drive
python generate.py --pages                   # Only HTML pages + thumbnails
python generate.py --student AIK24B21        # Single student (for testing)

# Options
python generate.py --all --output ./dist     # Custom output directory
python generate.py --all --lang te           # Telugu certificates
```

---

## Generation Flow (Per Student)

1. Read student row from CSV
2. Load student photo from student_images/
3. Open headless browser → render.html
4. Pass student data to certificate-renderer.js
5. Wait for canvas render complete
6. Export canvas:
   - a. Full resolution PNG (3508x2480) → convert to PDF → /pdfs/{rollno}.pdf
   - b. Thumbnail JPG (1200x630) → /{rollno}/preview.jpg
7. Generate index.html from template with:
   - og:title = "Certificate - {name}"
   - og:image = "{base_url}/{rollno}/preview.jpg"
   - og:url = "{base_url}/{rollno}/"
   - Embedded student data for client-side re-render
   - Download PDF button
8. Save to /{rollno}/index.html

---

## Key Files to Create

| File | Purpose |
|------|---------|
| `generate.py` | Python CLI script - orchestrates everything |
| `render.html` | Minimal HTML that loads certificate-renderer.js for headless rendering |
| `template.html` | Template for generated student pages (has OG placeholders) |
| `requirements.txt` | `playwright` |
| `assets/css/style.css` | Clean styles for certificate viewer |

---

## Files to Remove (Old Code)

| File | Reason |
|------|--------|
| `index.html` | Old login portal - replaced by generated pages |
| `admin-bulk.html` | Old admin UI - replaced by Python CLI |
| `assets/js/main.js` | Login/upload logic - no longer needed |
| `assets/js/admin-bulk.js` | Old bulk generation - replaced by Python |

---

## Key Decisions

1. **Single Renderer**: `certificate-renderer.js` is the only rendering code (no Python replication)
2. **Playwright**: Headless browser to run JS and export canvas
3. **PDF Generation**: Canvas → PNG → PDF (using Playwright's PDF or reportlab)
4. **Thumbnails**: 1200x630 for optimal LinkedIn/WhatsApp previews
5. **Static Output**: Everything pre-generated, works on GitHub Pages
6. **Clean URLs**: `/{rollno}/index.html` served as `/{rollno}/`

---

## Confirmed Details

1. **Base URL**: `https://aikaryashala.com/certificates/bootcamp/kiet`
2. **Languages**: English only
3. **Landing Page**: No
4. **Photo Format**: `{rollno}.jpg` (e.g., `AIK24B21.jpg`)

---

## Implementation Status

- [x] `requirements.txt` - Created (playwright, Pillow)
- [x] `render.html` - Created (headless rendering page)
- [x] `template.html` - Created (student page template with OG tags, embedded CSS)
- [x] `generate.py` - Created (main CLI script)
- [x] Viewer CSS - Embedded in template.html
- [ ] Test with single student
- [ ] Run full generation
- [ ] Remove old files

## Next Steps

1. Ensure student photos are in `assets/student_images/` named as `{rollno}.jpg`
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   playwright install chromium
   ```
3. Test with a single student:
   ```bash
   python generate.py --student AIK079188
   ```
4. Generate all certificates:
   ```bash
   python generate.py --all
   ```
5. Remove old files after confirming everything works
