const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 to prevent ENETUNREACH errors on Render
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const sendEmail = async ({ to, subject, html }) => {
    // Using Brevo (formerly Sendinblue) SMTP
    // Free plan: 300 emails/day, sends to ANY email, no domain verification needed
    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.BREVO_SMTP_USER, // your Brevo account email
            pass: process.env.BREVO_SMTP_PASS  // Brevo SMTP key (not your login password)
        }
    });

    const mailOptions = {
        from: `"ScanMyRide Security" <${process.env.BREVO_SMTP_USER}>`,
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
