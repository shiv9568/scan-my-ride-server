const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
    // Credentials are hardcoded below for compatibility

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        family: 4,
        secure: false,
        auth: {
            user: "shivanshbhatia9568@gmail.com",
            pass: "fzofiafctfzutedu"
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 60000,
        dnsTimeout: 10000,
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
