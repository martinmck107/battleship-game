# Battleship Game

A classic Battleship game playable in the browser against an AI opponent. Built with React, TypeScript, and Tailwind CSS.

## Live Demo

Play the game online: [Battleship Game](https://battleship-ai-game-07xw2t2r.devinapps.com)

## Features

- Classic 10x10 grid Battleship gameplay
- 5 standard ships: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- Smart AI opponent with adjacent targeting after hits
- Visual feedback for hits, misses, and sunk ships
- Mobile-friendly responsive design
- Restart game functionality

## How to Play

### Ship Placement Phase
1. Select a ship from the available ships list
2. Use the "Horizontal/Vertical" button to toggle ship orientation
3. Click on your grid to place the ship
4. Repeat until all 5 ships are placed
5. Click "Start Game" to begin

### Battle Phase
1. Click on a cell in the "Enemy Waters" grid to fire
2. Red target icon = Hit, Gray dot = Miss
3. The AI will automatically fire after your turn
4. Sink all enemy ships to win!

### Visual Indicators
- **Gray cells** on your grid: Your ships
- **Red target icon**: Hit
- **Gray dot**: Miss
- **Dark red cells**: Sunk ship

## Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm

### Setup
```bash
# Clone the repository
git clone https://github.com/martinmck107/battleship-game.git
cd battleship-game

# Install dependencies
npm install

# Start development server
npm run dev
```

The game will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

The built files will be in the `dist` directory.

## Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons

## Project Structure

```
battleship-game/
├── src/
│   ├── App.tsx          # Main game component
│   ├── App.css          # Global styles
│   ├── components/ui/   # shadcn/ui components
│   └── main.tsx         # Entry point
├── BUGS.md              # Bug documentation
└── README.md            # This file
```

## Bug Documentation

See [BUGS.md](./BUGS.md) for documented bugs and fixes.

## License

MIT License
