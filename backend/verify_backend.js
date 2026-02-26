const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let token = '';

async function runTests() {
    console.log('Starting Verification Tests...');

    try {
        // 1. Test Registration
        console.log('\n--- Test 1: User Registration ---');
        const regRes = await axios.post(`${API_BASE}/auth/register`, {
            firstName: 'Test',
            lastName: 'User',
            email: 'test' + Date.now() + '@example.com',
            password: 'password123',
            contactNumber: '1234567890'
        });
        console.log('Registration Success:', regRes.data.user.email);
        token = regRes.data.token;

        // 2. Test Login
        console.log('\n--- Test 2: User Login ---');
        const loginRes = await axios.post(`${API_BASE}/auth/login`, {
            email: regRes.data.user.email,
            password: 'password123'
        });
        console.log('Login Success. Token received.');

        // 3. Test Wallet (Buy)
        console.log('\n--- Test 3: Buy Currency (Update Wallet) ---');
        const buyRes = await axios.post(`${API_BASE}/transactions/buy`, {
            fromCurrency: 'INR',
            toCurrency: 'USD',
            fromAmount: 8300,
            toAmount: 100
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Buy Success. New USD Balance:', buyRes.data.wallet.USD);

        // 4. Test Wallet (Sell) & Notification
        console.log('\n--- Test 4: Sell Currency & Notify ---');
        const sellRes = await axios.post(`${API_BASE}/transactions/sell`, {
            fromCurrency: 'USD',
            toCurrency: 'INR',
            fromAmount: 50,
            toAmount: 4100
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Sell Success. New USD Balance:', sellRes.data.wallet.USD);
        console.log('New INR Balance:', sellRes.data.wallet.INR);
        console.log('Check server console for Sell Notification log.');

        console.log('\nAll tests completed successfully!');
    } catch (err) {
        console.error('\nTest Failed:', err.response ? err.response.data : err.message);
    }
}

runTests();
