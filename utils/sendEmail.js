const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
    // Check for missing credentials inside the function
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("❌ MAIL CONFIG ERROR: EMAIL_USER or EMAIL_PASS environment variables are missing.");
        throw new Error('Server email configuration missing (EMAIL_USER/EMAIL_PASS)');
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: 10000, // 10 seconds before timing out connection attempt
        greetingTimeout: 10000,   // 10 seconds before timing out greeting
        socketTimeout: 20000,     // 20 seconds for inactivity
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
