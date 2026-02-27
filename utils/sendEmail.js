const nodemailer = require('nodemailer');
const dns = require('dns');

// Force Node.js to prefer IPv4 over IPv6. 
// This is the most reliable fix for 'ENETUNREACH' IPv6 errors on Render.
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const sendEmail = async ({ to, subject, html }) => {
    // Credentials are hardcoded below for compatibility

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        family: 4,
        secure: true, // Port 465 uses SSL/TLS directly
        auth: {
            user: "shivanshbhatia9568@gmail.com",
            pass: "fzofiafctfzutedu"
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 45000, // 45 seconds
        greetingTimeout: 45000,
        socketTimeout: 60000,
    });

    const mailOptions = {
        from: `"ScanMyRide Security" <shivanshbhatia9568@gmail.com>`,
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
