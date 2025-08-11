# Rematch Feature Documentation

## Overview

The rematch feature allows players to start a new game with the same opponent after a game finishes. Both players must agree to the rematch for it to proceed.

## How It Works

### 1. Game Completion

- When a game finishes (either player wins or it's a draw), the game status changes to one of:
  - `1st_player_won`
  - `2nd_player_won`
  - `draw`

### 2. Rematch Request

- After the game ends, both players see a "Request Rematch" button
- When a player clicks the button, it sends a `request-rematch` message to the server
- The button changes to show "Rematch Requested" and "Waiting for opponent..."

### 3. Rematch Agreement

- The server tracks rematch requests for each game
- When both players request a rematch, the server automatically creates a new game
- Both players are redirected to the new game page

### 4. Balance Requirements

- Players must have at least $25 in their wallet to participate in a rematch
- If either player has insufficient balance, the rematch fails with an error message

## Technical Implementation

### Server Side (`party-server/src/server.ts`)

- **Rematch Request Tracking**: Uses `rematchRequests` Map to track who has requested rematch
- **Message Handlers**:
  - `handleRematchRequest()`: Processes rematch requests
  - `handleAcceptRematch()`: Alternative handler for accepting rematches
  - `createRematchGame()`: Creates new game when both players agree
- **Balance Validation**: Checks wallet balances before creating rematch game
- **Game Creation**: Generates new game ID and cards for the rematch

### Client Side

- **BattleView Component**: Shows rematch UI after game completion
- **Game Page**: Handles rematch-related messages and redirects
- **State Management**: Tracks rematch request status and displays appropriate UI

## Message Types

### From Client to Server

- `request-rematch`: Player requests a rematch
- `accept-rematch`: Alternative way to accept rematch (same as request-rematch)

### From Server to Client

- `game-updated`: Includes rematch data (who has requested, if both agreed)
- `rematch-game-created`: New rematch game has been created
- `rematch-failed`: Rematch could not be created (e.g., insufficient balance)

## UI Flow

1. **Game Ends**: Players see win/lose/draw screen
2. **Rematch Button**: "Request Rematch" button appears below results
3. **Request Sent**: Button changes to show request status
4. **Waiting**: Shows "Waiting for opponent..." message
5. **Agreement**: When both agree, shows "Rematch Starting Soon!"
6. **Redirect**: Automatically redirects to new game page

## Error Handling

- **Insufficient Balance**: Shows error message with player balances
- **Network Issues**: Handles connection problems gracefully
- **Invalid Requests**: Server validates all rematch requests

## Testing

Use the `test-rematch.js` file to test the rematch functionality:

```bash
cd party-server
npm run dev
# In another terminal
node test-rematch.js
```

## Future Enhancements

- Add rematch cooldown period
- Allow players to decline rematch requests
- Track rematch history
- Add rematch statistics
- Support for tournament-style rematches
