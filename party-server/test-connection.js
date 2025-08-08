const WebSocket = require('ws');

// Test the PartyKit server connection
async function testConnection() {
    console.log('Testing PartyKit server connection...');
    
    const ws = new WebSocket('ws://localhost:1999/parties/main/my-new-room');
    
    ws.on('open', function open() {
        console.log('✅ Connected to PartyKit server!');
        
        // Test sending a ping
        ws.send('ping');
        console.log('📤 Sent: ping');
        
        // Test creating a game
        setTimeout(() => {
            const createGameMsg = JSON.stringify({ type: 'create-game' });
            ws.send(createGameMsg);
            console.log('📤 Sent:', createGameMsg);
        }, 1000);
    });
    
    ws.on('message', function message(data) {
        console.log('📥 Received:', data.toString());
    });
    
    ws.on('error', function error(err) {
        console.error('❌ WebSocket error:', err.message);
    });
    
    ws.on('close', function close() {
        console.log('🔌 Connection closed');
    });
    
    // Close connection after 5 seconds
    setTimeout(() => {
        console.log('🔄 Closing connection...');
        ws.close();
        process.exit(0);
    }, 5000);
}

// Check if server is running first
async function checkServer() {
    try {
        const response = await fetch('http://localhost:1999');
        if (response.ok) {
            console.log('✅ Server is running on http://localhost:1999');
            testConnection();
        } else {
            console.log('❌ Server responded with status:', response.status);
        }
    } catch (error) {
        console.error('❌ Cannot connect to server:', error.message);
        console.log('Make sure the PartyKit server is running with: npm run dev');
    }
}

checkServer(); 