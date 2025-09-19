let translations = {};

// Function to fetch the locale file
async function fetchLocale(lang) {
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) {
        throw new Error(`Failed to load locale file for ${lang}`);
    }
    return response.json();
}

// Function to apply translations to the page
function translatePage() {
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        if (translations[key]) {
            // Handle different element types
            if (element.placeholder !== undefined) {
                element.placeholder = translations[key];
            } else {
                element.textContent = translations[key];
            }
        }
    });
}

// Main function to set the language
export async function setLanguage(lang) {
    try {
        translations = await fetchLocale(lang);
        document.documentElement.lang = lang;
        translatePage();
        localStorage.setItem('userLanguage', lang);
    } catch (error) {
        console.error(error);
        // Fallback to English if the chosen language fails
        if (lang !== 'en') {
            await setLanguage('en');
        }
    }
}

// Function to get a single translated string (for JS-generated text)
export function t(key) {
    return translations[key] || key;
}

// Function to initialize the i18n system
export function initI18n() {
    const savedLang = localStorage.getItem('userLanguage');
    const browserLang = navigator.language.split('-')[0];
    const lang = savedLang || (['en', 'it', 'es'].includes(browserLang) ? browserLang : 'en');
    return setLanguage(lang);
}