# How the Certificate System Works

## Overview

This system generates certificates for AI Karyashala bootcamp participants. It creates both pre-generated PDFs (for bulk distribution) and a website where participants can view and download their certificates.

## Two Different Download Methods

### 1. Pre-generated PDFs (from `generate.py`)

```
generate.py → Creates /pdfs/AIK24B21A42C7.pdf → For Google Drive sharing
```

These are generated once, in bulk, for you to upload to Google Drive and share with participants.

### 2. On-demand Download (from `index.html`)

```
User visits website → index.html loads → Renders certificate on canvas → User clicks "Download PDF" → jsPDF creates PDF in browser
```

When participants visit their certificate URL, they can download a fresh PDF directly from the website.

## How the Website (`index.html`) Works

When someone visits `https://aikaryashala.com/certificates/bootcamp/kiet/AIK24B21A42C7/`:

1. **Page loads** with embedded student data:
   ```javascript
   const STUDENT_DATA = {
     "student_id": "AIK24B21A42C7",
     "student_name": "Kavuri Suhitha",
     "rollno": "AIK24B21A42C7"
   };
   ```

2. **JavaScript renders** the certificate on an HTML5 canvas using `certificate-renderer.js`

3. **User sees** their certificate displayed in the browser

4. **User clicks "Download PDF"** → jsPDF library converts the canvas to a PDF and downloads it

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  OFFLINE (you run once)                                     │
│                                                             │
│  generate.py                                                │
│      ↓                                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │  For each student:                          │            │
│  │  • Render certificate on headless browser   │            │
│  │  • Save PDF to /pdfs/{rollno}.pdf           │            │
│  │  • Save thumbnail to /{rollno}/preview.jpg  │            │
│  │  • Generate /{rollno}/index.html            │            │
│  └─────────────────────────────────────────────┘            │
│      ↓                                                      │
│  Upload to GitHub Pages / Google Drive                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ONLINE (each visitor)                                      │
│                                                             │
│  User scans QR code or clicks link                          │
│      ↓                                                      │
│  Browser loads /{rollno}/index.html                         │
│      ↓                                                      │
│  JavaScript renders certificate on canvas                   │
│      ↓                                                      │
│  User views certificate                                     │
│      ↓                                                      │
│  User clicks "Download PDF"                                 │
│      ↓                                                      │
│  jsPDF creates PDF in browser → Downloads                   │
└─────────────────────────────────────────────────────────────┘
```

## File Structure After Generation

```
/Certificates-KIET/
├── generate.py              # Run this to generate everything
├── render.html              # Used by Playwright for rendering
├── template.html            # Template for student pages
├── students.csv             # Student data
│
├── assets/
│   ├── js/
│   │   └── certificate-renderer.js   # Certificate rendering logic
│   └── student_images/
│       └── {rollno}.jpg              # Student photos
│
├── pdfs/                             # Pre-generated PDFs
│   ├── AIK24B21A42C7.pdf             # → Upload to Google Drive
│   ├── AIK24B21A4420.pdf
│   └── ...
│
├── AIK24B21A42C7/                    # Per-student folder
│   ├── index.html                    # Web page (with OG tags for social sharing)
│   └── preview.jpg                   # Thumbnail for LinkedIn/WhatsApp preview
├── AIK24B21A4420/
│   ├── index.html
│   └── preview.jpg
└── ...
```

## Social Media Sharing

When a participant shares their certificate URL on LinkedIn or WhatsApp:

1. Social media bots fetch the URL
2. They read the Open Graph meta tags in `index.html`:
   ```html
   <meta property="og:title" content="Certificate - Kavuri Suhitha | AI Karyashala">
   <meta property="og:image" content="https://.../AIK24B21A42C7/preview.jpg">
   ```
3. The preview image (`preview.jpg`) is displayed in the social media post

## Usage

### Generate All Certificates

```bash
# Install dependencies (one-time)
pip install -r requirements.txt
playwright install chromium

# Generate everything
python generate.py --all

# Or generate specific outputs
python generate.py --pdfs      # Only PDFs
python generate.py --pages     # Only HTML pages + thumbnails

# Test with single student
python generate.py --student AIK24B21A42C7
```

### Deploy to GitHub Pages

1. Run `python generate.py --all`
2. Commit and push the generated files
3. Enable GitHub Pages in repository settings
4. Site will be available at your configured domain

### Share PDFs via Google Drive

1. Run `python generate.py --pdfs`
2. Upload the `/pdfs/` folder to Google Drive
3. Share the folder or individual PDFs with participants
