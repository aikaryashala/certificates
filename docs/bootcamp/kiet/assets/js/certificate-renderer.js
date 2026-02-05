/**
 * Certificate Renderer
 * Generates a high-resolution (300 DPI) certificate on the HTML5 Canvas.
 * Target Resolution: 3508 x 2480 pixels (A4 Landscape)
 */

async function renderCertificate(user, photoBase64, lang = 'en') {
    const canvas = document.getElementById('certificate-canvas');
    const ctx = canvas.getContext('2d');

    // Translation Dictionary
    const t = {
        en: {
            header: 'CERTIFICATE OF PARTICIPATION',
            event: 'AI KARYASHALA',
            subtitle: 'This certificate is awarded to',
            body1: 'for actively participating in the',
            body2: 'AI Awareness & Hands-on Bootcamp on 7th & 8th February 2026',
            body3: 'conducted at',
            college: 'KIET, KAKINADA.',
            datePrefix: 'Issue Date',
            role: 'Founder of AI Karyashala',
            idLabel: 'Certificate ID:'
        },
        te: {
            header: 'ప్రశంసా పత్రం', // Certificate of Appreciation/Participation
            event: 'AI కార్యశాల',
            subtitle: 'AI అవగాహన & హ్యాండ్స్-ఆన్ బూట్‌క్యాంప్',
            body1: 'వీరు "AI కార్యశాల"లో పాల్గొన్నారు', // "They have participated in AI Karyashala"
            body2: 'AI అవగాహన & హ్యాండ్స్-ఆన్ బూట్‌క్యాంప్',
            body3: '', // "Conducted at" is often merged in Telugu or implied. Let's use simple structure.
            college: 'KIET కళాశాల, కాకినాడ లో నిర్వహించబడింది.', // "Conducted at KIET College, Kakinada"
            datePrefix: 'జారీ తేదీ:',
            role: 'సమన్వయకర్త / శిక్షకుడు',
            idLabel: 'సర్టిఫికేట్ ID:'
        }
    };

    const textData = t[lang];

    // Use Tiro Telugu for Telugu text, otherwise standard fonts
    // Fallback to standard serif/sans-serif if Tiro not found
    const headerFont = lang === 'te' ? 'Tiro Telugu, serif' : 'UnifrakturCook, serif';
    const bodyFont = lang === 'te' ? 'Tiro Telugu, serif' : 'Cormorant Garamond, serif';
    const uiFont = lang === 'te' ? 'Tiro Telugu, sans-serif' : 'Montserrat, sans-serif';

    // Set High Resolution
    const WIDTH = 3508;
    const HEIGHT = 2480;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    // --- Helper Functions ---
    const loadImage = (src) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    const drawText = (text, x, y, fontSize, font, color = '#1e3a8a', align = 'center', weight = 'bold') => {
        ctx.font = `${weight} ${fontSize}px "${font}"`;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.fillText(text, x, y);
        return ctx.measureText(text).width;
    };

    // --- 1. Background & Frame ---
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Outer Blue Gradient Border
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, '#2563eb');
    grad.addColorStop(1, '#1e3a8a');

    ctx.lineWidth = 40;
    ctx.strokeStyle = grad;
    ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);

    // Inner Thin Border
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#93c5fd';
    ctx.strokeRect(60, 60, WIDTH - 120, HEIGHT - 120);

    // --- 2. Main Certificate Text ---
    // Center of remaining space (750 to 3508) is ~2129. Let's use 2100.
    const textCenterX = 2100;


    // --- Student ID (Top Right) ---
    // Keep ID in English styling mostly, maybe label translated
    // Draw label first, then ID value to its right
    const idY = 200;
    ctx.font = `normal 40px "${uiFont}"`;
    const labelWidth = ctx.measureText(textData.idLabel).width;
    const idValueWidth = ctx.measureText(user.student_id).width;

    // Position: Label first, then ID value - both right-aligned to edge
    const idRightEdge = WIDTH - 200;
    const idValueX = idRightEdge; // ID value at the right edge
    const idLabelX = idValueX - idValueWidth - 15; // Label to the left of ID value

    // Draw the label first (to the left)
    drawText(textData.idLabel, idLabelX, idY, 40, uiFont, '#64748b', 'right', 'normal');

    // Draw the ID value at fixed right position
    drawText(user.student_id, idValueX, idY, 40, uiFont, '#64748b', 'right', 'normal');


    // Header
    const titleY = 500;
    const titleWidth = drawText(textData.header, textCenterX, titleY, 100, headerFont, '#172554');

    // Title Underline (Full Sentence)
    ctx.beginPath();
    ctx.moveTo(textCenterX - titleWidth / 2 - 20, titleY + 40);
    ctx.lineTo(textCenterX + titleWidth / 2 + 20, titleY + 40);
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Event Title
    drawText(textData.event, textCenterX, 720, 90, uiFont, '#1e40af'); // Use Outfit/Tiro for event name
    drawText(textData.subtitle, textCenterX, 880, 60, uiFont, '#000000', 'center', 'normal');

    // Recipient Name - Smart Fitting with Multi-line Support
    const nameY = 1100;
    const nameText = user.student_name.toUpperCase();
    const maxNameWidth = 2400; // Maximum width before wrapping (leaves padding from borders)

    // Helper to measure text width
    const measureName = (text, size) => {
        ctx.font = `bold ${size}px "Cormorant Garamond"`;
        return ctx.measureText(text).width;
    };

    // Helper to check if text fits
    const nameFits = (text, size) => measureName(text, size) <= maxNameWidth;

    // Force multi-line for names > 19 characters
    const forceMultiLineName = nameText.length > 19;

    let finalNameWidth = 0;
    let lastLineY = nameY;

    if (!forceMultiLineName) {
        // Try single line with shrinking
        let fontSize = 200;
        while (!nameFits(nameText, fontSize) && fontSize > 120) {
            fontSize -= 5;
        }

        if (nameFits(nameText, fontSize)) {
            finalNameWidth = drawText(nameText, textCenterX, nameY, fontSize, 'Cormorant Garamond', '#0f172a');
            lastLineY = nameY;
        } else {
            // Fallback to multi-line if still doesn't fit
            forceMultiLineName = true;
        }
    }

    if (forceMultiLineName) {
        // Multi-line rendering
        const words = nameText.split(' ');
        let lines = [];
        let currentLine = words[0];

        // Use smaller font for multi-line, even smaller for very long names
        const multiLineFontSize = nameText.length > 25 ? 120 : 150;

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            if (nameFits(testLine, multiLineFontSize)) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);

        // Calculate vertical positioning
        const lineHeight = nameText.length > 25 ? 130 : 160;
        const totalHeight = (lines.length - 1) * lineHeight;
        let currentY = nameY - totalHeight / 2;

        // Draw each line with underline for each line
        let maxLineWidth = 0;
        lines.forEach((line, index) => {
            let lineSize = multiLineFontSize;
            // Shrink individual lines if needed
            while (!nameFits(line, lineSize) && lineSize > 80) {
                lineSize -= 5;
            }
            const lineWidth = drawText(line, textCenterX, currentY, lineSize, 'Cormorant Garamond', '#0f172a');
            maxLineWidth = Math.max(maxLineWidth, lineWidth);

            // Draw underline for each line
            ctx.beginPath();
            ctx.moveTo(textCenterX - lineWidth / 2, currentY + 30);
            ctx.lineTo(textCenterX + lineWidth / 2, currentY + 30);
            ctx.strokeStyle = '#1e3a8a';
            ctx.lineWidth = 4;
            ctx.stroke();

            if (index === lines.length - 1) {
                lastLineY = currentY;
            }
            currentY += lineHeight;
        });
        finalNameWidth = maxLineWidth; // Track max width for reference
    } else {
        // Single line name - draw underline
        ctx.beginPath();
        ctx.moveTo(textCenterX - finalNameWidth / 2, lastLineY + 30);
        ctx.lineTo(textCenterX + finalNameWidth / 2, lastLineY + 30);
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    // Body Text
    // Logic for Telugu body is slightly different structure
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';

    if (lang === 'en') {
        ctx.font = 'italic 55px "Cormorant Garamond"';
        ctx.fillText(textData.body1, textCenterX, 1300);

        ctx.font = 'bold 55px "Cormorant Garamond"';
        ctx.fillText(textData.body2, textCenterX, 1380);

        ctx.font = 'italic 55px "Cormorant Garamond"';
        ctx.fillText(textData.body3, textCenterX, 1460);

        ctx.font = 'bold 60px "Cormorant Garamond"';
        ctx.fillStyle = '#1f2937';
        ctx.fillText(textData.college, textCenterX, 1540);
    } else {
        // Telugu Layout
        ctx.font = 'normal 55px "Tiro Telugu"';
        ctx.fillText(textData.body1, textCenterX, 1300); // వీరు... పాల్గొన్నారు

        ctx.font = 'bold 55px "Tiro Telugu"';
        ctx.fillText(textData.body2, textCenterX, 1380);

        // In Telugu "Conducted at" is merged into the location line often
        ctx.font = 'bold 60px "Tiro Telugu"';
        ctx.fillStyle = '#1f2937';
        ctx.fillText(textData.college, textCenterX, 1500);
    }


    // Footer Details - Pushed to Corners
    const footerY = 2100; // Lower down
    const footerLeftX = 1100; // Left align relative to text area
    const footerRightX = 3100; // Right align relative to text area

    // Decorative line removed as per user request

    // Date (Left Corner) - Form Style
    const dateValue = '08-02-2026';
    const dateLabel = textData.datePrefix;
    const dateCtxX = footerLeftX;

    // Draw Date Value
    ctx.font = '45px "Outfit"';
    ctx.fillStyle = '#1f2937';
    ctx.textAlign = 'center';

    // Calculate width for the line based on date value
    const dateWidth = ctx.measureText(dateValue).width;
    const dateLineWidth = dateWidth + 40; // Small padding on each side

    // Postion text 8px above the line
    const textBaselineY = footerY - 28;
    const lineY = footerY - 20;

    ctx.fillText(dateValue, dateCtxX, textBaselineY);

    // Draw Line
    ctx.beginPath();
    ctx.moveTo(dateCtxX - dateLineWidth / 2, lineY);
    ctx.lineTo(dateCtxX + dateLineWidth / 2, lineY);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Label below line (Times New Roman, bold)
    ctx.font = 'bold 40px "Times New Roman"';
    ctx.fillText(dateLabel, dateCtxX, lineY + 45);

    // Signature (Right Corner)
    // Signature Block - Centered relative to "Founder Of AI Karyashala"

    // Calculate center based on Role text
    ctx.font = `bold 45px "${uiFont}"`;
    const roleWidth = ctx.measureText(textData.role).width;
    // Align the block such that its visual center is:
    // (footerRightX is roughly the rightmost edge we want to respect)
    // Let's use footerRightX as the right edge of the text, so center is:
    const blockCenterX = footerRightX - (roleWidth / 2);

    // Adjusted positions to prevent overlap and align with Date section
    const lineY_pos = footerY - 20;  // Matches Date line level
    const nameY_pos = lineY_pos + 50;  // Tight baseline below line
    const roleY_pos = nameY_pos + 50;  // Tight baseline below name

    // 1. Signature Image 
    try {
        const sigImg = await loadImage('assets/signature.png');

        // Dynamic scaling: Limit width to 450px for smaller signature, but maintain aspect ratio
        const maxSigW = 450;
        let finalSigW = sigImg.width;
        let finalSigH = sigImg.height;

        if (finalSigW > maxSigW) {
            const ratio = maxSigW / finalSigW;
            finalSigW = maxSigW;
            finalSigH = finalSigH * ratio;
        }

        const sigX = blockCenterX - (finalSigW / 2);
        const sigY = lineY_pos - 8 - finalSigH; // 8px gap above line

        ctx.drawImage(sigImg, sigX, sigY + 15, finalSigW, finalSigH);
    } catch (e) {
        console.warn('Signature image failed to load');
    }

    // 2. Line above Name - match role text width
    const sigLineWidth = roleWidth; // Match role text width exactly
    ctx.beginPath();
    ctx.moveTo(blockCenterX - sigLineWidth / 2, lineY_pos);
    ctx.lineTo(blockCenterX + sigLineWidth / 2, lineY_pos);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Name (Rohini Kumar Barla) - bold
    ctx.font = 'bold 50px "Times New Roman"';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText('Rohini Kumar Barla', blockCenterX, nameY_pos);

    // 4. Role (Founder of AI Karyashala)
    drawText(textData.role, blockCenterX, roleY_pos, 45, uiFont, '#1f2937', 'center', 'bold');



    // --- 3. ID Card (Left Side) ---
    const cardX = 250;
    const cardY = 1300;
    const cardW = 500;
    const cardH = 800;

    // Lanyard
    const lanyardW = 120;
    const lanyardH = cardY + 50;

    ctx.fillStyle = '#1e40af';
    ctx.fillRect(cardX + (cardW - lanyardW) / 2, 0, lanyardW, lanyardH);

    // Lanyard Clip
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cardX + (cardW - 160) / 2, lanyardH - 40, 160, 60);

    // ID Card Body 
    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, '#2563eb');
    cardGrad.addColorStop(1, '#172554');

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 10;

    roundRect(ctx, cardX, cardY, cardW, cardH, 30);
    ctx.fillStyle = cardGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // ID Card Header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(cardX, cardY, cardW, 120);

    ctx.font = 'bold 50px "Outfit"';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('AI Karyashala', cardX + 40, cardY + 80);

    // Photo Container 
    const photoW = 300;
    const photoH = 380;
    const photoX = cardX + (cardW - photoW) / 2;
    const photoY = cardY + 160;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(photoX - 10, photoY - 10, photoW + 20, photoH + 20);

    try {
        const userPhoto = await loadImage(photoBase64);
        ctx.drawImage(userPhoto, photoX, photoY, photoW, photoH);
    } catch (e) {
        console.error('Failed to load user photo:', e);
    }

    // Name on Card - Smart Fitting
    const maxCardNameWidth = cardW - 60; // 30px padding on each side for safety
    const startFontSize = 55; // Reduced from 70
    let cardFontSize = startFontSize;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const cardNameY = photoY + photoH + 55; // Reduced from 70

    // Helper to measure and check fit
    const fits = (text, size) => {
        ctx.font = `bold ${size}px "Montserrat"`;
        return ctx.measureText(text).width <= maxCardNameWidth;
    };

    let lines = [];
    const fullname = user.student_name;

    // If name length > 15 characters, force multi-line (reduced from 19)
    const forceMultiLine = fullname.length > 15;

    // Strategy 1: Try Single Line (only if not forcing multi-line)
    let bestSingleLineSize = startFontSize;
    if (!forceMultiLine) {
        while (!fits(fullname, bestSingleLineSize) && bestSingleLineSize > 30) {
            bestSingleLineSize -= 2;
        }
    }

    if (!forceMultiLine && fits(fullname, bestSingleLineSize)) {
        ctx.font = `bold ${bestSingleLineSize}px "Montserrat"`;
        ctx.fillText(fullname, cardX + cardW / 2, cardNameY);
    } else {
        // Strategy 2: Multi-line (Split by words)
        const words = fullname.split(' ');
        let currentLine = words[0];
        lines = [];

        // Use smaller font size for multi-line to ensure fit
        const multiLineFontSize = fullname.length > 25 ? 26 : 30; // Reduced from 32/38

        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            if (fits(testLine, multiLineFontSize)) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = words[i];
            }
        }
        lines.push(currentLine);

        // Draw lines (Shrink if any specific line is still too wide)
        let lineHeight = fullname.length > 25 ? 32 : 36; // Reduced from 40/45

        // Calculate available space: from cardNameY to just above QR code area
        const qrTopMargin = cardY + cardH - 140 - 30; // 30px padding above QR
        const maxNameBottomY = qrTopMargin;

        // Start Y: position lines so they don't overlap QR
        let startY = cardNameY;

        // If lines would extend beyond QR, shift them up
        const projectedBottomY = startY + (lines.length - 1) * lineHeight;
        if (projectedBottomY > maxNameBottomY) {
            startY = maxNameBottomY - (lines.length - 1) * lineHeight;
        }

        let currentY = startY;

        lines.forEach(line => {
            let lineSize = multiLineFontSize;
            while (!fits(line, lineSize) && lineSize > 16) {
                lineSize -= 2;
            }
            ctx.font = `bold ${lineSize}px "Montserrat"`;
            ctx.fillText(line, cardX + cardW / 2, currentY);
            currentY += lineHeight;
        });
    }

    // QR Code on Card
    const qrSize = 140;
    const qrX = cardX + cardW - qrSize - 20;
    const qrY = cardY + cardH - qrSize - 20;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    const qrCanvas = document.createElement('div');
    const qrCode = new QRCode(qrCanvas, {
        text: `https://aikaryashala.com/certificates/bootcamp/kiet/${user.rollno}`,
        width: 256,
        height: 256,
        correctLevel: QRCode.CorrectLevel.H
    });

    const qrImg = qrCanvas.querySelector('img');
    if (qrImg && qrImg.src) {
        const qrImageObj = await loadImage(qrImg.src);
        ctx.drawImage(qrImageObj, qrX, qrY, qrSize, qrSize);
    } else {
        const qrCanv = qrCanvas.querySelector('canvas');
        if (qrCanv) {
            ctx.drawImage(qrCanv, qrX, qrY, qrSize, qrSize);
        }
    }
}

// Utility for rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = { tl: radius, tr: radius, br: radius, bl: radius };
    } else {
        var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
}
