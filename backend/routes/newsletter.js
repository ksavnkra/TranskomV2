const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// @route   POST api/newsletter/subscribe
// @desc    Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || !EMAIL_REGEX.test(email)) {
            return res.status(400).json({ message: 'A valid email address is required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        let sub = await Subscription.findOne({ email: normalizedEmail });
        if (sub) {
            return res.status(400).json({ message: 'Email already subscribed.' });
        }

        sub = new Subscription({ email: normalizedEmail });
        await sub.save();

        res.status(201).json({ message: 'Subscribed successfully!' });
    } catch (err) {
        console.error('Newsletter error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
