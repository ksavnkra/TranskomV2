// ===================== BUY/SELL EXCHANGE LOGIC =====================
// Rates are fetched from server for display, but final amount is
// calculated server-side during transaction (cannot be manipulated).

const TRANSACTION_FEE = 0.015; // 1.5% — for display only, enforced on server
let currentMode = 'buy';
let currentRate = null;

// Store original <option> elements for payCurrency so we can restore them
let allPayCurrencyOptions = [];

document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('payCurrency');
    allPayCurrencyOptions = Array.from(select.options).map(opt => ({
        value: opt.value,
        text: opt.textContent
    }));
});

// Cached wallet data for the current session
let cachedWallet = {};

// Fetch wallet from server (used by both buy and sell modes)
async function fetchWalletData() {
    const token = localStorage.getItem('token');
    if (!token) return {};

    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return {};
        const user = await res.json();
        cachedWallet = user.wallet || {};
        return cachedWallet;
    } catch (err) {
        console.error('Failed to fetch wallet:', err);
        return {};
    }
}

// Filter payCurrency dropdown to wallet-only (for sell mode) with balance shown
async function filterPayCurrencyToWallet() {
    const wallet = await fetchWalletData();

    // Only currencies with balance > 0
    const walletEntries = Object.entries(wallet).filter(([, val]) => val > 0);

    const select = document.getElementById('payCurrency');
    select.innerHTML = '';

    if (walletEntries.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '— No currencies in wallet —';
        opt.disabled = true;
        opt.selected = true;
        select.appendChild(opt);
    } else {
        const walletCodes = walletEntries.map(([code]) => code);
        const matching = allPayCurrencyOptions.filter(o => walletCodes.includes(o.value));
        matching.forEach(o => {
            const bal = wallet[o.value] || 0;
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = `${o.text} (${bal.toFixed(2)})`;
            select.appendChild(opt);
        });
    }

    updateConversion();
}

// Filter payCurrency to wallet-only for buy mode (must have balance to pay)
async function filterPayCurrencyForBuy() {
    const wallet = await fetchWalletData();

    const walletEntries = Object.entries(wallet).filter(([, val]) => val > 0);

    const select = document.getElementById('payCurrency');
    select.innerHTML = '';

    if (walletEntries.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '— No funds — Add funds first —';
        opt.disabled = true;
        opt.selected = true;
        select.appendChild(opt);
    } else {
        const walletCodes = walletEntries.map(([code]) => code);
        const matching = allPayCurrencyOptions.filter(o => walletCodes.includes(o.value));
        matching.forEach(o => {
            const bal = wallet[o.value] || 0;
            const opt = document.createElement('option');
            opt.value = o.value;
            opt.textContent = `${o.text} (${bal.toFixed(2)})`;
            select.appendChild(opt);
        });
    }

    updateConversion();
}

// Restore all currency options in payCurrency dropdown (no longer used — buy now also requires balance)
function restoreAllPayCurrencyOptions() {
    const select = document.getElementById('payCurrency');
    select.innerHTML = '';
    allPayCurrencyOptions.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.text;
        select.appendChild(opt);
    });
    updateConversion();
}

// Fetch rate from our server (which fetches from exchange rate API)
async function fetchExchangeRate(from, to) {
    try {
        const response = await fetch(`/api/transactions/rate?from=${from}&to=${to}`);
        if (!response.ok) throw new Error('Failed to fetch exchange rates');
        return await response.json();
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        document.getElementById('exchangeRate').innerHTML = 'Error fetching exchange rates. Please try again later.';
        return null;
    }
}

async function updateConversion() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'inline';

    const payAmount = parseFloat(document.getElementById('payAmount').value) || 0;
    const payCurrency = document.getElementById('payCurrency').value;
    const receiveCurrency = document.getElementById('receiveCurrency').value;

    if (payCurrency && receiveCurrency && payCurrency !== receiveCurrency) {
        const data = await fetchExchangeRate(payCurrency, receiveCurrency);
        if (data) {
            currentRate = data.rate;
            const convertedAmount = payAmount * data.rate;
            const amountAfterFee = convertedAmount * (1 - TRANSACTION_FEE);
            document.getElementById('receiveAmount').value = amountAfterFee.toFixed(2);
            document.getElementById('exchangeRate').innerHTML =
                `1 ${payCurrency} = ${data.rate.toFixed(4)} ${receiveCurrency}`;
            const feeAmount = convertedAmount * TRANSACTION_FEE;
            document.getElementById('feeInfo').innerHTML =
                `Transkom's Transaction Fee: 1.5% (${receiveCurrency} ${feeAmount.toFixed(2)})`;
        }
    } else if (payCurrency === receiveCurrency) {
        document.getElementById('exchangeRate').innerHTML = 'Please select different currencies.';
        document.getElementById('receiveAmount').value = '';
        currentRate = null;
    }

    loadingIndicator.style.display = 'none';
}

function setActiveTab(tab, mode) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentMode = mode;
    document.getElementById('exchangeForm').reset();
    document.getElementById('exchangeRate').innerHTML = 'Select currencies to see exchange rate';
    document.getElementById('feeInfo').innerHTML = 'Transkom\'s Transaction Fee: 1.5%';
    currentRate = null;

    // Both modes require wallet balance to pay
    if (mode === 'sell') {
        filterPayCurrencyToWallet();
    } else {
        filterPayCurrencyForBuy();
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    const payAmount = parseFloat(document.getElementById('payAmount').value);
    const payCurrency = document.getElementById('payCurrency').value;
    const receiveCurrency = document.getElementById('receiveCurrency').value;

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Please login to continue.');
        parent.window.location.href = 'auth.html';
        return;
    }

    if (!payAmount || payAmount <= 0) {
        alert('Please enter a valid amount.');
        return;
    }

    if (payCurrency === receiveCurrency) {
        alert('Please select different currencies.');
        return;
    }

    const endpoint = currentMode === 'buy' ? '/buy' : '/sell';

    // Confirm for buy flow
    if (currentMode === 'buy') {
        const confirmPayment = confirm(`Proceed to pay ${payAmount} ${payCurrency}? (Simulating Payment Gateway)`);
        if (!confirmPayment) return;
    }

    const submitBtn = document.querySelector('.submit-button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        // Only send fromAmount — server calculates toAmount securely
        const response = await fetch(`/api/transactions${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fromCurrency: payCurrency,
                toCurrency: receiveCurrency,
                fromAmount: payAmount
            })
        });

        const data = await response.json();

        if (response.ok) {
            const txn = data.transaction;
            alert(`Transaction Successful!\n\n${currentMode === 'buy' ? 'Bought' : 'Sold'}: ${txn.received || txn.sold}\nRate: ${txn.rate}\nFee: ${txn.fee}`);
            document.getElementById('exchangeForm').reset();
            document.getElementById('exchangeRate').innerHTML = 'Select currencies to see exchange rate';
            document.getElementById('feeInfo').innerHTML = 'Transkom\'s Transaction Fee: 1.5%';
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Transaction error:", error);
        alert("An error occurred during the transaction.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue to Payment';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Default is buy mode — filter to wallet currencies
    filterPayCurrencyForBuy();
});