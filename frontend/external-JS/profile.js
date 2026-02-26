// ===================== TRANSKOM DASHBOARD =====================

const API_BASE = '/api';
let currentPage = 1;
let totalPages = 1;

// ---- Auth guard ----
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'auth.html';
        return null;
    }
    return token;
}

function authHeaders() {
    return { 'Authorization': `Bearer ${getToken()}` };
}

// ---- Logout ----
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// ---- Photo upload preview ----
document.getElementById('photo-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            document.getElementById('profile-image').src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// ---- Format number ----
function fmt(n) {
    if (n >= 1000000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n.toFixed(2);
}

// ---- Load profile ----
async function loadProfile() {
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });

        if (!res.ok) {
            if (res.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'auth.html';
            }
            return;
        }

        const user = await res.json();

        // Greeting
        const firstName = user.firstName || 'User';
        document.getElementById('greeting').textContent = `Welcome, ${firstName}`;
        document.getElementById('topbar-name').textContent = `${firstName} ${user.lastName || ''}`.trim();

        // Avatar
        if (user.avatar) {
            document.getElementById('profile-image').src = user.avatar;
        }

        // Profile fields
        document.getElementById('info-name').textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        document.getElementById('info-email').textContent = user.email || '';
        document.getElementById('info-phone').textContent = user.contactNumber || 'Not set';

        const joined = user.createdAt ? new Date(user.createdAt) : null;
        const joinedStr = joined
            ? joined.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—';
        document.getElementById('info-joined').textContent = joinedStr;
        document.getElementById('stat-joined').textContent = joinedStr;

        // Wallet — dynamic from Map
        const walletGrid = document.getElementById('wallet-grid');
        const wallet = user.wallet || {};

        // Filter out zero balances and sort by amount descending
        const entries = Object.entries(wallet)
            .filter(([, val]) => val > 0)
            .sort((a, b) => b[1] - a[1]);

        document.getElementById('stat-currencies').textContent = entries.length;

        if (entries.length === 0) {
            walletGrid.innerHTML = `
                <div class="wallet-empty">
                    <i class="fas fa-coins"></i>
                    No currencies yet. Buy your first currency to get started!
                </div>`;
        } else {
            walletGrid.innerHTML = entries.map(([currency, amount]) => `
                <div class="wallet-card">
                    <div class="wallet-icon">${currency}</div>
                    <div class="wallet-info">
                        <span class="wallet-currency">${currency}</span>
                        <span class="wallet-amount">${fmt(amount)}</span>
                    </div>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error('Failed to load profile:', err);
        document.getElementById('info-name').textContent = 'Error loading';
    }
}

// ---- Load transactions ----
async function loadTransactions(page = 1, append = false) {
    const token = getToken();
    if (!token) return;

    const container = document.getElementById('txn-container');

    try {
        const res = await fetch(`${API_BASE}/transactions/history?page=${page}&limit=15`, {
            headers: authHeaders()
        });

        if (!res.ok) {
            container.innerHTML = '<div class="txn-empty"><i class="fas fa-exclamation-circle"></i>Could not load transactions.</div>';
            return;
        }

        const data = await res.json();
        const txns = data.transactions || [];
        totalPages = data.pagination?.pages || 1;
        document.getElementById('stat-transactions').textContent = data.pagination?.total || 0;

        if (txns.length === 0 && !append) {
            container.innerHTML = `
                <div class="txn-empty">
                    <i class="fas fa-receipt"></i>
                    No transactions yet. Start trading to see your history here.
                </div>`;
            return;
        }

        const rows = txns.map(t => {
            const date = new Date(t.createdAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            const time = new Date(t.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit'
            });
            return `<tr>
                <td><span class="txn-badge ${t.type}">${t.type}</span></td>
                <td><span class="txn-amount from">−${t.fromAmount} ${t.fromCurrency}</span></td>
                <td><span class="txn-amount to">+${t.toAmount} ${t.toCurrency}</span></td>
                <td>${date}<br><small style="color:#64748b">${time}</small></td>
            </tr>`;
        }).join('');

        if (append) {
            // Append rows to existing tbody
            const tbody = container.querySelector('tbody');
            if (tbody) tbody.insertAdjacentHTML('beforeend', rows);
            // Remove old load-more button
            const oldBtn = container.querySelector('.btn-load-more');
            if (oldBtn) oldBtn.remove();
        } else {
            container.innerHTML = `
                <table class="txn-table">
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`;
        }

        // Load more button
        if (currentPage < totalPages) {
            const btn = document.createElement('button');
            btn.className = 'btn-load-more';
            btn.textContent = `Load More (Page ${currentPage + 1} of ${totalPages})`;
            btn.style.margin = '12px 24px 24px';
            btn.addEventListener('click', () => {
                currentPage++;
                loadTransactions(currentPage, true);
            });
            container.appendChild(btn);
        }

    } catch (err) {
        console.error('Failed to load transactions:', err);
        if (!append) {
            container.innerHTML = '<div class="txn-empty"><i class="fas fa-wifi"></i>Connection error. Please try again.</div>';
        }
    }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadTransactions(1);
});