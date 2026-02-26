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

/**
 * Notifies admin when a user requests a withdrawal.
 * @param {Object} transaction - The transaction details.
 * @param {Object} user - The user who made the withdrawal.
 */
const notifyWithdrawal = async (transaction, user) => {
    const message = `
        WITHDRAWAL REQUEST!
        User: ${user.firstName} ${user.lastName} (${user.email})
        Amount: ${transaction.fromAmount} ${transaction.fromCurrency}
        Status: ${transaction.status}
        Time: ${new Date().toISOString()}
    `;

    console.log('--- WITHDRAWAL NOTIFICATION ---');
    console.log(message);
    console.log('-------------------------------');

    // Send email to admin
    if (transporter) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: 'Keshav10.nakra@gmail.com',
                subject: `Transkom Withdrawal Request - ${user.firstName} ${user.lastName}`,
                text: message,
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
                        <h2 style="color:#ef4444;margin-bottom:16px;">💰 Withdrawal Request</h2>
                        <table style="width:100%;border-collapse:collapse;">
                            <tr><td style="padding:8px 0;color:#64748b;">User</td><td style="padding:8px 0;font-weight:600;">${user.firstName} ${user.lastName}</td></tr>
                            <tr><td style="padding:8px 0;color:#64748b;">Email</td><td style="padding:8px 0;">${user.email}</td></tr>
                            <tr><td style="padding:8px 0;color:#64748b;">Amount</td><td style="padding:8px 0;font-weight:700;color:#ef4444;">${transaction.fromAmount} ${transaction.fromCurrency}</td></tr>
                            <tr><td style="padding:8px 0;color:#64748b;">Status</td><td style="padding:8px 0;">${transaction.status}</td></tr>
                            <tr><td style="padding:8px 0;color:#64748b;">Time</td><td style="padding:8px 0;">${new Date().toLocaleString()}</td></tr>
                        </table>
                        <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;">
                        <p style="color:#94a3b8;font-size:12px;">This is an automated notification from Transkom.</p>
                    </div>
                `
            });
            console.log('Withdrawal email sent to Keshav10.nakra@gmail.com');
        } catch (err) {
            console.error('Failed to send withdrawal email:', err.message);
        }
    }
};

module.exports = { notifySell, notifyWithdrawal };
