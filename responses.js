/**
 * Survey Response Viewer Logic
 * Features: Supabase Fetching, Local Filtering, Response Details Modal
 */

// Supabase Configuration (Sync with main app)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yrtebhdtrgkhwznmjbad.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_P0-9SYK1jAeVccSs4Rdy7g_4xedoI_W';

// Initialize Supabase Client
const { createClient } = window.supabase || {};
const supabase = createClient ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// State
let allResponses = [];
let filteredResponses = [];
let currentView = 'individual'; // 'individual' or 'all'

// DOM Elements
const tableBody = document.getElementById('table-body');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const totalCountEl = document.getElementById('total-count');
const lastSubmissionEl = document.getElementById('last-submission');

const filterAge = document.getElementById('filter-age');
const filterMember = document.getElementById('filter-member');
const refreshBtn = document.getElementById('refresh-btn');

const modal = document.getElementById('details-modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');

const individualView = document.getElementById('individual-view');
const summaryView = document.getElementById('summary-view');
const toggleIndividual = document.getElementById('toggle-individual');
const toggleAll = document.getElementById('toggle-all');

/**
 * Fetch data from Supabase
 */
async function fetchResponses() {
    if (!supabase) {
        showError('Supabase client not initialized. Check credentials.');
        return;
    }

    loadingState.style.display = 'block';
    tableBody.innerHTML = '';
    emptyState.style.display = 'none';

    try {
        const { data, error } = await supabase
            .from('survey_responses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allResponses = data || [];
        updateStats();
        applyFilters();
    } catch (err) {
        console.error('Error fetching data:', err.message);
        showError('Failed to load responses. Please try again.');
    } finally {
        loadingState.style.display = 'none';
    }
}

/**
 * Update Header Stats
 */
function updateStats() {
    totalCountEl.innerText = allResponses.length;
    if (allResponses.length > 0) {
        const lastDate = new Date(allResponses[0].created_at);
        lastSubmissionEl.innerText = lastDate.toLocaleString();
    } else {
        lastSubmissionEl.innerText = 'N/A';
    }
}

/**
 * Filter and Render Table
 */
function applyFilters() {
    const ageVal = filterAge.value;
    const memberVal = filterMember.value;

    filteredResponses = allResponses.filter(r => {
        const matchesAge = ageVal === 'all' || r.age_group === ageVal;
        const matchesMember = memberVal === 'all' || r.parish_member === memberVal;
        return matchesAge && matchesMember;
    });

    renderCurrentView();
}

function renderCurrentView() {
    if (currentView === 'individual') {
        individualView.style.display = 'block';
        summaryView.style.display = 'none';
        renderTable();
    } else {
        individualView.style.display = 'none';
        summaryView.style.display = 'block';
        renderSummaryView();
    }
}

function renderTable() {
    tableBody.innerHTML = '';

    if (filteredResponses.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    filteredResponses.forEach(response => {
        const tr = document.createElement('tr');
        tr.className = 'row-link';

        const createdAt = new Date(response.created_at);
        const isNew = createdAt > twentyFourHoursAgo;
        if (isNew) tr.classList.add('is-new');

        // Format: Jan 25, 2026
        const dateStr = createdAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        tr.innerHTML = `
            <td>
                ${dateStr}
                ${isNew ? '<span class="new-badge">NEW</span>' : ''}
            </td>
            <td><strong>${response.full_name || 'N/A'}</strong></td>
            <td>${response.email || 'N/A'}</td>
            <td><span class="badge badge-member-${response.parish_member}">${response.parish_member === 'yes' ? 'Member' : 'Non-Member'}</span></td>
            <td><span class="badge badge-age">${response.age_group || 'N/A'}</span></td>
            <td class="view-link" style="text-align: right;">View Details →</td>
        `;

        tr.addEventListener('click', () => showDetails(response));
        tableBody.appendChild(tr);
    });
}

/**
 * Summary View Rendering (Question-Centric)
 */
function renderSummaryView() {
    summaryView.innerHTML = '';

    if (filteredResponses.length === 0) {
        summaryView.innerHTML = '<div class="loading-state">No responses found matching filters.</div>';
        return;
    }

    const questions = [
        { label: 'Are you a registered member of Holy Trinity Parish?', key: 'parish_member', type: 'choice' },
        { label: 'Age Group', key: 'age_group', type: 'choice' },
        { label: 'Interest: Liturgical / Mass-Related', key: 'cat_liturgical', type: 'choice' },
        { label: 'Interest: Religious Ed & Faith Formation', key: 'cat_faith_formation', type: 'choice' },
        { label: 'Interest: Youth Ministry', key: 'cat_youth', type: 'choice' },
        { label: 'Interest: Groups & Service', key: 'cat_groups', type: 'choice' },
        { label: 'Interest: Fundraising & Seasonal Events', key: 'cat_seasonal', type: 'choice' },
        { label: 'Preferred: Email Updates', key: 'pref_email', type: 'choice' },
        { label: 'Preferred: Printed Bulletin', key: 'pref_bulletin', type: 'choice' },
        { label: 'Preferred: Parish Website', key: 'pref_website', type: 'choice' },
        { label: 'Community Connection (1-5)', key: 'community_connection', type: 'choice' },
        { label: 'Current Ministries', key: 'current_ministries', type: 'text' },
        { label: 'New Program Ideas', key: 'community_additions', type: 'text' },
        { label: 'Family Support Needs', key: 'community_families', type: 'text' },
        { label: 'Adult: Family Spiritual Growth Suggestions', key: 'adult_family', type: 'text' },
        { label: 'Young Adult: Biggest Faith Challenges', key: 'young_challenge', type: 'text' },
        { label: 'Senior: Better Service Suggestions', key: 'senior_service', type: 'text' },
        { label: 'Minor: Favorite Part of Parish Life', key: 'minor_fav', type: 'text' },
        { label: 'Minor: mass Excitement (1-5)', key: 'minor_excitement', type: 'text' },
        { label: 'Minor: Better Support Suggestions', key: 'minor_feedback', type: 'text' },
        { label: 'Final Comments / Prayer Intentions', key: 'final_comments', type: 'text' }
    ];

    questions.forEach(q => {
        const answers = filteredResponses.map(r => {
            const val = r[q.key] !== null && r[q.key] !== undefined && r[q.key] !== '' && r[q.key] !== false
                ? r[q.key]
                : (r.data ? r.data[q.key] : null);
            return val;
        }).filter(v => v !== null && v !== undefined && v !== '' && v !== false);

        if (answers.length === 0) return;

        const card = document.createElement('div');
        card.className = 'question-card';

        let contentHtml = '';
        if (q.type === 'choice') {
            const counts = {};
            answers.forEach(a => {
                const label = a === true ? 'Yes' : (a === false ? 'No' : a);
                counts[label] = (counts[label] || 0) + 1;
            });

            contentHtml = `
                <div class="answers-list">
                    ${Object.entries(counts).map(([label, count]) => `
                        <div class="choice-row">
                            <span class="choice-label">${label}</span>
                            <div class="choice-stats">
                                <span class="choice-count">${count}</span>
                                <span class="choice-percent">(${Math.round((count / answers.length) * 100)}%)</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            contentHtml = `
                <div class="text-answers">
                    ${answers.map(a => `<div class="text-answer-item">${a}</div>`).join('')}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="question-title">
                ${q.label}
                <span class="response-count">${answers.length} responses</span>
            </div>
            ${contentHtml}
        `;

        summaryView.appendChild(card);
    });
}

/**
 * Show Details Modal
 */
function showDetails(response) {
    const groups = [
        {
            title: "Basic Information",
            fields: [
                { label: 'Full Name', key: 'full_name' },
                { label: 'Email', key: 'email' },
                { label: 'Parish Member', key: 'parish_member' },
                { label: 'Age Group', key: 'age_group' },
                { label: 'Specific Age', key: 'age' },
                { label: 'Submitted At', key: 'created_at', format: v => new Date(v).toLocaleString() }
            ]
        },
        {
            title: "Ministry Interests",
            fields: [
                { label: 'Current Ministries', key: 'current_ministries' },
                { label: 'Faith Formation', key: 'cat_faith_formation' },
                { label: 'Liturgical / Mass', key: 'cat_liturgical' },
                { label: 'Youth Ministry', key: 'cat_youth' },
                { label: 'Service Groups', key: 'cat_groups' },
                { label: 'Seasonal/Events', key: 'cat_seasonal' }
            ]
        },
        {
            title: "Communication Preferences",
            fields: [
                { label: 'Email Updates', key: 'pref_email' },
                { label: 'Printed Bulletin', key: 'pref_bulletin' },
                { label: 'Parish Website', key: 'pref_website' }
            ]
        },
        {
            title: "Feedback & Community",
            fields: [
                { label: 'Community Connection (1-5)', key: 'community_connection' },
                { label: 'New Program Ideas', key: 'community_additions' },
                { label: 'Family Support Needs', key: 'community_families' },
                { label: 'Family Growth (Adults)', key: 'adult_family' },
                { label: 'Faith Challenges (Young Adults)', key: 'young_challenge' },
                { label: 'Experience (Seniors)', key: 'senior_service' },
                { label: 'Minor: Favorite Part', key: 'minor_fav' },
                { label: 'Minor: Excitement (1-5)', key: 'minor_excitement' },
                { label: 'Minor: Feedback', key: 'minor_feedback' },
                { label: 'Prayer Intentions / Final Comments', key: 'final_comments' }
            ]
        }
    ];

    let html = '';
    console.log('Generating modal details for:', response.full_name);

    // Helper to get value from flat column OR nested data JSON
    const getValue = (key) => {
        if (response[key] !== null && response[key] !== undefined && response[key] !== '' && response[key] !== false) {
            return response[key];
        }
        // Fallback to JSON data column
        const nestedData = response.data || {};
        return nestedData[key];
    };

    groups.forEach(group => {
        // Only show group if it has at least one non-empty field
        const visibleFieldsHtml = group.fields.map(item => {
            let val = getValue(item.key);
            if (val === null || val === undefined || val === '' || val === false) return null;

            if (item.format) val = item.format(val);
            if (typeof val === 'boolean') val = val ? 'Yes' : 'No';

            return `
                <div class="detail-item">
                    <span class="detail-label">${item.label}</span>
                    <div class="detail-value">${val}</div>
                </div>
            `;
        }).filter(h => h !== null).join('');

        if (visibleFieldsHtml) {
            console.log(`Adding group header: ${group.title}`);
            html += `<h3 class="detail-group-header">${group.title}</h3>`;
            html += visibleFieldsHtml;
        }
    });

    if (!html) {
        html = '<div class="loading-state">No detailed information available for this response.</div>';
    }

    modalBody.innerHTML = html;
    modal.classList.add('active');
}

/**
 * Helpers
 */
function showError(msg) {
    loadingState.innerText = msg;
    loadingState.style.color = '#e74c3c';
}

// Event Listeners
filterAge.addEventListener('change', applyFilters);
filterMember.addEventListener('change', applyFilters);
refreshBtn.addEventListener('click', fetchResponses);

toggleIndividual.addEventListener('click', () => {
    currentView = 'individual';
    toggleIndividual.classList.add('active');
    toggleAll.classList.remove('active');
    renderCurrentView();
});

toggleAll.addEventListener('click', () => {
    currentView = 'all';
    toggleAll.classList.add('active');
    toggleIndividual.classList.remove('active');
    renderCurrentView();
});

closeModal.addEventListener('click', () => modal.classList.remove('active'));
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});

// Init
document.addEventListener('DOMContentLoaded', fetchResponses);
