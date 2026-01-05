import { useState, useCallback, useEffect } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Anchor, Ship, Target, RotateCcw, Play, Volume2, VolumeX } from 'lucide-react'
import { soundManager } from '@/lib/sounds'

// Type definitions for the game
type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk'
type Orientation = 'horizontal' | 'vertical'
type GamePhase = 'placement' | 'playing' | 'gameOver'

interface ShipType {
  name: string
  size: number
  placed: boolean
}

interface PlacedShip {
  name: string
  size: number
  positions: { row: number; col: number }[]
  hits: number
  sunk: boolean
  orientation: Orientation
  isSinking: boolean // Track if currently playing sink animation
}

interface Cell {
  state: CellState
  shipName?: string
}

// Ship configurations following classic Battleship rules
const SHIPS: ShipType[] = [
  { name: 'Carrier', size: 5, placed: false },
  { name: 'Battleship', size: 4, placed: false },
  { name: 'Cruiser', size: 3, placed: false },
  { name: 'Submarine', size: 3, placed: false },
  { name: 'Destroyer', size: 2, placed: false },
]

const GRID_SIZE = 10

// Initialize an empty 10x10 grid
const createEmptyGrid = (): Cell[][] => {
  return Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map(() => ({ state: 'empty' as CellState }))
  )
}

// Check if ship placement is valid (within bounds and no overlap)
const isValidPlacement = (
  grid: Cell[][],
  row: number,
  col: number,
  size: number,
  orientation: Orientation
): boolean => {
  for (let i = 0; i < size; i++) {
    const r = orientation === 'horizontal' ? row : row + i
    const c = orientation === 'horizontal' ? col + i : col
    
    if (r >= GRID_SIZE || c >= GRID_SIZE) return false
    if (grid[r][c].state === 'ship') return false
  }
  return true
}

// Place a ship on the grid
const placeShip = (
  grid: Cell[][],
  row: number,
  col: number,
  ship: ShipType,
  orientation: Orientation
): { grid: Cell[][]; positions: { row: number; col: number }[] } => {
  const newGrid = grid.map(r => r.map(c => ({ ...c })))
  const positions: { row: number; col: number }[] = []
  
  for (let i = 0; i < ship.size; i++) {
    const r = orientation === 'horizontal' ? row : row + i
    const c = orientation === 'horizontal' ? col + i : col
    newGrid[r][c] = { state: 'ship', shipName: ship.name }
    positions.push({ row: r, col: c })
  }
  
  return { grid: newGrid, positions }
}

// AI random ship placement
const placeShipsRandomly = (): { grid: Cell[][]; ships: PlacedShip[] } => {
  let grid = createEmptyGrid()
  const placedShips: PlacedShip[] = []
  
  for (const ship of SHIPS) {
    let placed = false
    let attempts = 0
    
    while (!placed && attempts < 1000) {
      const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical'
      const maxRow = orientation === 'horizontal' ? GRID_SIZE : GRID_SIZE - ship.size
      const maxCol = orientation === 'horizontal' ? GRID_SIZE - ship.size : GRID_SIZE
      const row = Math.floor(Math.random() * maxRow)
      const col = Math.floor(Math.random() * maxCol)
      
      if (isValidPlacement(grid, row, col, ship.size, orientation)) {
        const result = placeShip(grid, row, col, ship, orientation)
        grid = result.grid
        placedShips.push({
          name: ship.name,
          size: ship.size,
          positions: result.positions,
          hits: 0,
          sunk: false,
          orientation: orientation,
          isSinking: false,
        })
        placed = true
      }
      attempts++
    }
  }
  
  return { grid, ships: placedShips }
}

