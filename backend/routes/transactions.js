const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { notifySell } = require('../utils/notifications');

// --------------- Constants ---------------
// Wallet currencies — only these can be held in user accounts
const WALLET_CURRENCIES = ['USD', 'INR', 'AED', 'EUR'];
const TRANSACTION_FEE = 0.015; // 1.5%
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/';
// Valid currency code format (3 uppercase letters)
const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

// --------------- Helper: Fetch rate server-side ---------------
async function getExchangeRate(fromCurrency, toCurrency) {
    try {
        const response = await axios.get(`${EXCHANGE_RATE_API}${fromCurrency}`);
        const rate = response.data.rates[toCurrency];
        if (!rate) throw new Error(`Rate not found for ${toCurrency}`);
        return rate;
    } catch (err) {
        if (err.message.startsWith('Rate not found')) throw err;
        throw new Error('Failed to fetch exchange rate. Please try again later.');
    }
}

// --------------- Validation ---------------
function validateCurrencyCode(currency) {
    return typeof currency === 'string' && CURRENCY_CODE_REGEX.test(currency);
}

function isWalletCurrency(currency) {
    return WALLET_CURRENCIES.includes(currency);
}

// @route   GET /api/transactions/rate
// @desc    Get server-calculated exchange rate (for frontend display)
router.get('/rate', async (req, res) => {
    try {
        const from = (req.query.from || '').toUpperCase();
        const to = (req.query.to || '').toUpperCase();
        if (!validateCurrencyCode(from) || !validateCurrencyCode(to)) {
            return res.status(400).json({ message: 'Invalid currency code. Use 3-letter ISO codes (e.g. USD, EUR).' });
        }
        if (from === to) {
            return res.json({ rate: 1, from, to });
        }
        const rate = await getExchangeRate(from, to);
        res.json({ rate, from, to, fee: TRANSACTION_FEE });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/transactions/buy
// @desc    Buy currency — server calculates the converted amount
router.post('/buy', auth, async (req, res) => {
    try {
        const { fromCurrency, toCurrency, fromAmount } = req.body;

        // Validate currency codes
        if (!validateCurrencyCode(fromCurrency) || !validateCurrencyCode(toCurrency)) {
            return res.status(400).json({ message: 'Invalid currency code.' });
        }
        if (fromCurrency === toCurrency) {
            return res.status(400).json({ message: 'Cannot exchange same currency.' });
        }
        // toCurrency must be a wallet currency (USD, INR, AED, EUR) to credit
        if (!isWalletCurrency(toCurrency)) {
            return res.status(400).json({ message: `Cannot receive ${toCurrency}. Wallet supports: ${WALLET_CURRENCIES.join(', ')}` });
        }

        const amount = Number(fromAmount);
        if (!amount || amount <= 0 || !isFinite(amount)) {
            return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Server-side exchange rate calculation
        const rate = await getExchangeRate(fromCurrency, toCurrency);
        const convertedAmount = amount * rate;
        const toAmount = parseFloat((convertedAmount * (1 - TRANSACTION_FEE)).toFixed(2));

        const transaction = new Transaction({
            user: user._id,
            type: 'buy',
            fromCurrency,
            toCurrency,
            fromAmount: amount,
            toAmount,
            status: 'completed' // In real app with Razorpay, start as 'pending'
        });

        // Update Wallet — add received currency
        // For buy: user pays external money (Razorpay) and receives toCurrency in wallet
        user.wallet[toCurrency] = (user.wallet[toCurrency] || 0) + toAmount;

        await transaction.save();
        await user.save();

        res.json({
            message: 'Transaction successful',
            transaction: {
                type: 'buy',
                paid: `${amount} ${fromCurrency}`,
                received: `${toAmount} ${toCurrency}`,
                rate,
                fee: `${TRANSACTION_FEE * 100}%`
            },
            wallet: user.wallet
        });
    } catch (err) {
        console.error('Buy transaction error:', err.message);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// @route   POST /api/transactions/sell
// @desc    Sell currency from wallet
router.post('/sell', auth, async (req, res) => {
    try {
        const { fromCurrency, toCurrency, fromAmount } = req.body;

        // Validate currency codes
        if (!validateCurrencyCode(fromCurrency) || !validateCurrencyCode(toCurrency)) {
            return res.status(400).json({ message: 'Invalid currency code.' });
        }
        if (fromCurrency === toCurrency) {
            return res.status(400).json({ message: 'Cannot exchange same currency.' });
        }
        // fromCurrency must be a wallet currency (user is selling from wallet)
        if (!isWalletCurrency(fromCurrency)) {
            return res.status(400).json({ message: `Cannot sell ${fromCurrency}. Wallet supports: ${WALLET_CURRENCIES.join(', ')}` });
        }

        const amount = Number(fromAmount);
        if (!amount || amount <= 0 || !isFinite(amount)) {
            return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check sufficient balance
        if ((user.wallet[fromCurrency] || 0) < amount) {
            return res.status(400).json({ message: 'Insufficient balance in wallet.' });
        }

        // Server-side exchange rate calculation
        const rate = await getExchangeRate(fromCurrency, toCurrency);
        const convertedAmount = amount * rate;
        const toAmount = parseFloat((convertedAmount * (1 - TRANSACTION_FEE)).toFixed(2));

        const transaction = new Transaction({
            user: user._id,
            type: 'sell',
            fromCurrency,
            toCurrency,
            fromAmount: amount,
            toAmount,
            status: 'completed'
        });

        // Deduct from wallet and add converted amount
        user.wallet[fromCurrency] -= amount;
        user.wallet[toCurrency] = (user.wallet[toCurrency] || 0) + toAmount;

        await transaction.save();
        await user.save();

        // Trigger notification
        notifySell(transaction, user);

        res.json({
            message: 'Transaction successful',
            transaction: {
                type: 'sell',
                sold: `${amount} ${fromCurrency}`,
                received: `${toAmount} ${toCurrency}`,
                rate,
                fee: `${TRANSACTION_FEE * 100}%`
            },
            wallet: user.wallet
        });
    } catch (err) {
        console.error('Sell transaction error:', err.message);
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

// @route   GET /api/transactions/history
// @desc    Get user's transaction history (paginated)
router.get('/history', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            Transaction.find({ user: req.user.id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Transaction.countDocuments({ user: req.user.id })
        ]);

        res.json({
            transactions,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (err) {
        console.error('History error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
