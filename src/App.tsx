import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RefreshCw, Terminal } from 'lucide-react';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIR = { x: 0, y: -1 };

const TRACKS = [
  { id: 1, title: 'SYS.REQ.01', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'MEM.DUMP.02', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'NULL.PTR.03', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function App() {
  // Game State
  const snakeRef = useRef(INITIAL_SNAKE);
  const dirRef = useRef(INITIAL_DIR);
  const lastProcessedDirRef = useRef(INITIAL_DIR);
  const foodRef = useRef({ x: 5, y: 5 });
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);

  const [, setRenderTrigger] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isStarted, setIsStarted] = useState(false);

  // Music Player State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [visualizer, setVisualizer] = useState<number[]>(Array(12).fill(10));
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Game Logic ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        e.preventDefault();
      }
      if (!isStarted || gameOverRef.current) return;

      const currentDir = lastProcessedDirRef.current;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          if (currentDir.y !== 1) dirRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
          if (currentDir.y !== -1) dirRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
          if (currentDir.x !== 1) dirRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
          if (currentDir.x !== -1) dirRef.current = { x: 1, y: 0 };
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStarted]);

  useEffect(() => {
    if (!isStarted || isGameOver) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const snake = [...snakeRef.current];
      const head = { ...snake[0] };
      const dir = dirRef.current;

      head.x += dir.x;
      head.y += dir.y;

      // Wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        gameOverRef.current = true;
        setIsGameOver(true);
        return;
      }

      // Self collision
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOverRef.current = true;
        setIsGameOver(true);
        return;
      }

      snake.unshift(head);

      // Food collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        scoreRef.current += 10;
        setScore(scoreRef.current);
        
        let newFood;
        while (true) {
          newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          };
          if (!snake.some(s => s.x === newFood.x && s.y === newFood.y)) {
            break;
          }
        }
        foodRef.current = newFood;
      } else {
        snake.pop();
      }

      snakeRef.current = snake;
      lastProcessedDirRef.current = dir;
      setRenderTrigger(prev => prev + 1);

      const speed = Math.max(50, 120 - Math.floor(scoreRef.current / 30) * 5);
      timeoutId = setTimeout(tick, speed);
    };

    timeoutId = setTimeout(tick, 120);

    return () => clearTimeout(timeoutId);
  }, [isStarted, isGameOver]);

  const restartGame = () => {
    snakeRef.current = INITIAL_SNAKE;
    dirRef.current = INITIAL_DIR;
    lastProcessedDirRef.current = INITIAL_DIR;
    foodRef.current = { x: 5, y: 5 };
    gameOverRef.current = false;
    scoreRef.current = 0;
    setIsGameOver(false);
    setScore(0);
    setIsStarted(true);

    if (!isPlaying && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log("Audio play prevented:", e));
    }
  };

  // --- Music Player Logic ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (!isPlaying) {
      setVisualizer(Array(12).fill(10));
      return;
    }
    const interval = setInterval(() => {
      setVisualizer(Array.from({ length: 12 }, () => Math.max(15, Math.random() * 100)));
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Playback failed:", e));
      }
    }
  };

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const prevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  }, [currentTrackIndex, isPlaying]);

  return (
    <div className="min-h-screen bg-black text-cyan-400 flex flex-col items-center justify-center p-4 font-mono relative overflow-hidden">
      {/* Overlays */}
      <div className="scanlines absolute inset-0 z-40"></div>
      <div className="noise absolute inset-0 z-50"></div>

      {/* Header */}
      <div className="animate-tear z-30 mb-8 w-full max-w-5xl">
        <h1 className="text-5xl sm:text-7xl font-digital mb-2 text-white glitch-text-harsh uppercase tracking-tighter border-b-4 border-fuchsia-500 pb-2 inline-block">
          SYS.OP.SNAKE
        </h1>
        <p className="text-fuchsia-500 text-sm tracking-widest uppercase mt-2 font-bold">
          &gt; STATUS: {isGameOver ? 'CRITICAL_FAILURE' : (isStarted ? 'EXECUTING' : 'AWAITING_INPUT')}
        </p>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-12 items-start w-full max-w-5xl justify-center z-30">
        
        {/* Game Container */}
        <div className="flex flex-col items-start w-full max-w-[400px]">
          {/* Score & Status */}
          <div className="w-full flex justify-between items-end mb-2 border-b-4 border-cyan-400 pb-2">
            <div className="text-5xl text-white font-digital glitch-text-harsh">
              DATA: {score.toString().padStart(4, '0')}
            </div>
            {isGameOver && (
              <div className="text-xl text-fuchsia-500 font-bold animate-pulse uppercase">
                ERR: COLLISION
              </div>
            )}
          </div>

          {/* Game Board */}
          <div 
            className="relative bg-black border-4 border-cyan-400 glitch-box w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] overflow-hidden"
            style={{
              backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)',
              backgroundSize: '5% 5%'
            }}
          >
            {!isStarted && !isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                <button
                  onClick={restartGame}
                  className="px-6 py-3 bg-cyan-400 text-black hover:bg-fuchsia-500 hover:text-white transition-colors duration-0 uppercase tracking-widest font-bold text-2xl font-digital glitch-text-harsh"
                >
                  [ INIT_SEQUENCE ]
                </button>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <div className="text-6xl font-digital text-fuchsia-500 mb-6 glitch-text-harsh tracking-widest">FATAL_ERR</div>
                <button
                  onClick={restartGame}
                  className="px-6 py-3 border-4 border-fuchsia-500 text-fuchsia-500 hover:bg-fuchsia-500 hover:text-black transition-colors duration-0 uppercase tracking-widest font-bold text-2xl font-digital flex items-center gap-2"
                >
                  <RefreshCw size={24} strokeWidth={3} /> REBOOT_SYS
                </button>
              </div>
            )}

            {/* Snake */}
            {snakeRef.current.map((segment, i) => (
              <div
                key={i}
                className={`absolute ${i === 0 ? 'bg-white z-10' : 'bg-cyan-400'}`}
                style={{
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                }}
              />
            ))}

            {/* Food */}
            <div
              className="absolute bg-fuchsia-500 animate-pulse z-0"
              style={{
                left: `${(foodRef.current.x / GRID_SIZE) * 100}%`,
                top: `${(foodRef.current.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
              }}
            />
          </div>
          
          {/* Controls Hint */}
          <div className="mt-4 text-cyan-600 text-sm tracking-widest uppercase flex items-center gap-2 font-bold">
            <Terminal size={16} />
            <span>INPUT: [W,A,S,D] OR [ARROWS]</span>
          </div>
        </div>

        {/* Music Player */}
        <div className="w-full max-w-[320px] bg-black border-4 border-fuchsia-500 glitch-box p-6 flex flex-col animate-tear">
          <h2 className="text-fuchsia-500 text-sm font-bold tracking-widest mb-6 uppercase flex items-center gap-2 border-b-4 border-fuchsia-500/50 pb-2">
            <span className={`w-3 h-3 bg-fuchsia-500 ${isPlaying ? 'animate-pulse' : 'opacity-30'}`}></span>
            AUDIO_STREAM
          </h2>
          
          <div className="mb-6">
            <div className="text-4xl font-digital text-white truncate glitch-text-harsh">
              {TRACKS[currentTrackIndex].title}
            </div>
            <div className="text-xs text-cyan-400 mt-2 tracking-widest uppercase font-bold">&gt; SRC: AI_GEN_NODE</div>
          </div>

          {/* Visualizer bars */}
          <div className="flex items-end gap-1 h-16 mb-6 border-b-2 border-cyan-400/30 pb-1">
            {visualizer.map((height, i) => (
              <div 
                key={i}
                className="w-full bg-cyan-400"
                style={{
                  height: `${height}%`,
                  transition: 'height 0.05s linear',
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-between mb-6 px-2">
            <button onClick={prevTrack} className="p-2 text-fuchsia-500 hover:text-white hover:bg-fuchsia-500 transition-colors duration-0">
              <SkipBack size={28} strokeWidth={3} />
            </button>
            <button 
              onClick={togglePlay} 
              className="p-4 border-4 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-colors duration-0"
            >
              {isPlaying ? <Pause size={32} strokeWidth={3} /> : <Play size={32} strokeWidth={3} className="ml-1" />}
            </button>
            <button onClick={nextTrack} className="p-2 text-fuchsia-500 hover:text-white hover:bg-fuchsia-500 transition-colors duration-0">
              <SkipForward size={28} strokeWidth={3} />
            </button>
          </div>

          <div className="flex items-center gap-4 text-cyan-400 bg-black p-3 border-4 border-cyan-400/50">
            {volume === 0 ? <VolumeX size={20} strokeWidth={3} /> : <Volume2 size={20} strokeWidth={3} />}
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-cyan-900 appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

      </div>
      
      <audio
        ref={audioRef}
        src={TRACKS[currentTrackIndex].url}
        onEnded={nextTrack}
      />
    </div>
  );
}
