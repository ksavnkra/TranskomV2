const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { notifySell } = require('../utils/notifications');

// --------------- Constants ---------------
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

// --------------- Wallet helpers (Map-based) ---------------
function getBalance(user, currency) {
    return user.wallet.get(currency) || 0;
}

function addBalance(user, currency, amount) {
    user.wallet.set(currency, getBalance(user, currency) + amount);
}

function subtractBalance(user, currency, amount) {
    user.wallet.set(currency, getBalance(user, currency) - amount);
}

function walletToObject(user) {
    const obj = {};
    for (const [key, val] of user.wallet) {
        if (val !== 0) obj[key] = val;
    }
    return obj;
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

        const amount = Number(fromAmount);
        if (!amount || amount <= 0 || !isFinite(amount)) {
            return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check sufficient balance of the paying currency
        if (getBalance(user, fromCurrency) < amount) {
            return res.status(400).json({ message: `Insufficient ${fromCurrency} balance. You have ${getBalance(user, fromCurrency).toFixed(2)} ${fromCurrency}. Add funds first.` });
        }

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
            status: 'completed'
        });

        // Deduct paying currency and add received currency
        subtractBalance(user, fromCurrency, amount);
        addBalance(user, toCurrency, toAmount);

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
            wallet: walletToObject(user)
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

        const amount = Number(fromAmount);
        if (!amount || amount <= 0 || !isFinite(amount)) {
            return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check sufficient balance
        if (getBalance(user, fromCurrency) < amount) {
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
        subtractBalance(user, fromCurrency, amount);
        addBalance(user, toCurrency, toAmount);

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
            wallet: walletToObject(user)
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
