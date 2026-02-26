const jwt = require('jsonwebtoken');

/**
 * Shared authentication middleware.
 * Extracts and verifies JWT from the Authorization header.
 * Attaches decoded user payload to req.user.
 */
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization denied. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Authorization denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token has expired. Please log in again.' });
        }
        res.status(401).json({ message: 'Token is invalid.' });
    }
};

module.exports = auth;
