#!/usr/bin/env python3
"""
Certificate Generator for AI Karyashala

Generates:
- PDF certificates for each student
- Thumbnail images for social media previews
- Static HTML pages with Open Graph tags

Usage:
    python generate.py --all --base-url "https://aikaryashala.com/certificates/bootcamp/kiet"
    python generate.py --pdfs
    python generate.py --pages
    python generate.py --student AIK24B21
"""

import argparse
import base64
import csv
import json
import os
import sys
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
    from PIL import Image
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Please install requirements: pip install -r requirements.txt")
    print("Then install Playwright browsers: playwright install chromium")
    sys.exit(1)


# Configuration
DEFAULT_BASE_URL = "https://aikaryashala.com/certificates/bootcamp/kiet"
THUMBNAIL_SIZE = (1200, 630)
CERTIFICATE_WIDTH = 3508
CERTIFICATE_HEIGHT = 2480


def read_students_csv(csv_path):
    """Read students from CSV file."""
    students = []
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        for row in reader:
            # CSV columns: CName, CRollNumber
            name = row.get('CName', '').strip()
            rollno = row.get('CRollNumber', '').strip()

            if not rollno or not name:
                continue

            students.append({
                'student_id': rollno,
                'student_name': name,
                'rollno': rollno,
                'photo_filename': f"{rollno}.jpg"
            })

    return students


def create_thumbnail(png_path, output_path, size=THUMBNAIL_SIZE):
    """Create a thumbnail image from the certificate PNG.

    Fits the entire certificate within the thumbnail with padding if needed.
    """
    with Image.open(png_path) as img:
        # Create a new image with the target size and white background
        thumbnail = Image.new('RGB', size, (255, 255, 255))

        # Calculate scaling to fit entire certificate within thumbnail
        scale_w = size[0] / img.width
        scale_h = size[1] / img.height
        scale = min(scale_w, scale_h)

        # New dimensions maintaining aspect ratio
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)

        # Resize certificate
        resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Center on thumbnail
        x = (size[0] - new_width) // 2
        y = (size[1] - new_height) // 2

        thumbnail.paste(resized, (x, y))
        thumbnail.save(output_path, 'JPEG', quality=90)


def generate_html_page(template_path, output_path, student, base_url, assets_path):
    """Generate an HTML page for a student from template."""
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()

    # Prepare replacements
    page_title = f"Certificate - {student['student_name']} | AI Karyashala"
    page_description = f"Certificate of Participation for {student['student_name']} in AI Karyashala Bootcamp at KIET, Kakinada (Feb 7-8, 2026)"
    page_url = f"{base_url}/{student['rollno']}/"
    preview_image_url = f"{base_url}/{student['rollno']}/preview.jpg"

    # Student data as JSON
    student_json = json.dumps(student, ensure_ascii=False)

    # Photo path (relative from the generated page)
    photo_path = f"{assets_path}student_images/{student['rollno']}.jpg"

    # Replace placeholders
    html = template
    html = html.replace('{{PAGE_TITLE}}', page_title)
    html = html.replace('{{PAGE_DESCRIPTION}}', page_description)
    html = html.replace('{{PAGE_URL}}', page_url)
    html = html.replace('{{PREVIEW_IMAGE_URL}}', preview_image_url)
    html = html.replace('{{STUDENT_NAME}}', student['student_name'])
    html = html.replace('{{STUDENT_JSON}}', student_json)
    html = html.replace('{{PHOTO_PATH}}', photo_path)
    html = html.replace('{{ASSETS_PATH}}', assets_path)

    # Write output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)


