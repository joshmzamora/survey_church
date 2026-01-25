/**
 * Holy Trinity Parish Survey - Main Logic
 * Features: Multi-page navigation, Progress tracking, Auto-save, Validation
 */

const state = {
    currentPage: 0,
    surveyData: JSON.parse(localStorage.getItem('ht_survey_data')) || {},
    totalWeight: 6 // Number of main pages
};

// DOM Elements
const pages = document.querySelectorAll('.page');
const progressBar = document.querySelector('.progress-bar');
const nextButtons = document.querySelectorAll('[data-nav="next"]');
const prevButtons = document.querySelectorAll('[data-nav="prev"]');
const ageInputs = document.querySelectorAll('input[name="age"]');
const ageSections = document.querySelectorAll('.age-section');

// Initialization
function init() {
    restoreData();
    showPage(state.currentPage);
    setupListeners();
}

/**
 * Navigation Logic
 */
function showPage(index) {
    pages.forEach((page, i) => {
        page.classList.toggle('active', i === index);
    });

    state.currentPage = index;
    updateProgress();
    handleAgeVisibility();

    // Scroll to top of page for better context on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
    const percent = (state.currentPage / (pages.length - 1)) * 100;
    progressBar.style.width = `${percent}%`;
}

/**
 * Data Management
 */
function collectData() {
    const currentActivePage = pages[state.currentPage];
    const inputs = currentActivePage.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            state.surveyData[input.name || input.id] = input.checked;
        } else if (input.type === 'radio') {
            if (input.checked) {
                state.surveyData[input.name] = input.value;
            }
        } else {
            state.surveyData[input.name || input.id] = input.value;
        }
    });

    saveToLocalStorage();
}

function saveToLocalStorage() {
    localStorage.setItem('ht_survey_data', JSON.stringify(state.surveyData));
}

function restoreData() {
    const savedData = state.surveyData;
    Object.keys(savedData).forEach(key => {
        const input = document.querySelector(`[name="${key}"], [id="${key}"]`);
        if (input) {
            if (input.type === 'checkbox') {
                input.checked = savedData[key];
            } else if (input.type === 'radio') {
                const radio = document.querySelector(`input[name="${key}"][value="${savedData[key]}"]`);
                if (radio) radio.checked = true;
            } else {
                input.value = savedData[key];
            }
        }
    });
}

/**
 * Age-Specific Logic
 */
function handleAgeVisibility() {
    const selectedAge = state.surveyData.age;
    ageSections.forEach(section => {
        section.style.display = 'none';
    });

    if (selectedAge) {
        const activeSection = document.querySelector(`.age-section.${selectedAge}`);
        if (activeSection) {
            activeSection.style.display = 'block';
        }
    }
}

/**
 * Event Listeners
 */
function setupListeners() {
    // Navigation
    nextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!validateCurrentPage()) return;

            collectData();
            if (state.currentPage < pages.length - 1) {
                showPage(state.currentPage + 1);

                // Final page submission handling
                if (state.currentPage === pages.length - 1) {
                    submitSurvey();
                }
            }
        });
    });

    prevButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.currentPage > 0) {
                showPage(state.currentPage - 1);
            }
        });
    });

    // Dynamic updates for age
    ageInputs.forEach(input => {
        input.addEventListener('change', () => {
            state.surveyData.age = input.value;
            saveToLocalStorage();
            handleAgeVisibility();
        });
    });

    // Monitoring all inputs for auto-save
    document.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('change', collectData);
    });
}

/**
 * Validation
 */
function validateCurrentPage() {
    const currentActivePage = pages[state.currentPage];
    const requiredInputs = currentActivePage.querySelectorAll('[required]');
    let isValid = true;

    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#e74c3c';
            isValid = false;
        } else {
            input.style.borderColor = 'rgba(0, 0, 0, 0.1)';

            // Basic email validation
            if (input.type === 'email' && !input.value.includes('@')) {
                input.style.borderColor = '#e74c3c';
                isValid = false;
            }
        }
    });

    return isValid;
}

/**
 * Supabase Preparation
 */
async function submitSurvey() {
    console.log('Final Survey Data:', state.surveyData);

    // Confetti effect (placeholder)
    triggerConfetti();

    /**
     * TODO: Implement Supabase submission
     * const { data, error } = await supabase
     *   .from('surveys')
     *   .insert([state.surveyData]);
     */
}

function triggerConfetti() {
    // We can use a library like canvas-confetti later
    console.log('🎊 Survey Completed! 🎊');
}

function restartSurvey() {
    localStorage.removeItem('ht_survey_data');
    state.surveyData = {};
    state.currentPage = 0;
    location.reload();
}

// Global exposure for specific functions
window.restart = restartSurvey;

// Run init on dom load
document.addEventListener('DOMContentLoaded', init);
