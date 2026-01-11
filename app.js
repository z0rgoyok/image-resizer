/**
 * Приложение для изменения размера изображений
 */
(function() {
    'use strict';

    // === Элементы DOM ===
    const elements = {
        fileInput: document.getElementById('file-input'),
        uploadArea: document.getElementById('upload-area'),
        uploadSection: document.getElementById('upload-section'),
        editorSection: document.getElementById('editor-section'),
        preview: document.getElementById('preview'),
        canvas: document.getElementById('canvas'),
        widthInput: document.getElementById('width-input'),
        heightInput: document.getElementById('height-input'),
        linkBtn: document.getElementById('link-btn'),
        proportionsHint: document.getElementById('proportions-hint'),
        originalSize: document.getElementById('original-size'),
        newSize: document.getElementById('new-size'),
        resetBtn: document.getElementById('reset-btn'),
        saveBtn: document.getElementById('save-btn'),
        newPhotoBtn: document.getElementById('new-photo-btn'),
        quickBtns: document.querySelectorAll('.quick-btn'),
        // Модальное окно
        saveModal: document.getElementById('save-modal'),
        filenameInput: document.getElementById('filename-input'),
        fileExt: document.getElementById('file-ext'),
        downloadBtn: document.getElementById('download-btn'),
        emailBtn: document.getElementById('email-btn'),
        cancelModalBtn: document.getElementById('cancel-modal-btn')
    };

    // === Состояние ===
    const state = {
        originalImage: null,
        originalWidth: 0,
        originalHeight: 0,
        aspectRatio: 1,
        keepAspectRatio: true,
        fileName: 'image.jpg',
        lastPreset: null
    };

    // === LocalStorage ===
    const STORAGE_KEY = 'image-resizer-preset';

    function savePreset(preset) {
        state.lastPreset = preset;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preset));
        } catch (e) {
            // localStorage недоступен
        }
    }

    function loadPreset() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                state.lastPreset = JSON.parse(saved);
            }
        } catch (e) {
            // localStorage недоступен
        }
    }

    // === Инициализация ===
    function init() {
        loadPreset();
        setupFileInput();
        setupDragAndDrop();
        setupSizeInputs();
        setupButtons();
    }

    // === Загрузка файла ===
    function setupFileInput() {
        elements.fileInput.addEventListener('change', handleFileSelect);
    }

    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            loadImage(file);
        }
    }

    // === Drag & Drop ===
    function setupDragAndDrop() {
        const area = elements.uploadArea;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, preventDefaults);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, () => area.classList.add('dragover'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, () => area.classList.remove('dragover'));
        });

        area.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                loadImage(files[0]);
            }
        });
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // === Загрузка изображения ===
    function loadImage(file) {
        state.fileName = file.name || 'image.jpg';
        const ext = state.fileName.split('.').pop().toLowerCase();

        // HEIC/HEIF — конвертируем в JPEG
        if (ext === 'heic' || ext === 'heif' || file.type === 'image/heic' || file.type === 'image/heif') {
            convertHeicAndLoad(file);
            return;
        }

        loadImageFromFile(file);
    }

    function convertHeicAndLoad(file) {
        // Показываем индикатор загрузки
        elements.uploadArea.querySelector('.upload-text').textContent = 'Конвертирую HEIC...';

        // Проверяем что библиотека загружена
        if (typeof heic2any === 'undefined') {
            console.error('heic2any library not loaded');
            alert('Библиотека для HEIC не загрузилась. Проверь интернет и обнови страницу.');
            resetUploadText();
            return;
        }

        heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.92,
            multiple: false
        })
            .then((result) => {
                // heic2any может вернуть массив или один blob
                const jpegBlob = Array.isArray(result) ? result[0] : result;
                // Меняем расширение на jpg
                state.fileName = state.fileName.replace(/\.(heic|heif)$/i, '.jpg');
                loadImageFromFile(jpegBlob);
            })
            .catch((err) => {
                console.error('HEIC conversion failed:', err);
                // Пробуем альтернативный способ через createImageBitmap (Safari 17+)
                tryNativeHeicLoad(file);
            });
    }

    function tryNativeHeicLoad(file) {
        // Некоторые браузеры (Safari 17+) поддерживают HEIC нативно
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                state.originalWidth = img.width;
                state.originalHeight = img.height;
                state.aspectRatio = img.width / img.height;
                state.fileName = state.fileName.replace(/\.(heic|heif)$/i, '.jpg');
                resetUploadText();
                showEditor();
            };
            img.onerror = () => {
                alert('Не удалось открыть HEIC. Попробуй:\n1. Открыть фото в приложении Фото\n2. Нажать "Поделиться"\n3. Выбрать "Сохранить как JPEG"');
                resetUploadText();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function resetUploadText() {
        elements.uploadArea.querySelector('.upload-text').textContent = 'Нажми, чтобы выбрать фото';
    }

    function loadImageFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                state.originalImage = img;
                state.originalWidth = img.width;
                state.originalHeight = img.height;
                state.aspectRatio = img.width / img.height;

                resetUploadText();
                showEditor();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // === Показать редактор ===
    function showEditor() {
        elements.uploadSection.classList.add('hidden');
        elements.editorSection.classList.remove('hidden');

        elements.preview.src = state.originalImage.src;
        elements.widthInput.value = state.originalWidth;
        elements.heightInput.value = state.originalHeight;

        updateSizeDisplay();

        // Применяем сохранённый пресет
        if (state.lastPreset) {
            setTimeout(() => {
                applyPreset(state.lastPreset);
                highlightPresetBtn(findPresetBtn(state.lastPreset));
            }, 50);
        }
    }

    // === Настройка инпутов размера ===
    function setupSizeInputs() {
        elements.widthInput.addEventListener('input', handleWidthChange);
        elements.heightInput.addEventListener('input', handleHeightChange);
    }

    function handleWidthChange() {
        const width = parseInt(elements.widthInput.value) || 0;

        if (state.keepAspectRatio && width > 0) {
            const height = Math.round(width / state.aspectRatio);
            elements.heightInput.value = height;
        }

        updateSizeDisplay();
    }

    function handleHeightChange() {
        const height = parseInt(elements.heightInput.value) || 0;

        if (state.keepAspectRatio && height > 0) {
            const width = Math.round(height * state.aspectRatio);
            elements.widthInput.value = width;
        }

        updateSizeDisplay();
    }

    function updateSizeDisplay() {
        const width = parseInt(elements.widthInput.value) || 0;
        const height = parseInt(elements.heightInput.value) || 0;

        elements.originalSize.textContent = `Было: ${state.originalWidth} × ${state.originalHeight}`;
        elements.newSize.textContent = `Стало: ${width} × ${height}`;
    }

    // === Настройка кнопок ===
    function setupButtons() {
        // Связь пропорций
        elements.linkBtn.addEventListener('click', toggleAspectRatio);

        // Быстрые размеры
        elements.quickBtns.forEach(btn => {
            btn.addEventListener('click', () => handleQuickSize(btn));
        });

        // Сброс
        elements.resetBtn.addEventListener('click', resetSize);

        // Открыть модальное окно сохранения
        elements.saveBtn.addEventListener('click', openSaveModal);

        // Модальное окно
        elements.downloadBtn.addEventListener('click', downloadImage);
        elements.emailBtn.addEventListener('click', emailImage);
        elements.cancelModalBtn.addEventListener('click', closeSaveModal);
        elements.saveModal.addEventListener('click', (e) => {
            if (e.target === elements.saveModal) closeSaveModal();
        });

        // Новое фото
        elements.newPhotoBtn.addEventListener('click', resetToUpload);
    }

    // === Модальное окно ===
    function openSaveModal() {
        const width = parseInt(elements.widthInput.value) || state.originalWidth;
        const height = parseInt(elements.heightInput.value) || state.originalHeight;

        if (width <= 0 || height <= 0) {
            alert('Укажи корректные размеры');
            return;
        }

        // Предлагаем имя файла
        const baseName = state.fileName.replace(/\.[^.]+$/, '');
        elements.filenameInput.value = `${baseName}_${width}x${height}`;

        // Показываем расширение
        const ext = getFileExtension();
        elements.fileExt.textContent = `.${ext}`;

        elements.saveModal.classList.remove('hidden');
        elements.filenameInput.focus();
        elements.filenameInput.select();
    }

    function closeSaveModal() {
        elements.saveModal.classList.add('hidden');
    }

    function getFileExtension() {
        const ext = state.fileName.split('.').pop().toLowerCase();
        if (ext === 'png') return 'png';
        if (ext === 'webp') return 'webp';
        return 'jpg';
    }

    function getFilename() {
        const name = elements.filenameInput.value.trim() || 'image';
        const ext = getFileExtension();
        return `${name}.${ext}`;
    }

    function toggleAspectRatio() {
        state.keepAspectRatio = !state.keepAspectRatio;
        elements.linkBtn.classList.toggle('active', state.keepAspectRatio);

        if (state.keepAspectRatio) {
            elements.proportionsHint.textContent = '🔗 Пропорции сохраняются';
            elements.proportionsHint.classList.remove('inactive');
            // Пересчитать высоту под текущую ширину
            handleWidthChange();
        } else {
            elements.proportionsHint.textContent = '🔓 Свободное изменение';
            elements.proportionsHint.classList.add('inactive');
        }
    }

    function handleQuickSize(btn) {
        const scale = parseFloat(btn.dataset.scale);
        const targetWidth = parseInt(btn.dataset.width);
        const targetHeight = parseInt(btn.dataset.height);

        // Сохраняем пресет
        const preset = {
            scale: scale || null,
            width: targetWidth || null,
            height: targetHeight || null
        };
        savePreset(preset);

        // Подсвечиваем активную кнопку
        highlightPresetBtn(btn);

        applyPreset(preset);
    }

    function highlightPresetBtn(activeBtn) {
        elements.quickBtns.forEach(b => b.classList.remove('active'));
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    function findPresetBtn(preset) {
        if (!preset) return null;
        for (const btn of elements.quickBtns) {
            const scale = parseFloat(btn.dataset.scale);
            const width = parseInt(btn.dataset.width);
            const height = parseInt(btn.dataset.height);
            if (preset.scale && scale === preset.scale) return btn;
            if (preset.width && width === preset.width) return btn;
            if (preset.height && height === preset.height) return btn;
        }
        return null;
    }

    function applyPreset(preset) {
        if (!preset) return;

        if (preset.scale) {
            elements.widthInput.value = Math.round(state.originalWidth * preset.scale);
            handleWidthChange();
        } else if (preset.height) {
            elements.heightInput.value = preset.height;
            handleHeightChange();
        } else if (preset.width) {
            elements.widthInput.value = preset.width;
            handleWidthChange();
        }
    }

    function resetSize() {
        elements.widthInput.value = state.originalWidth;
        elements.heightInput.value = state.originalHeight;
        updateSizeDisplay();
    }

    // === Создание изображения ===
    function createResizedBlob(callback) {
        const width = parseInt(elements.widthInput.value) || state.originalWidth;
        const height = parseInt(elements.heightInput.value) || state.originalHeight;

        const canvas = elements.canvas;
        const ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        // Включаем сглаживание для качественного уменьшения
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(state.originalImage, 0, 0, width, height);

        // Определяем формат
        const ext = getFileExtension();
        let mimeType = 'image/jpeg';
        let quality = 0.92;

        if (ext === 'png') {
            mimeType = 'image/png';
        } else if (ext === 'webp') {
            mimeType = 'image/webp';
        }

        canvas.toBlob(callback, mimeType, quality);
    }

    // === Скачивание ===
    function downloadImage() {
        createResizedBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const filename = getFilename();

            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            closeSaveModal();
        });
    }

    // === Отправка по почте ===
    function emailImage() {
        createResizedBlob((blob) => {
            const filename = getFilename();

            // На iOS можно использовать Web Share API для отправки файла
            if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename)] })) {
                const file = new File([blob], filename, { type: blob.type });
                navigator.share({
                    files: [file],
                    title: filename
                }).then(() => {
                    closeSaveModal();
                }).catch((err) => {
                    console.log('Share cancelled or failed:', err);
                    // Fallback - скачать и открыть почту
                    fallbackEmail(blob, filename);
                });
            } else {
                // Fallback для браузеров без Web Share API
                fallbackEmail(blob, filename);
            }
        });
    }

    function fallbackEmail(blob, filename) {
        // Сначала скачиваем файл
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Потом открываем почту
        setTimeout(() => {
            window.location.href = 'mailto:?subject=' + encodeURIComponent('Фото: ' + filename) + '&body=' + encodeURIComponent('Прикрепи скачанный файл ' + filename);
            closeSaveModal();
        }, 500);
    }

    // === Сброс к загрузке ===
    function resetToUpload() {
        state.originalImage = null;
        state.originalWidth = 0;
        state.originalHeight = 0;
        state.aspectRatio = 1;
        state.fileName = 'image.jpg';

        elements.fileInput.value = '';
        elements.preview.src = '';
        elements.widthInput.value = '';
        elements.heightInput.value = '';

        elements.editorSection.classList.add('hidden');
        elements.uploadSection.classList.remove('hidden');
    }

    // === Запуск ===
    document.addEventListener('DOMContentLoaded', init);
})();
