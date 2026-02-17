const axios = require('axios');

async function testAuth() {
    try {
        console.log('Testing Registration...');
        const uniqueEmail = `test${Date.now()}@example.com`;
        
        try {
            const regRes = await axios.post('http://localhost:5000/api/auth/register', {
                name: 'Test User',
                email: uniqueEmail,
                password: 'password123'
            });
            console.log('✅ Registration SUCCESS:', regRes.data);
        } catch (err) {
            console.error('❌ Registration FAILED:', err.response ? err.response.data : err.message);
        }

        console.log('\nTesting Login...');
        try {
            const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
                email: uniqueEmail,
                password: 'password123'
            });
            console.log('✅ Login SUCCESS:', loginRes.data);
        } catch (err) {
            console.error('❌ Login FAILED:', err.response ? err.response.data : err.message);
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

testAuth();
