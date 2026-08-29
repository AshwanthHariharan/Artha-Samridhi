// ============================================
// TRANSLATION MODULE - Google Translate API
// Free, No API Key Required, No CORS Issues
// Supports 22 Indian Languages
// ============================================

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'ur', name: 'Urdu', native: 'اردو' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
    { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
    { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
    { code: 'mai', name: 'Maithili', native: 'मैथिली' },
    { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
    { code: 'ne', name: 'Nepali', native: 'नेपाली' },
    { code: 'sd', name: 'Sindhi', native: 'سنڌي' },
    { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
    { code: 'doi', name: 'Dogri', native: 'डोगरी' },
    { code: 'ks', name: 'Kashmiri', native: 'کٲشُر' },
    { code: 'mni', name: 'Manipuri', native: 'মৈতৈলোন্' },
    { code: 'brx', name: 'Bodo', native: 'बर' },
    { code: 'sat', name: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ' }
];

// Google Translate API (Free, No CORS)
const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

class Translator {
    constructor() {
        this.currentLang = localStorage.getItem('preferredLanguage') || 'en';
        this.isTranslating = false;
        this.init();
    }

    getLanguageName(code) {
        const lang = LANGUAGES.find(l => l.code === code);
        return lang ? lang.native : 'Unknown';
    }

    async translateText(text, targetLang) {
        if (!text || !text.trim()) return text;
        if (targetLang === 'en') return text;
        if (text.length < 2) return text;
        // Skip if text is mostly numbers or symbols
        if (!/[a-zA-Z]/.test(text)) return text;

        try {
            // Google Translate API - No CORS, Free
            const url = `${GOOGLE_TRANSLATE_URL}?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn('Google Translate API error:', response.status);
                return text;
            }

            const data = await response.json();
            
            if (data && data[0]) {
                let translatedText = '';
                for (const part of data[0]) {
                    if (part[0]) {
                        translatedText += part[0];
                    }
                }
                return translatedText || text;
            }
            
            return text;

        } catch (error) {
            console.warn('Translation error:', error);
            return text;
        }
    }

    async translatePage() {
        if (this.isTranslating) return;
        if (this.currentLang === 'en') {
            this.restoreOriginal();
            return;
        }

        this.isTranslating = true;
        this.showStatus(true);

        await new Promise(r => setTimeout(r, 500));

        try {
            // Get all elements with direct text content
            const allElements = document.querySelectorAll('body *');
            const textElements = [];
            
            allElements.forEach(el => {
                // Skip scripts, styles, and decorative elements
                if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') return;
                if (el.closest('.orb') || el.closest('.bg-grid') || el.closest('.scan-line')) return;
                if (el.closest('.lang-dropdown') || el.closest('.lang-btn')) return;
                if (el.closest('.chatbot-fab') || el.closest('.chatbot-sidebar')) return;
                if (el.closest('.stock-item') || el.closest('.news-item')) return;
                if (el.closest('.user-card') || el.closest('.investor-card')) return;
                if (el.closest('.crm-item') || el.closest('.scheme-item')) return;
                if (el.closest('.feature-card')) return;
                if (el.closest('.stat-item')) return;
                if (el.closest('.float-card')) return;
                
                // Get direct text content (only this element's text, not children)
                let text = '';
                const textNodes = [];
                for (const node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const trimmed = node.textContent.trim();
                        if (trimmed) {
                            text += trimmed;
                            textNodes.push(node);
                        }
                    }
                }
                
                // Include text that has at least one letter (a-zA-Z)
                if (text && text.length > 0 && /[a-zA-Z]/.test(text)) {
                    textElements.push({
                        el: el,
                        text: text,
                        textNodes: textNodes
                    });
                }
            });

            if (textElements.length === 0) {
                console.warn('No text elements found to translate');
                this.isTranslating = false;
                this.showStatus(false);
                return;
            }

            console.log(`📝 Translating ${textElements.length} elements to ${this.getLanguageName(this.currentLang)}...`);

            let count = 0;
            const total = textElements.length;

            // Translate in batches of 3
            for (let i = 0; i < textElements.length; i += 3) {
                const batch = textElements.slice(i, i + 3);
                
                for (const item of batch) {
                    const text = item.text;
                    if (text && !item.el.dataset.original) {
                        try {
                            const translated = await this.translateText(text, this.currentLang);
                            if (translated && translated !== text) {
                                item.el.dataset.original = text;
                                for (const node of item.textNodes) {
                                    if (node.textContent.trim() === text || node.textContent.includes(text)) {
                                        node.textContent = node.textContent.replace(text, translated);
                                    }
                                }
                                count++;
                            }
                        } catch (e) {
                            // Skip if translation fails
                        }
                    }
                }
                
                const progress = Math.min(100, Math.round(((i + 3) / total) * 100));
                this.showStatus(true, progress);
                
                // Small delay
                await new Promise(r => setTimeout(r, 100));
            }

            console.log(`✅ Translated ${count}/${total} elements to ${this.getLanguageName(this.currentLang)}`);

        } catch (error) {
            console.error('Translation error:', error);
        }

        this.isTranslating = false;
        this.showStatus(false);
    }

    restoreOriginal() {
        document.querySelectorAll('[data-original]').forEach(el => {
            el.textContent = el.dataset.original;
            delete el.dataset.original;
        });
        console.log('🔄 Restored English content');
    }

    showStatus(show, progress = 0) {
        const status = document.getElementById('translatingStatus');
        if (status) {
            if (show) {
                status.style.display = 'inline-block';
                if (progress > 0 && progress < 100) {
                    status.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Translating... ${progress}%`;
                } else if (progress >= 100) {
                    status.innerHTML = `<i class="fas fa-check-circle" style="color: #2e7d32;"></i> Done!`;
                    setTimeout(() => { status.style.display = 'none'; }, 2000);
                } else {
                    status.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Translating...`;
                }
            } else {
                status.style.display = 'none';
            }
        }
    }

    async switchLanguage(code) {
        if (code === this.currentLang) {
            this.closeDropdown();
            return;
        }

        this.currentLang = code;
        localStorage.setItem('preferredLanguage', code);

        this.updateUI(code);
        this.closeDropdown();

        if (code === 'en') {
            this.restoreOriginal();
            console.log(`✅ Switched to English`);
            return;
        }

        await new Promise(r => setTimeout(r, 300));
        await this.translatePage();
    }

    updateUI(code) {
        document.querySelectorAll('.lang-item').forEach(item => {
            item.classList.remove('active');
            const check = item.querySelector('.lang-check');
            if (check) check.remove();
            if (item.dataset.langCode === code) {
                item.classList.add('active');
                const mark = document.createElement('span');
                mark.className = 'lang-check';
                mark.innerHTML = '<i class="fas fa-check"></i>';
                item.appendChild(mark);
            }
        });

        const label = document.getElementById('currentLangLabel');
        if (label) {
            const lang = LANGUAGES.find(l => l.code === code);
            label.textContent = lang ? lang.native : 'English';
        }
    }

    toggleMenu() {
        const dropdown = document.getElementById('langDropdown');
        if (dropdown) {
            dropdown.classList.toggle('open');
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById('langDropdown');
        if (dropdown) {
            dropdown.classList.remove('open');
        }
    }

    renderSelector() {
        const dropdown = document.getElementById('langDropdown');
        if (!dropdown) return;

        dropdown.innerHTML = LANGUAGES.map(lang => `
            <div class="lang-item ${lang.code === this.currentLang ? 'active' : ''}" 
                 data-lang-code="${lang.code}"
                 onclick="window.translatorInstance?.switchLanguage('${lang.code}')">
                <span>${lang.native}</span>
                <span class="lang-code">${lang.name}</span>
                ${lang.code === this.currentLang ? '<span class="lang-check"><i class="fas fa-check"></i></span>' : ''}
            </div>
        `).join('');

        const label = document.getElementById('currentLangLabel');
        if (label) {
            const lang = LANGUAGES.find(l => l.code === this.currentLang);
            label.textContent = lang ? lang.native : 'English';
        }
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const sel = document.querySelector('.language-selector');
            if (sel && !sel.contains(e.target)) {
                this.closeDropdown();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.toggleMenu();
            }
        });
    }

    init() {
        this.renderSelector();
        this.bindEvents();
        console.log(`🌐 Translator ready - Language: ${this.getLanguageName(this.currentLang)}`);
        console.log(`📚 Using Google Translate API (Free, No API Key, No CORS)`);
        console.log(`💡 Click the globe icon 🌐 to select a language`);
        console.log(`⌨️  Keyboard shortcut: Ctrl+Shift+L`);
        
        if (this.currentLang !== 'en') {
            setTimeout(() => this.translatePage(), 1000);
        }
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

let translatorInstance = null;

function initTranslator() {
    if (!translatorInstance) {
        translatorInstance = new Translator();
        window.translatorInstance = translatorInstance;
    }
    return translatorInstance;
}

function toggleLanguageMenu() {
    if (!translatorInstance) initTranslator();
    if (translatorInstance) translatorInstance.toggleMenu();
}

function switchLanguage(code) {
    if (!translatorInstance) initTranslator();
    if (translatorInstance) translatorInstance.switchLanguage(code);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 Translation module loaded');
    setTimeout(initTranslator, 500);
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initTranslator, 300);
}

window.initTranslator = initTranslator;
window.toggleLanguageMenu = toggleLanguageMenu;
window.switchLanguage = switchLanguage;
window.translatorInstance = translatorInstance;