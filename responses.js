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

    renderTable();
}

function renderTable() {
    tableBody.innerHTML = '';

    if (filteredResponses.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    filteredResponses.forEach(response => {
        const tr = document.createElement('tr');
        tr.className = 'row-link';

        const date = new Date(response.created_at).toLocaleDateString();

        tr.innerHTML = `
            <td>${date}</td>
            <td><strong>${response.full_name || 'N/A'}</strong></td>
            <td>${response.email || 'N/A'}</td>
            <td><span class="badge badge-member-${response.parish_member}">${response.parish_member === 'yes' ? 'Member' : 'Non-Member'}</span></td>
            <td><span class="badge badge-age">${response.age_group || 'N/A'}</span></td>
            <td class="view-link">View Details</td>
        `;

        tr.addEventListener('click', () => showDetails(response));
        tableBody.appendChild(tr);
    });
}

/**
 * Show Details Modal
 */
function showDetails(response) {
    // List of all keys to show in order of importance
    const keys = [
        { label: 'Full Name', key: 'full_name' },
        { label: 'Email', key: 'email' },
        { label: 'Parish Member', key: 'parish_member' },
        { label: 'Age Group', key: 'age_group' },
        { label: 'Specific Age', key: 'age' },
        { label: 'Submitted At', key: 'created_at', format: v => new Date(v).toLocaleString() },
        { label: 'Current Ministries', key: 'current_ministries' },
        { label: 'Faith Formation Interest', key: 'cat_faith_formation' },
        { label: 'Liturgical Interest', key: 'cat_liturgical' },
        { label: 'Youth Interest', key: 'cat_youth' },
        { label: 'Groups Interest', key: 'cat_groups' },
        { label: 'Seasonal/Events Interest', key: 'cat_seasonal' },
        { label: 'Preferred: Email', key: 'pref_email' },
        { label: 'Preferred: Bulletin', key: 'pref_bulletin' },
        { label: 'Preferred: Website', key: 'pref_website' },
        { label: 'Community Connection (Rank)', key: 'community_connection' },
        { label: 'Community Additions', key: 'community_additions' },
        { label: 'Family Support Needs', key: 'community_families' },
        { label: 'Adult: Family Spiritual Growth', key: 'adult_family' },
        { label: 'Young Adult: Challenges', key: 'young_challenge' },
        { label: 'Minor: Favorite Part', key: 'minor_fav' },
        { label: 'Minor: Excitement (Rank)', key: 'minor_excitement' },
        { label: 'Minor: Feedback', key: 'minor_feedback' },
        { label: 'Senior: Service Needs', key: 'senior_service' },
        { label: 'Final Comments / Intentions', key: 'final_comments' }
    ];

    let html = '';
    keys.forEach(item => {
        let val = response[item.key];

        // Skip if value is empty/null/false (especially for interests not selected)
        if (val === null || val === undefined || val === '' || val === false) return;

        // Format if needed
        if (item.format) val = item.format(val);

        // Special handling for booleans (like checkbox interests)
        if (typeof val === 'boolean') val = val ? 'Yes' : 'No';

        html += `
            <div class="detail-item">
                <span class="detail-label">${item.label}</span>
                <div class="detail-value">${val}</div>
            </div>
        `;
    });

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

closeModal.addEventListener('click', () => modal.classList.remove('active'));
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});

// Init
document.addEventListener('DOMContentLoaded', fetchResponses);
