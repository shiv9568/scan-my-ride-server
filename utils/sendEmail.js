const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
    try {
        console.log(`🌐 Attempting to dispatch email to ${to}...`);
        const { data, error } = await resend.emails.send({
            from: 'ScanMyRide Security <onboarding@resend.dev>',
            to,
            subject,
            html
        });

        if (error) {
            console.error(`❌ Mail delivery failed for ${to}:`, error.message);
            throw new Error(error.message);
        }

        console.log(`✅ Mail dispatched successfully: ${data.id}`);
        return data;
    } catch (error) {
        console.error(`❌ Mail delivery failed for ${to}:`, error.message);
        throw error;
    }
};

module.exports = sendEmail;