// Main App Component
function App() {
  // Game state
  const [gamePhase, setGamePhase] = useState<GamePhase>('placement')
  const [playerGrid, setPlayerGrid] = useState<Cell[][]>(createEmptyGrid())
  const [aiGrid, setAiGrid] = useState<Cell[][]>(createEmptyGrid())
  const [playerShips, setPlayerShips] = useState<PlacedShip[]>([])
  const [aiShips, setAiShips] = useState<PlacedShip[]>([])
  const [availableShips, setAvailableShips] = useState<ShipType[]>([...SHIPS])
  const [selectedShip, setSelectedShip] = useState<ShipType | null>(null)
  const [orientation, setOrientation] = useState<Orientation>('horizontal')
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [message, setMessage] = useState('Place your ships on the grid')
  const [winner, setWinner] = useState<'player' | 'ai' | null>(null)
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [lastSunkShip, setLastSunkShip] = useState<string | null>(null)
  
  // AI targeting state for smart firing
  const [aiTargetQueue, setAiTargetQueue] = useState<{ row: number; col: number }[]>([])
  const [aiFiredCells, setAiFiredCells] = useState<Set<string>>(new Set())
  
  // Sound and animation state
  const [isMuted, setIsMuted] = useState(false)
  const [animatingCells, setAnimatingCells] = useState<Map<string, string>>(new Map())
  const [isAiThinking, setIsAiThinking] = useState(false)
  
  // Track ships that have finished sinking animation
  const [sunkShipsFinished, setSunkShipsFinished] = useState<Set<string>>(new Set())

  // Helper to trigger cell animation
  const triggerCellAnimation = useCallback((row: number, col: number, animationType: string) => {
    const key = `${row},${col}`
    setAnimatingCells(prev => new Map(prev).set(key, animationType))
    setTimeout(() => {
      setAnimatingCells(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
    }, 500)
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      soundManager.setMuted(!prev)
      return !prev
    })
  }, [])

  // Check if all ships of a player are sunk
  const checkAllShipsSunk = useCallback((ships: PlacedShip[]): boolean => {
    return ships.every(ship => ship.sunk)
  }, [])

  // Handle player firing at AI grid
  const handlePlayerFire = useCallback((row: number, col: number) => {
    if (gamePhase !== 'playing' || !isPlayerTurn) return
    if (aiGrid[row][col].state === 'hit' || aiGrid[row][col].state === 'miss' || aiGrid[row][col].state === 'sunk') return

    // Play fire sound
    soundManager.play('fire')

    const newAiGrid = aiGrid.map(r => r.map(c => ({ ...c })))
    const newAiShips = aiShips.map(s => ({ ...s, positions: [...s.positions] }))
    
    if (newAiGrid[row][col].state === 'ship') {
      const shipName = newAiGrid[row][col].shipName!
      newAiGrid[row][col].state = 'hit'
      
      // Update ship hits
      const shipIndex = newAiShips.findIndex(s => s.name === shipName)
      if (shipIndex !== -1) {
        newAiShips[shipIndex].hits++
        
        // Check if ship is sunk
        if (newAiShips[shipIndex].hits === newAiShips[shipIndex].size) {
          newAiShips[shipIndex].sunk = true
          newAiShips[shipIndex].isSinking = true
          // Mark all positions as sunk with animation
          newAiShips[shipIndex].positions.forEach(pos => {
            newAiGrid[pos.row][pos.col].state = 'sunk'
          })
          setLastSunkShip(shipName)
          setMessage(`You sunk the enemy's ${shipName}!`)
          soundManager.play('sunk')
          // After sinking animation completes, mark ship as finished sinking
          setTimeout(() => {
            setSunkShipsFinished(prev => new Set(prev).add(`ai-${shipName}`))
          }, 1000)
        } else {
          setMessage('Hit!')
          triggerCellAnimation(row, col, 'hit')
          soundManager.play('hit')
        }
      }
    } else {
      newAiGrid[row][col].state = 'miss'
      setMessage('Miss!')
      triggerCellAnimation(row, col, 'miss')
      soundManager.play('miss')
    }
    
    setAiGrid(newAiGrid)
    setAiShips(newAiShips)
    
    // Check win condition
    if (checkAllShipsSunk(newAiShips)) {
      setWinner('player')
      setGamePhase('gameOver')
      setShowEndDialog(true)
      soundManager.play('win')
      return
    }
    
    setIsPlayerTurn(false)
    setIsAiThinking(true)
  }, [gamePhase, isPlayerTurn, aiGrid, aiShips, checkAllShipsSunk, triggerCellAnimation])

  // AI firing logic with smart targeting
  const handleAiFire = useCallback(() => {
    if (gamePhase !== 'playing' || isPlayerTurn) return

    setIsAiThinking(false)
    
    // Play fire sound for AI
    soundManager.play('fire')

    let targetRow: number = -1
    let targetCol: number = -1
    const newFiredCells = new Set(aiFiredCells)
    let newTargetQueue = [...aiTargetQueue]

    // Try to get target from queue (adjacent cells after a hit)
    while (newTargetQueue.length > 0) {
      const target = newTargetQueue.shift()!
      const key = `${target.row},${target.col}`
      if (!newFiredCells.has(key) && 
          target.row >= 0 && target.row < GRID_SIZE && 
          target.col >= 0 && target.col < GRID_SIZE) {
        targetRow = target.row
        targetCol = target.col
        break
      }
    }

    // If no valid target in queue, fire randomly
    if (targetRow === -1 || targetCol === -1) {
      let attempts = 0
      do {
        targetRow = Math.floor(Math.random() * GRID_SIZE)
        targetCol = Math.floor(Math.random() * GRID_SIZE)
        attempts++
      } while (newFiredCells.has(`${targetRow},${targetCol}`) && attempts < 200)
    }

    newFiredCells.add(`${targetRow},${targetCol}`)
    
    const newPlayerGrid = playerGrid.map(r => r.map(c => ({ ...c })))
    const newPlayerShips = playerShips.map(s => ({ ...s, positions: [...s.positions] }))
    
    if (newPlayerGrid[targetRow][targetCol].state === 'ship') {
      const shipName = newPlayerGrid[targetRow][targetCol].shipName!
      newPlayerGrid[targetRow][targetCol].state = 'hit'
      
      // Add adjacent cells to target queue for smart targeting
      const adjacentCells = [
        { row: targetRow - 1, col: targetCol },
        { row: targetRow + 1, col: targetCol },
        { row: targetRow, col: targetCol - 1 },
        { row: targetRow, col: targetCol + 1 },
      ]
      newTargetQueue.push(...adjacentCells)
      
      // Update ship hits
      const shipIndex = newPlayerShips.findIndex(s => s.name === shipName)
      if (shipIndex !== -1) {
        newPlayerShips[shipIndex].hits++
        
        // Check if ship is sunk
        if (newPlayerShips[shipIndex].hits === newPlayerShips[shipIndex].size) {
          newPlayerShips[shipIndex].sunk = true
          newPlayerShips[shipIndex].isSinking = true
          // Mark all positions as sunk
          newPlayerShips[shipIndex].positions.forEach(pos => {
            newPlayerGrid[pos.row][pos.col].state = 'sunk'
          })
          // Clear target queue when ship is sunk
          newTargetQueue = []
          setMessage(`The enemy sunk your ${shipName}!`)
          soundManager.play('sunk')
          // After sinking animation completes, mark ship as finished sinking
          setTimeout(() => {
            setSunkShipsFinished(prev => new Set(prev).add(`player-${shipName}`))
          }, 1000)
        } else {
          setMessage('The enemy hit your ship!')
          triggerCellAnimation(targetRow, targetCol, 'hit')
          soundManager.play('hit')
        }
      }
    } else {
      newPlayerGrid[targetRow][targetCol].state = 'miss'
      setMessage('The enemy missed!')
      triggerCellAnimation(targetRow, targetCol, 'miss')
      soundManager.play('miss')
    }
    
    setPlayerGrid(newPlayerGrid)
    setPlayerShips(newPlayerShips)
    setAiFiredCells(newFiredCells)
    setAiTargetQueue(newTargetQueue)
    
    // Check win condition
    if (checkAllShipsSunk(newPlayerShips)) {
      setWinner('ai')
      setGamePhase('gameOver')
      setShowEndDialog(true)
      soundManager.play('lose')
      return
    }
    
    setIsPlayerTurn(true)
  }, [gamePhase, isPlayerTurn, playerGrid, playerShips, aiTargetQueue, aiFiredCells, checkAllShipsSunk, triggerCellAnimation])

  // AI fires after player turn with a delay
  useEffect(() => {
    if (!isPlayerTurn && gamePhase === 'playing') {
      const timer = setTimeout(() => {
        handleAiFire()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isPlayerTurn, gamePhase, handleAiFire])

  // Handle ship placement on player grid
  const handlePlacement = (row: number, col: number) => {
    if (gamePhase !== 'placement' || !selectedShip) return
    
    if (!isValidPlacement(playerGrid, row, col, selectedShip.size, orientation)) {
      setMessage('Invalid placement! Ships cannot overlap or go out of bounds.')
      return
    }
    
    const result = placeShip(playerGrid, row, col, selectedShip, orientation)
    setPlayerGrid(result.grid)
    setPlayerShips([...playerShips, {
      name: selectedShip.name,
      size: selectedShip.size,
      positions: result.positions,
      hits: 0,
      sunk: false,
      orientation: orientation,
      isSinking: false,
    }])
    
    const newAvailableShips = availableShips.filter(s => s.name !== selectedShip.name)
    setAvailableShips(newAvailableShips)
    setSelectedShip(null)
    
    if (newAvailableShips.length === 0) {
      setMessage('All ships placed! Click "Start Game" to begin.')
    } else {
      setMessage(`${selectedShip.name} placed! Select another ship.`)
    }
  }

  // Start the game
  const startGame = () => {
    if (availableShips.length > 0) {
      setMessage('Place all your ships first!')
      return
    }
    
    // Place AI ships randomly
    const aiSetup = placeShipsRandomly()
    setAiGrid(aiSetup.grid)
    setAiShips(aiSetup.ships)
    
    setGamePhase('playing')
    setMessage('Game started! Click on the enemy grid to fire.')
  }

  // Restart the game
  const restartGame = () => {
    setGamePhase('placement')
    setPlayerGrid(createEmptyGrid())
    setAiGrid(createEmptyGrid())
    setPlayerShips([])
    setAiShips([])
    setAvailableShips([...SHIPS])
    setSelectedShip(null)
    setOrientation('horizontal')
    setIsPlayerTurn(true)
    setMessage('Place your ships on the grid')
    setWinner(null)
    setShowEndDialog(false)
    setLastSunkShip(null)
    setAiTargetQueue([])
    setAiFiredCells(new Set())
    setAnimatingCells(new Map())
    setIsAiThinking(false)
    setSunkShipsFinished(new Set())
  }

  // Calculate cell size based on screen size (matches CSS w-6 h-6 md:w-8 md:h-8)
  const getCellSize = (): number => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return 32 // md:w-8 md:h-8 = 32px
    }
    return 24 // w-6 h-6 = 24px
  }

  // Render ship sprites as multi-cell visual objects
  const renderShipSprites = (
    ships: PlacedShip[],
    isPlayerBoard: boolean,
    grid: Cell[][]
  ) => {
    const cellSize = getCellSize()
    const headerOffset = cellSize // Account for row/column headers
    
    return ships.map(ship => {
      // Determine visibility based on fog of war rules
      // Player board: always visible
      // AI board: hidden until sunk (then revealed during sinking animation)
      const isVisible = isPlayerBoard || ship.sunk
      
      // Check if sinking animation has finished
      const shipKey = `${isPlayerBoard ? 'player' : 'ai'}-${ship.name}`
      const hasSinkingFinished = sunkShipsFinished.has(shipKey)
      
      // Don't render if sinking animation is complete
      if (hasSinkingFinished) return null
      
      // Calculate position based on first cell of ship
      const startPos = ship.positions[0]
      const isHorizontal = ship.orientation === 'horizontal'
      
      // Calculate dimensions
      const width = isHorizontal ? ship.size * cellSize : cellSize
      const height = isHorizontal ? cellSize : ship.size * cellSize
      
      // Calculate position (add header offset)
      const left = headerOffset + startPos.col * cellSize
      const top = headerOffset + startPos.row * cellSize
      
      // Get ship class name for styling
      const shipClassName = `ship-${ship.name.toLowerCase()}`
      
      // Determine animation state
      const isSinking = ship.isSinking && !hasSinkingFinished
      
      // Calculate hit positions relative to ship
      const hitPositions = ship.positions.map((pos, index) => {
        const cellState = grid[pos.row][pos.col].state
        return {
          index,
          isHit: cellState === 'hit' || cellState === 'sunk'
        }
      })
      
      return (
        <div
          key={ship.name}
          className={`
            ship-sprite ${shipClassName}
            ${isHorizontal ? 'horizontal' : 'vertical'}
            ${isSinking ? 'ship-sinking' : ''}
            ${!isVisible ? 'ship-hidden' : ''}
          `}
          style={{
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          <div className="ship-sprite-body">
            {/* Render hit markers on ship body */}
            {hitPositions.map(({ index, isHit }) => {
              if (!isHit) return null
              
              const markerStyle = isHorizontal
                ? { left: `${index * cellSize}px`, top: 0, width: `${cellSize}px`, height: `${cellSize}px` }
                : { left: 0, top: `${index * cellSize}px`, width: `${cellSize}px`, height: `${cellSize}px` }
              
              return (
                <div key={index} className="ship-hit-marker" style={markerStyle}>
                  {!ship.sunk && <div className="ship-smoke" />}
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  // Get cell color based on state
  const getCellColor = (cell: Cell, isPlayerBoard: boolean, isHovering: boolean = false, showShipColor: boolean = true): string => {
    if (isHovering && gamePhase === 'placement') {
      return 'bg-blue-300'
    }
    
    switch (cell.state) {
      case 'ship':
        // Don't show ship color if using ship sprites (showShipColor = false)
        return showShipColor ? (isPlayerBoard ? 'bg-gray-600' : 'bg-blue-500') : 'bg-blue-500'
      case 'hit':
        return 'bg-red-500'
      case 'miss':
        return 'bg-gray-300'
      case 'sunk':
        return 'bg-red-800'
      default:
        return 'bg-blue-500 hover:bg-blue-400'
    }
  }

  // Render a game grid
  const renderGrid = (
    grid: Cell[][],
    isPlayerBoard: boolean,
    ships: PlacedShip[],
    onClick?: (row: number, col: number) => void
  ) => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    
    return (
      <div className="grid-container">
        {/* Ship sprites layer */}
        {renderShipSprites(ships, isPlayerBoard, grid)}
        
        {/* Column headers */}
        <div className="flex">
          <div className="w-6 h-6 md:w-8 md:h-8"></div>
          {Array(GRID_SIZE).fill(null).map((_, i) => (
            <div key={i} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold text-gray-600">
              {i + 1}
            </div>
          ))}
        </div>
        
        {/* Grid rows */}
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex">
            {/* Row header */}
            <div className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center text-xs md:text-sm font-bold text-gray-600">
              {letters[rowIndex]}
            </div>
            
            {/* Cells */}
            {row.map((cell, colIndex) => {
              const isClickable = onClick && (
                (gamePhase === 'placement' && isPlayerBoard && selectedShip) ||
                (gamePhase === 'playing' && !isPlayerBoard && isPlayerTurn && 
                 cell.state !== 'hit' && cell.state !== 'miss' && cell.state !== 'sunk')
              )
              
              const cellKey = `${rowIndex},${colIndex}`
              const animationType = animatingCells.get(cellKey)
              const animationClass = animationType === 'hit' ? 'animate-hit animate-explosion' :
                                    animationType === 'miss' ? 'animate-miss animate-splash' :
                                    animationType === 'sunk' ? 'animate-sunk' : ''
              
              // For player board, don't show ship color since we have sprites
              // For AI board, don't show ship color (fog of war)
              const showShipColor = false
              
              return (
                <div
                  key={colIndex}
                  onClick={() => isClickable && onClick(rowIndex, colIndex)}
                  className={`
                    w-6 h-6 md:w-8 md:h-8 border border-blue-700 
                    ${getCellColor(cell, isPlayerBoard, false, showShipColor)}
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                    flex items-center justify-center
                    transition-colors duration-150
                    ${animationClass}
                  `}
                >
                  {cell.state === 'miss' && <div className="w-2 h-2 rounded-full bg-gray-500" />}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  // Render ship status list
  const renderShipStatus = (ships: PlacedShip[], title: string) => (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      <div className="space-y-1">
        {ships.map(ship => (
          <div 
            key={ship.name} 
            className={`text-xs flex items-center gap-2 ${ship.sunk ? 'text-red-500 line-through' : 'text-gray-700'}`}
          >
            <Ship className="w-3 h-3" />
            <span>{ship.name} ({ship.size})</span>
            {ship.sunk && <span className="text-red-500 font-bold">SUNK</span>}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 p-4">
      {/* Header */}
      <div className="text-center mb-6 relative">
        <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center justify-center gap-3">
          <Anchor className="w-8 h-8" />
          Battleship
          <Ship className="w-8 h-8" />
        </h1>
        <p className="text-blue-200 mt-2">{message}</p>
        
        {/* Sound Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          className="absolute top-0 right-0 text-white hover:bg-blue-800"
          title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
      </div>

      {/* Game Phase: Placement */}
      {gamePhase === 'placement' && (
        <div className="max-w-4xl mx-auto">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ship Placement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {availableShips.map(ship => (
                  <Button
                    key={ship.name}
                    variant={selectedShip?.name === ship.name ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedShip(ship)}
                  >
                    {ship.name} ({ship.size})
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrientation(o => o === 'horizontal' ? 'vertical' : 'horizontal')}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {orientation === 'horizontal' ? 'Horizontal' : 'Vertical'}
                </Button>
                
                {availableShips.length === 0 && (
                  <Button onClick={startGame} className="bg-green-600 hover:bg-green-700">
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                )}
              </div>
              
              <div className="flex justify-center">
                {renderGrid(playerGrid, true, playerShips, handlePlacement)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game Phase: Playing */}
      {(gamePhase === 'playing' || gamePhase === 'gameOver') && (
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Player Board */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  Your Fleet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {renderGrid(playerGrid, true, playerShips)}
                </div>
                {renderShipStatus(playerShips, 'Your Ships')}
              </CardContent>
            </Card>

            {/* AI Board */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Enemy Waters
                  {isPlayerTurn && gamePhase === 'playing' && (
                    <span className="text-sm font-normal text-green-600 ml-2">Your Turn!</span>
                  )}
                  {!isPlayerTurn && gamePhase === 'playing' && isAiThinking && (
                    <span className="text-sm font-normal text-yellow-600 ml-2 animate-thinking">AI Thinking...</span>
                  )}
                  {!isPlayerTurn && gamePhase === 'playing' && !isAiThinking && (
                    <span className="text-sm font-normal text-red-600 ml-2">Enemy Firing...</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {renderGrid(aiGrid, false, aiShips, handlePlayerFire)}
                </div>
                {renderShipStatus(aiShips, 'Enemy Ships')}
              </CardContent>
            </Card>
          </div>

          {/* Restart Button */}
          <div className="text-center mt-4">
            <Button onClick={restartGame} variant="outline" className="bg-white">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Game
            </Button>
          </div>
        </div>
      )}

      {/* Win/Loss Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={winner === 'player' ? 'text-green-600' : 'text-red-600'}>
              {winner === 'player' ? 'Victory!' : 'Defeat!'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {winner === 'player' 
                ? 'Congratulations! You have sunk all enemy ships and won the battle!'
                : 'The enemy has sunk all your ships. Better luck next time, Admiral!'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={restartGame}>
              Play Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sunk Ship Notification */}
      {lastSunkShip && gamePhase === 'playing' && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-in">
          Ship Sunk: {lastSunkShip}
        </div>
      )}
    </div>
  )
}

export default App
