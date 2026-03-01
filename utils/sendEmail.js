const nodemailer = require('nodemailer');
const dns = require('dns');

// Force Node.js to prefer IPv4 over IPv6.
// Critical fix for 'ENETUNREACH' IPv6 errors on Render / cloud hosts.
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // 16-char Google App Password
        },
        connectionTimeout: 10000,  // 10s to establish SMTP connection
        socketTimeout: 10000,      // 10s for SMTP socket inactivity
    });

    const mailOptions = {
        from: `"ScanMyRide Security" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    };

    try {
        console.log(`🌐 Attempting to dispatch email to ${to}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Mail dispatched successfully: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`❌ Mail delivery failed for ${to}:`, error.message);
        throw error;
    }
};

module.exports = sendEmail;