def generate_certificates(students, args, project_dir):
    """Main generation function using Playwright."""
    render_html = project_dir / 'render.html'
    template_html = project_dir / 'template.html'
    student_images_dir = project_dir / 'assets' / 'student_images'
    output_dir = Path(args.output) if args.output else project_dir
    pdfs_dir = output_dir / 'pdfs'

    # Create output directories
    pdfs_dir.mkdir(parents=True, exist_ok=True)

    # Filter students if --student specified
    if args.student:
        students = [s for s in students if s['rollno'] == args.student]
        if not students:
            print(f"Error: Student {args.student} not found")
            return

    print(f"Processing {len(students)} student(s)...")

    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 3600, 'height': 2600})

        # Load render page
        render_url = f"file://{render_html.absolute()}"
        page.goto(render_url)
        page.wait_for_function("window.rendererReady === true")
        print("Renderer ready")

        for i, student in enumerate(students):
            print(f"\n[{i+1}/{len(students)}] Processing: {student['student_name']} ({student['rollno']})")

            # Check for student photo
            photo_path = student_images_dir / f"{student['rollno']}.jpg"
            if not photo_path.exists():
                # Try with original filename from CSV
                alt_photo_path = student_images_dir / student['photo_filename']
                if alt_photo_path.exists():
                    photo_path = alt_photo_path
                else:
                    print(f"  Warning: Photo not found for {student['rollno']}")
                    photo_path = None

            # Convert photo to base64 data URL
            photo_data_url = ""
            if photo_path and photo_path.exists():
                with open(photo_path, 'rb') as img_file:
                    img_data = base64.b64encode(img_file.read()).decode('utf-8')
                    # Detect image type
                    ext = photo_path.suffix.lower()
                    mime_type = 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png'
                    photo_data_url = f"data:{mime_type};base64,{img_data}"

            # Render certificate in browser
            try:
                result = page.evaluate(f"""
                    async () => {{
                        const student = {json.dumps(student)};
                        const photoPath = "{photo_data_url}";
                        return await renderStudentCertificate(student, photoPath);
                    }}
                """)

                if not result.get('success'):
                    print(f"  Error rendering: {result.get('error')}")
                    continue

            except Exception as e:
                print(f"  Error: {e}")
                continue

            # Create student output directory
            student_dir = output_dir / student['rollno']
            student_dir.mkdir(parents=True, exist_ok=True)

            # Save full certificate as PNG (temporary)
            png_path = student_dir / 'certificate.png'
            canvas = page.query_selector('#certificate-canvas')
            canvas.screenshot(path=str(png_path))
            print(f"  Saved PNG: {png_path}")

            # Generate PDF if requested
            if args.all or args.pdfs:
                pdf_path = pdfs_dir / f"{student['rollno']}.pdf"
                try:
                    # Use Pillow to create PDF directly from PNG
                    with Image.open(png_path) as img:
                        # Convert to RGB if necessary (PNG might have alpha)
                        if img.mode in ('RGBA', 'P'):
                            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'RGBA':
                                rgb_img.paste(img, mask=img.split()[3])
                            else:
                                rgb_img.paste(img)
                            img = rgb_img

                        # A4 landscape at 300 DPI: 297mm x 210mm = 3508 x 2480 pixels
                        # Save as PDF
                        img.save(
                            str(pdf_path),
                            'PDF',
                            resolution=300.0,
                            save_all=True
                        )
                    print(f"  Saved PDF: {pdf_path}")
                except Exception as e:
                    print(f"  Error generating PDF: {e}")

            # Generate thumbnail if requested
            if args.all or args.pages:
                thumbnail_path = student_dir / 'preview.jpg'
                try:
                    create_thumbnail(png_path, thumbnail_path)
                    print(f"  Saved thumbnail: {thumbnail_path}")
                except Exception as e:
                    print(f"  Error generating thumbnail: {e}")

            # Generate HTML page if requested
            if args.all or args.pages:
                html_path = student_dir / 'index.html'
                try:
                    # Calculate relative path to assets from student folder
                    assets_path = "../assets/"
                    generate_html_page(
                        template_html,
                        html_path,
                        student,
                        args.base_url,
                        assets_path
                    )
                    print(f"  Saved HTML: {html_path}")
                except Exception as e:
                    print(f"  Error generating HTML: {e}")

            # Clean up temporary PNG if not needed
            if not args.keep_png:
                png_path.unlink(missing_ok=True)

        browser.close()

    print(f"\nGeneration complete!")
    print(f"  PDFs: {pdfs_dir}")
    print(f"  Pages: {output_dir}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate certificates for AI Karyashala',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate.py --all
  python generate.py --pdfs
  python generate.py --pages
  python generate.py --student AIK24B21
        """
    )

    parser.add_argument('--all', action='store_true',
                        help='Generate everything (PDFs, thumbnails, HTML pages)')
    parser.add_argument('--pdfs', action='store_true',
                        help='Generate only PDF files')
    parser.add_argument('--pages', action='store_true',
                        help='Generate only HTML pages and thumbnails')
    parser.add_argument('--student', type=str,
                        help='Generate for a single student (by rollno)')
    parser.add_argument('--base-url', type=str, default=DEFAULT_BASE_URL,
                        help=f'Base URL for the website (default: {DEFAULT_BASE_URL})')
    parser.add_argument('--output', type=str,
                        help='Output directory (default: current project directory)')
    parser.add_argument('--csv', type=str, default='students.csv',
                        help='Path to students CSV file (default: students.csv)')
    parser.add_argument('--keep-png', action='store_true',
                        help='Keep temporary PNG files')

    args = parser.parse_args()

    # Default to --all if no specific action
    if not (args.all or args.pdfs or args.pages):
        args.all = True

    # Get project directory
    project_dir = Path(__file__).parent.absolute()

    # Read students
    csv_path = project_dir / args.csv
    if not csv_path.exists():
        print(f"Error: CSV file not found: {csv_path}")
        sys.exit(1)

    students = read_students_csv(csv_path)
    print(f"Loaded {len(students)} students from {csv_path}")

    # Generate certificates
    generate_certificates(students, args, project_dir)


if __name__ == '__main__':
    main()
