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

closeModal.addEventListener('click', () => modal.classList.remove('active'));
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});

// Init
document.addEventListener('DOMContentLoaded', fetchResponses);
