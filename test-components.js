const WebSocket = require('ws');

console.log('🧪 Testing Lobby and GameRoom Components...\n');

// Test 1: Check if servers are accessible
async function testServerAccess() {
  console.log('1️⃣ Testing server accessibility...');
  
  try {
    const partykitResponse = await fetch('http://localhost:1999');
    const nextjsResponse = await fetch('http://localhost:3000');
    
    console.log('✅ PartyKit server: ', partykitResponse.status === 200 ? 'RUNNING' : 'ERROR');
    console.log('✅ Next.js server: ', nextjsResponse.status === 200 ? 'RUNNING' : 'ERROR');
  } catch (error) {
    console.log('❌ Server check failed:', error.message);
  }
}

// Test 2: Test WebSocket connection and game creation
async function testWebSocketConnection() {
  console.log('\n2️⃣ Testing WebSocket connection...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:1999/parties/main/my-new-room');
    let gameId = null;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected successfully');
      
      // Test creating a game
      const createGameMsg = JSON.stringify({ type: 'create-game' });
      ws.send(createGameMsg);
      console.log('📤 Sent: create-game');
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log('📥 Received:', message.type);
      
      if (message.type === 'game-created') {
        gameId = message.gameId;
        console.log('✅ Game created with ID:', gameId);
        
        // Test joining the game
        const joinGameMsg = JSON.stringify({ type: 'join-game', gameId });
        ws.send(joinGameMsg);
        console.log('📤 Sent: join-game');
      }
      
      if (message.type === 'game-list-updated') {
        console.log('✅ Game list updated with', message.games?.length || 0, 'games');
      }
      
      if (message.type === 'game-state') {
        console.log('✅ Game state received for game:', message.game?.id);
        console.log('   Status:', message.game?.status);
        console.log('   Players:', message.game?.players?.length || 0);
      }
    });
    
    ws.on('error', (error) => {
      console.log('❌ WebSocket error:', error.message);
    });
    
    // Close after 3 seconds
    setTimeout(() => {
      ws.close();
      console.log('✅ WebSocket test completed');
      resolve();
    }, 3000);
  });
}

// Test 3: Test lobby functionality
async function testLobbyFunctionality() {
  console.log('\n3️⃣ Testing lobby functionality...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:1999/parties/main/my-new-room');
    let gamesCreated = 0;
    
    ws.on('open', () => {
      console.log('✅ Connected to lobby');
      
      // Create multiple games to test lobby display
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const createGameMsg = JSON.stringify({ type: 'create-game' });
          ws.send(createGameMsg);
          console.log(`📤 Created game ${i + 1}`);
        }, i * 500);
      }
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'game-created') {
        gamesCreated++;
        console.log(`✅ Game ${gamesCreated} created:`, message.gameId.slice(0, 8));
      }
      
      if (message.type === 'game-list-updated') {
        console.log(`✅ Lobby updated: ${message.games?.length || 0} games available`);
      }
    });
    
    setTimeout(() => {
      ws.close();
      console.log('✅ Lobby test completed');
      resolve();
    }, 4000);
  });
}

// Run all tests
async function runAllTests() {
  await testServerAccess();
  await testWebSocketConnection();
  await testLobbyFunctionality();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Open http://localhost:3000 in your browser');
  console.log('2. Connect your wallet');
  console.log('3. Navigate to /lobby');
  console.log('4. Click "Create New Battle"');
  console.log('5. Click "Join" on a game');
  console.log('6. Test the game room functionality');
}

runAllTests(); 