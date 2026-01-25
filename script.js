/**
 * Holy Trinity Parish Survey - Main Logic
 * Features: Multi-page navigation, Progress tracking, Auto-save, Validation, Dynamic Results
 */

const state = {
    currentPage: 0,
    surveyData: JSON.parse(localStorage.getItem('ht_survey_data')) || {},
    totalWeight: 6 // Number of main pages
};

// Detailed Ministry Data for Dynamic Results
const ministryDetails = {
    cat_liturgical: {
        title: "Liturgical / Mass-Related",
        items: [
            "Mass Volunteer Roles (Lector, Usher, Altar Server, EMHC, Hospitality)",
            "Ministry Scheduler Pro: Claim spots and receive reminders",
            "Gather The Children: Helpers, readers, or facilitators for Grades K-6 liturgy"
        ]
    },
    cat_faith_formation: {
        title: "Religious Ed & Faith Formation",
        items: [
            "CCE Catechist: Teach or assist K-8 faith formation classes",
            "Youth Confirmation: Facilitators for Year 1 and Year 2 classes",
            "OCIA/OCIC: Catechists, sponsors, and hospitality ministers",
            "Vacation Bible School (VBS): Summer program coordinators and teachers"
        ]
    },
    cat_youth: {
        title: "Youth Ministry",
        items: [
            "HSM (High School Ministry): DYC, Saint Life sessions, and service programs",
            "Shine: Junior High youth group activities and events"
        ]
    },
    cat_groups: {
        title: "Groups & Service",
        items: [
            "Catholic Daughters of the Americas (CDA): Service projects and social events",
            "Legion of Mary: Weekly prayer, study, and service",
            "ACTS Community: Men's and Women's retreats",
            "Together in Holiness: Host Couples and group participants",
            "Catholic Young Adults Group: Service and fellowship"
        ]
    },
    cat_seasonal: {
        title: "Fundraising & Seasonal Events",
        items: [
            "Fundraising Committee: Planning Mardi Gras and other events",
            "Lent Activities: Fish Fries and service projects",
            "Children's Christmas Pageant & Parade Team roles",
            "St. Joseph's Altar & Blue Mass support"
        ]
    }
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
            input.style.borderColor = 'var(--input-border)';

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
 * Dynamic Results Injection
 */
function injectMinistryDetails() {
    const container = document.getElementById('ministry-details');
    if (!container) return;

    const selectedCategories = Object.keys(ministryDetails).filter(cat => state.surveyData[cat] === true);

    if (selectedCategories.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = `
    <div class="ministry-details-area">
      <p style="text-align: center; font-weight: 700; color: var(--text); margin-bottom: 24px;">Based on your interests, here are more ways to get involved:</p>
  `;

    selectedCategories.forEach(cat => {
        const data = ministryDetails[cat];
        html += `
      <div class="detail-section">
        <h4>${data.title}</h4>
        <ul class="detail-list">
          ${data.items.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    `;
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Supabase Preparation
 */
async function submitSurvey() {
    console.log('Final Survey Data:', state.surveyData);

    // Inject details based on user selection
    injectMinistryDetails();

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
