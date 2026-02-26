const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

let transporter = null;

// Only create transporter if email is configured
if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_email@gmail.com') {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

/**
 * Notifies the admin when someone sells currency.
 * @param {Object} transaction - The transaction details.
 * @param {Object} user - The user who made the transaction.
 */
const notifySell = async (transaction, user) => {
    const message = `
        SELL ALERT!
        User: ${user.firstName} ${user.lastName} (${user.email})
        Sold: ${transaction.fromAmount} ${transaction.fromCurrency}
        Received: ${transaction.toAmount} ${transaction.toCurrency}
        Status: ${transaction.status}
        Time: ${transaction.createdAt}
    `;

    console.log('--- NOTIFICATION ---');
    console.log(message);
    console.log('--------------------');

    // Send email if transporter is configured
    if (transporter) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER, // Notifying admin
                subject: 'Transkom Sell Notification',
                text: message
            });
            console.log('Email sent to admin successfully.');
        } catch (err) {
            console.error('Failed to send notification email:', err.message);
        }
    }
};

module.exports = { notifySell };
