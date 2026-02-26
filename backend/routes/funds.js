const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const { notifyWithdrawal } = require('../utils/notifications');

// --------------- Razorpay Instance ---------------
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --------------- Wallet helpers (same as transactions.js) ---------------
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

// Valid currency code (3 uppercase letters)
const CURRENCY_CODE_REGEX = /^[A-Z]{3}$/;

// Razorpay supports these currencies for orders
const RAZORPAY_SUPPORTED = new Set([
    'INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED', 'AUD', 'CAD',
    'CNY', 'SEK', 'NZD', 'MXN', 'BDT', 'EGP', 'HKD', 'LKR',
    'MYR', 'NGN', 'PHP', 'PKR', 'QAR', 'SAR', 'THB', 'TRY', 'ZAR'
]);

// @route   POST /api/funds/create-order
// @desc    Create a Razorpay order for adding funds
router.post('/create-order', auth, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const cur = (currency || 'INR').toUpperCase();

        if (!CURRENCY_CODE_REGEX.test(cur)) {
            return res.status(400).json({ message: 'Invalid currency code.' });
        }

        // Razorpay requires amount in smallest unit (e.g. paise for INR)
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0 || !isFinite(numAmount)) {
            return res.status(400).json({ message: 'Invalid amount. Must be a positive number.' });
        }

        // Razorpay needs amount in smallest sub-unit (paise/cents)
        const amountInSmallest = Math.round(numAmount * 100);

        const options = {
            amount: amountInSmallest,
            currency: cur,
            receipt: `fund_${req.user.id}_${Date.now()}`,
            notes: {
                userId: req.user.id,
                purpose: 'add_funds'
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            orderId: order.id,
            amount: numAmount,
            currency: cur,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Razorpay order creation error:', err.message);
        res.status(500).json({ message: 'Failed to create payment order. Please try again.' });
    }
});

// @route   POST /api/funds/verify-payment
// @desc    Verify Razorpay payment and credit wallet
router.post('/verify-payment', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment verification details.' });
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
        }

        const numAmount = Number(amount);
        const cur = (currency || 'INR').toUpperCase();

        if (!numAmount || numAmount <= 0 || !CURRENCY_CODE_REGEX.test(cur)) {
            return res.status(400).json({ message: 'Invalid amount or currency.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        // Credit wallet
        addBalance(user, cur, numAmount);
        await user.save();

        // Record transaction
        const transaction = new Transaction({
            user: user._id,
            type: 'buy',
            fromCurrency: cur,
            toCurrency: cur,
            fromAmount: numAmount,
            toAmount: numAmount,
            status: 'completed',
            paymentId: razorpay_payment_id
        });
        await transaction.save();

        res.json({
            message: 'Funds added successfully!',
            wallet: walletToObject(user),
            credited: `${numAmount} ${cur}`
        });
    } catch (err) {
        console.error('Payment verification error:', err.message);
        res.status(500).json({ message: 'Payment verification failed. Please contact support.' });
    }
});

// @route   POST /api/funds/withdraw
// @desc    Withdraw funds from wallet (simulated — marks as pending)
router.post('/withdraw', auth, async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const cur = (currency || 'INR').toUpperCase();
        const numAmount = Number(amount);

        if (!CURRENCY_CODE_REGEX.test(cur)) {
            return res.status(400).json({ message: 'Invalid currency code.' });
        }
        if (!numAmount || numAmount <= 0 || !isFinite(numAmount)) {
            return res.status(400).json({ message: 'Invalid amount.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        if (getBalance(user, cur) < numAmount) {
            return res.status(400).json({ message: 'Insufficient balance for withdrawal.' });
        }

        // Debit wallet
        subtractBalance(user, cur, numAmount);
        await user.save();

        // Record transaction
        const transaction = new Transaction({
            user: user._id,
            type: 'sell',
            fromCurrency: cur,
            toCurrency: cur,
            fromAmount: numAmount,
            toAmount: numAmount,
            status: 'completed'
        });
        await transaction.save();

        // Send withdrawal notification email
        notifyWithdrawal(transaction, user);

        res.json({
            message: 'Withdrawal successful!',
            wallet: walletToObject(user),
            debited: `${numAmount} ${cur}`
        });
    } catch (err) {
        console.error('Withdrawal error:', err.message);
        res.status(500).json({ message: 'Withdrawal failed. Please try again.' });
    }
});

// @route   GET /api/funds/wallet
// @desc    Get user's wallet balances
router.get('/wallet', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        res.json({ wallet: walletToObject(user) });
    } catch (err) {
        console.error('Wallet fetch error:', err.message);
        res.status(500).json({ message: 'Failed to fetch wallet.' });
    }
});

module.exports = router;
