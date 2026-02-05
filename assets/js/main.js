document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let studentsData = [];
    let currentUser = null;
    let uploadedPhotoBase64 = null;
    let cropper = null;

    // --- DOM Elements ---
    const screens = {
        login: document.getElementById('login-section'),
        upload: document.getElementById('upload-section'),
        certificate: document.getElementById('certificate-section')
    };

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const photoInput = document.getElementById('photo-input');
    const cropContainer = document.getElementById('crop-container');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropBtn = document.getElementById('crop-btn');
    const previewContainer = document.getElementById('preview-container');
    const finalPreview = document.getElementById('final-preview');
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    const backBtn = document.getElementById('back-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Initialization ---
    // Load CSV Data
    function loadStudentsData() {
        Papa.parse('students.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                studentsData = results.data;
                console.log('Students data loaded:', studentsData.length);
            },
            error: function (error) {
                console.error('Error parsing CSV:', error);
                alert('Error loading student database. Please ensure students.csv is present.');
            }
        });
    }

    loadStudentsData();

    // --- Navigation ---
    function switchScreen(screenName) {
        Object.values(screens).forEach(el => el.classList.add('hidden'));
        screens[screenName].classList.remove('hidden');
    }

    // --- Login Logic ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('student-name').value.trim();
        const rollNo = document.getElementById('roll-no').value.trim();
        const password = document.getElementById('password').value.trim();

        const user = studentsData.find(s =>
            s.student_name.toLowerCase() === name.toLowerCase() &&
            s.rollno === rollNo &&
            s.password === password
        );

        if (user) {
            currentUser = user;
            document.getElementById('user-display-name').textContent = user.student_name;
            loginError.classList.add('hidden');
            switchScreen('upload');
        } else {
            loginError.classList.remove('hidden');
        }
    });

    // --- Upload & Crop Logic ---
    photoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Initializing Cropper
                imageToCrop.src = e.target.result;
                cropContainer.classList.remove('hidden');

                if (cropper) {
                    cropper.destroy();
                }

                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 3.5 / 4.5, // Standard passport ratio
                    viewMode: 1,
                    autoCropArea: 1,
                });
            };
            reader.readAsDataURL(file);
        }
    });

    cropBtn.addEventListener('click', () => {
        if (!cropper) return;

        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            width: 600, // High enough resolution for print
            height: 771,
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        uploadedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.95);

        // Show preview
        finalPreview.src = uploadedPhotoBase64;
        cropContainer.classList.add('hidden');
        previewContainer.classList.remove('hidden');
    });

    // --- Certificate Generation ---
    // --- Certificate Generation ---
    let currentLang = 'en';
    const langToggleBtn = document.getElementById('lang-toggle-btn');

    // Language Toggle
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', async () => {
            if (!currentUser || !uploadedPhotoBase64) return;

            // Toggle State
            currentLang = currentLang === 'en' ? 'te' : 'en';

            // Update Button Text
            if (currentLang === 'en') {
                langToggleBtn.textContent = 'Switch to Telugu (తెలుగు)';
            } else {
                langToggleBtn.textContent = 'Switch to English';
            }

            // Re-render
            await renderCertificate(currentUser, uploadedPhotoBase64, currentLang);
        });
    }

    generateBtn.addEventListener('click', async () => {
        if (!currentUser || !uploadedPhotoBase64) return;

        // Default to English on generation
        currentLang = 'en';
        if (langToggleBtn) langToggleBtn.textContent = 'Switch to Telugu (తెలుగు)';

        // Call the renderer (defined in certificate-renderer.js)
        await renderCertificate(currentUser, uploadedPhotoBase64, currentLang);
        switchScreen('certificate');
    });

    // --- Download ---
    downloadBtn.addEventListener('click', () => {
        const canvas = document.getElementById('certificate-canvas');
        const link = document.createElement('a');

        const langSuffix = currentLang === 'en' ? '' : '_TE';
        link.download = `Certificate_${currentUser.student_name.replace(/\s+/g, '_')}${langSuffix}.jpg`;

        link.href = canvas.toDataURL('image/jpeg', 1.0);
        link.click();
    });

    backBtn.addEventListener('click', () => {
        switchScreen('upload');
    });

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        uploadedPhotoBase64 = null;
        loginForm.reset();
        previewContainer.classList.add('hidden');
        cropContainer.classList.add('hidden');
        switchScreen('login');
    });
});
