/**
 * Admin Bulk Certificate Generator
 * Generates a single print-ready PDF with multiple certificates
 * Uses existing renderCertificate() function from certificate-renderer.js
 */

(function () {
    'use strict';

    // State
    let cancelRequested = false;
    let isGenerating = false;

    // DOM Elements
    const csvFileInput = document.getElementById('csvFile');
    const photosPathInput = document.getElementById('photosPath');
    const startIndexInput = document.getElementById('startIndex');
    const batchSizeInput = document.getElementById('batchSize');
    const generateTeluguCheckbox = document.getElementById('generateTelugu');
    const skipMissingCheckbox = document.getElementById('skipMissing');
    const generateBtn = document.getElementById('generateBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const logsDiv = document.getElementById('logs');
    const canvas = document.getElementById('certificate-canvas');

    // Column name mappings (flexible CSV support)
    const COLUMN_MAPS = {
        student_id: ['CRollNumber','ID', 'id', 'student_id', 'StudentID', 'Student ID', 'rollno', 'RollNo'],
        english_first: ['English 1st Line', 'English 1st line', 'english_first', 'First Name', 'FirstName'],
        english_second: ['English 2nd Line', 'English 2nd line', 'english_second', 'Last Name', 'LastName', 'Surname'],
        telugu_first: ['Telugu 1st Line', 'Telugu 1st line', 'telugu_first'],
        telugu_second: ['Telugu 2nd Line', 'Telugu 2nd line', 'telugu_second'],
        photo: ['Photos', 'Photo', 'photo', 'PhotoFile', 'Image'],
        student_name: ['CName','student_name', 'Student Name', 'Name', 'FullName', 'Full Name']
    };

    // Logging utilities
    function log(message, type = '') {
        const time = new Date().toLocaleTimeString();
        const span = document.createElement('div');
        span.className = type;
        span.textContent = `[${time}] ${message}`;
        logsDiv.appendChild(span);
        logsDiv.scrollTop = logsDiv.scrollHeight;
    }

    // Log without timestamp (for roll number lists)
    function logNoTime(message, type = '') {
        const span = document.createElement('div');
        span.className = type;
        span.textContent = message;
        logsDiv.appendChild(span);
        logsDiv.scrollTop = logsDiv.scrollHeight;
    }

    function clearLogs() {
        logsDiv.innerHTML = '';
    }

    function updateProgress(current, total, message) {
        const pct = Math.round((current / total) * 100);
        progressBar.style.width = pct + '%';
        progressText.textContent = message || `Processing ${current} of ${total} (${pct}%)`;
    }

    // Find column value using flexible mapping
    function getColumnValue(row, columnType) {
        const possibleNames = COLUMN_MAPS[columnType] || [];
        for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
                return row[name].toString().trim();
            }
        }
        return null;
    }

    // Parse student data from CSV row
    function parseStudent(row) {
        const student_id = getColumnValue(row, 'student_id');
        if (!student_id) return null;

        // Get name: prefer full name, fallback to combining first + second
        let student_name = getColumnValue(row, 'student_name');
        if (!student_name) {
            const first = getColumnValue(row, 'english_first') || '';
            const second = getColumnValue(row, 'english_second') || '';
            student_name = (first + ' ' + second).trim();
        }

        // Telugu name for Telugu certificate
        const telugu_first = getColumnValue(row, 'telugu_first') || '';
        const telugu_second = getColumnValue(row, 'telugu_second') || '';
        const telugu_name = (telugu_first + ' ' + telugu_second).trim();

        // Photo filename: prefer explicit, fallback to ID-based
        let photo_filename = getColumnValue(row, 'photo');
        if (!photo_filename) {
            photo_filename = student_id + '.jpeg';
        }

        return {
            student_id,
            rollno: student_id, // Use ID as rollno (for QR URL)
            student_name,
            telugu_name,
            photo_filename
        };
    }

    // Load photo and convert to base64
    async function loadPhotoAsBase64(photosPath, filename) {
        // Normalize path
        let basePath = photosPath.trim();
        if (!basePath.endsWith('/')) basePath += '/';

        // Try different extensions (JPEG, JPG, and PNG)
        const extensions = [
            filename,
            filename.replace(/\.(jpeg|jpg|png)$/i, '.jpeg'),
            filename.replace(/\.(jpeg|jpg|png)$/i, '.jpg'),
            filename.replace(/\.(jpeg|jpg|png)$/i, '.JPEG'),
            filename.replace(/\.(jpeg|jpg|png)$/i, '.JPG'),
            filename.replace(/\.(jpeg|jpg|png)$/i, '.png'),
            filename.replace(/\.(jpeg|jpg|png)$/i, '.PNG')
        ];

        // Also try with and without original extension
        const baseWithoutExt = filename.replace(/\.(jpeg|jpg|png)$/i, '');
        extensions.push(baseWithoutExt + '.jpeg');
        extensions.push(baseWithoutExt + '.jpg');
        extensions.push(baseWithoutExt + '.png');
        extensions.push(baseWithoutExt + '.PNG');

        // Use Set to remove duplicates
        const uniqueExtensions = [...new Set(extensions)];

        for (const ext of uniqueExtensions) {
            try {
                const response = await fetch(basePath + ext);
                if (response.ok) {
                    const blob = await response.blob();
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }
            } catch (e) {
                // Try next extension
            }
        }

        throw new Error(`Photo not found: ${filename}`);
    }

    // Small delay for UI responsiveness
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Load CSV data
    async function loadCSVData() {
        return new Promise((resolve, reject) => {
            const file = csvFileInput.files[0];

            // Transform function to trim column names (handles trailing spaces)
            const transformHeader = (header) => header.trim();

            if (file) {
                // Parse uploaded file
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: transformHeader,
                    complete: (results) => {
                        log(`CSV columns: ${results.meta.fields.join(', ')}`, 'info');
                        resolve(results.data);
                    },
                    error: (error) => reject(error)
                });
            } else {
                // Load default students.csv
                log('No file selected, loading students.csv...', 'info');
                fetch('students.csv')
                    .then(response => {
                        if (!response.ok) throw new Error('students.csv not found');
                        return response.text();
                    })
                    .then(csvText => {
                        const results = Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            transformHeader: transformHeader
                        });
                        log(`CSV columns: ${results.meta.fields.join(', ')}`, 'info');
                        resolve(results.data);
                    })
                    .catch(reject);
            }
        });
    }

    // Main generation function
    async function generateBatchPDF() {
        if (isGenerating) return;

        isGenerating = true;
        cancelRequested = false;
        clearLogs();

        // UI state
        generateBtn.disabled = true;
        cancelBtn.disabled = false;
        progressSection.classList.add('active');
        updateProgress(0, 100, 'Loading CSV data...');

        // Get settings
        const photosPath = photosPathInput.value || 'assets/photos/';
        const startIndex = parseInt(startIndexInput.value) || 0;
        const batchSize = parseInt(batchSizeInput.value) || 50;
        const generateTelugu = generateTeluguCheckbox.checked;
        const skipMissing = skipMissingCheckbox.checked;

        try {
            // Load CSV
            log('Loading CSV data...', 'info');
            const csvData = await loadCSVData();
            log(`Loaded ${csvData.length} rows from CSV`, 'success');

            // Calculate batch range
            const endIndex = Math.min(startIndex + batchSize, csvData.length);
            const batchData = csvData.slice(startIndex, endIndex);
            log(`Processing batch: rows ${startIndex} to ${endIndex - 1} (${batchData.length} students)`, 'info');

            if (batchData.length === 0) {
                throw new Error('No students in the specified range');
            }

            // Initialize jsPDF (A4 Landscape)
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            let firstPage = true;
            let successCount = 0;
            let skipCount = 0;
            const totalSteps = generateTelugu ? batchData.length * 2 : batchData.length;
            let currentStep = 0;

            // Track roll numbers for summary
            const generatedRollNumbers = [];
            const skippedRollNumbers = [];

            // Process each student
            for (let i = 0; i < batchData.length; i++) {
                if (cancelRequested) {
                    log('⚠️ Generation cancelled by user', 'warning');
                    break;
                }

                const row = batchData[i];
                const student = parseStudent(row);

                if (!student || !student.student_name) {
                    log(`Row ${startIndex + i}: Invalid data, skipping`, 'warning');
                    skippedRollNumbers.push(`Row ${startIndex + i} (Invalid data)`);
                    skipCount++;
                    currentStep++;
                    continue;
                }

                // Load photo
                let photoBase64 = null;
                try {
                    photoBase64 = await loadPhotoAsBase64(photosPath, student.photo_filename);
                } catch (e) {
                    if (skipMissing) {
                        log(`${student.student_id}: Photo not found, skipping`, 'warning');
                        skippedRollNumbers.push(student.student_id);
                        skipCount++;
                        currentStep++;
                        if (generateTelugu) currentStep++;
                        continue;
                    } else {
                        throw new Error(`Photo not found for ${student.student_id}: ${student.photo_filename}`);
                    }
                }

                // Render English certificate
                log(`${student.student_id}: Rendering English certificate...`, 'info');
                await renderCertificate(student, photoBase64, 'en');
                await sleep(50); // Allow canvas to fully render

                // Add page to PDF
                if (!firstPage) {
                    pdf.addPage();
                }
                firstPage = false;

                // Export canvas to image and add to PDF
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210); // A4 landscape: 297×210mm

                currentStep++;
                updateProgress(currentStep, totalSteps, `Processing ${student.student_id} (${currentStep}/${totalSteps})`);

                // Render Telugu certificate if enabled
                if (generateTelugu && student.telugu_name) {
                    if (cancelRequested) break;

                    log(`${student.student_id}: Rendering Telugu certificate...`, 'info');

                    // For Telugu, we still use the English name in the renderer
                    // The renderer handles translation internally via the lang parameter
                    await renderCertificate(student, photoBase64, 'te');
                    await sleep(50);

                    pdf.addPage();
                    const imgDataTe = canvas.toDataURL('image/jpeg', 1.0);
                    pdf.addImage(imgDataTe, 'JPEG', 0, 0, 297, 210);

                    currentStep++;
                    updateProgress(currentStep, totalSteps, `Processing ${student.student_id} Telugu (${currentStep}/${totalSteps})`);
                } else if (generateTelugu) {
                    currentStep++;
                }

                successCount++;
                generatedRollNumbers.push(student.student_id);
                log(`✓ ${student.student_id}: ${student.student_name}`, 'success');
                await sleep(10); // Keep UI responsive
            }

            if (!cancelRequested && successCount > 0) {
                // Save PDF
                const filename = `AIK_Certificates_${startIndex}-${endIndex - 1}.pdf`;
                log(`Generating PDF: ${filename}...`, 'info');
                pdf.save(filename);

                log(`════════════════════════════════`, 'success');
                log(`✅ Complete! Generated ${successCount} certificates`, 'success');
                if (skipCount > 0) {
                    log(`⚠️ Skipped ${skipCount} students (missing photos/data)`, 'warning');
                }
                log(`📄 PDF saved as: ${filename}`, 'success');

                // Display line-by-line roll number summary for easy copying
                logNoTime(``, 'info');
                logNoTime(`═══════ GENERATED ROLL NUMBERS ═══════`, 'success');
                generatedRollNumbers.forEach(rollno => {
                    logNoTime(rollno, 'success');
                });

                if (skippedRollNumbers.length > 0) {
                    logNoTime(``, 'info');
                    logNoTime(`═══════ SKIPPED ROLL NUMBERS ═══════`, 'warning');
                    skippedRollNumbers.forEach(rollno => {
                        logNoTime(rollno, 'warning');
                    });
                }

                // Also log to console for easy copying
                console.log('\n====== GENERATED ROLL NUMBERS ======');
                console.log(generatedRollNumbers.join('\n'));
                if (skippedRollNumbers.length > 0) {
                    console.log('\n====== SKIPPED ROLL NUMBERS ======');
                    console.log(skippedRollNumbers.join('\n'));
                }
            } else if (successCount === 0) {
                log('❌ No certificates generated. Check your data and photo files.', 'error');
            }

        } catch (error) {
            log(`❌ Error: ${error.message}`, 'error');
            console.error(error);
        } finally {
            isGenerating = false;
            generateBtn.disabled = false;
            cancelBtn.disabled = true;
            updateProgress(100, 100, 'Done');
        }
    }

    // Cancel generation
    function cancelGeneration() {
        if (isGenerating) {
            cancelRequested = true;
            log('Cancellation requested, stopping after current certificate...', 'warning');
        }
    }

    // Event listeners
    generateBtn.addEventListener('click', generateBatchPDF);
    cancelBtn.addEventListener('click', cancelGeneration);

    // Initial log
    log('Admin Bulk Generator ready', 'info');
    log('Select a CSV file or leave empty to use students.csv', 'info');

})();
