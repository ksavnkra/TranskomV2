const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { faker } = require('@faker-js/faker');
const User = require('../models/User');
const auth = require('../middleware/auth');

// --------------- Validation Helpers ---------------
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateRegistration(body) {
    const { firstName, lastName, email, password, contactNumber } = body;
    const errors = [];
    if (!firstName || firstName.trim().length < 1) errors.push('First name is required.');
    if (!lastName || lastName.trim().length < 1) errors.push('Last name is required.');
    if (!email || !EMAIL_REGEX.test(email)) errors.push('A valid email is required.');
    if (!password || password.length < MIN_PASSWORD_LENGTH) errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    if (!contactNumber || contactNumber.trim().length < 7) errors.push('A valid contact number is required.');
    return errors;
}

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    try {
        const errors = validateRegistration(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ message: errors.join(' ') });
        }

        const { firstName, lastName, email, password, contactNumber } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email: email.toLowerCase().trim() });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user with random avatar
        user = new User({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            password,
            contactNumber: contactNumber.trim(),
            avatar: faker.image.avatar()
        });

        await user.save();

        // Create JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({ token, user: { id: user._id, email: user.email, firstName: user.firstName } });
    } catch (err) {
        console.error('Registration error:', err);
        // Surface Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(' ') });
        }
        // Duplicate key (e.g. email already exists — race condition)
        if (err.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        res.status(500).json({ message: 'Server error — check backend console for details.' });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: { id: user._id, email: user.email, firstName: user.firstName } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error — check backend console for details.' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user data (uses shared auth middleware)
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('Get user error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
