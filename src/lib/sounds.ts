// Sound Manager for Battleship Game
// Uses Web Audio API for reliable sound playback

type SoundType = 'fire' | 'hit' | 'miss' | 'sunk' | 'win' | 'lose'

class SoundManager {
  private audioContext: AudioContext | null = null
  private isMuted: boolean = false
  private volume: number = 0.3

  private initContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
  }

  // Generate simple tones for different game events
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', decay: boolean = true) {
    if (this.isMuted) return
    
    try {
      this.initContext()
      if (!this.audioContext) return

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)

      gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime)
      if (decay) {
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)
      }

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration)
    } catch (e) {
      console.warn('Sound playback failed:', e)
    }
  }

  // Play a sequence of tones
  private playSequence(notes: { freq: number; dur: number; delay: number }[], type: OscillatorType = 'sine') {
    notes.forEach(note => {
      setTimeout(() => this.playTone(note.freq, note.dur, type), note.delay * 1000)
    })
  }

  play(sound: SoundType) {
    if (this.isMuted) return

    switch (sound) {
      case 'fire':
        // Quick whoosh sound
        this.playTone(200, 0.1, 'sawtooth')
        setTimeout(() => this.playTone(150, 0.05, 'sawtooth'), 50)
        break

      case 'hit':
        // Explosion-like sound
        this.playTone(150, 0.15, 'square')
        setTimeout(() => this.playTone(100, 0.2, 'sawtooth'), 50)
        setTimeout(() => this.playTone(80, 0.15, 'triangle'), 100)
        break

      case 'miss':
        // Water splash sound
        this.playTone(400, 0.1, 'sine')
        setTimeout(() => this.playTone(300, 0.15, 'sine'), 50)
        setTimeout(() => this.playTone(200, 0.1, 'sine'), 100)
        break

      case 'sunk':
        // Dramatic sinking sound
        this.playSequence([
          { freq: 200, dur: 0.2, delay: 0 },
          { freq: 150, dur: 0.2, delay: 0.15 },
          { freq: 100, dur: 0.3, delay: 0.3 },
          { freq: 80, dur: 0.4, delay: 0.5 },
        ], 'sawtooth')
        break

      case 'win':
        // Victory fanfare
        this.playSequence([
          { freq: 523, dur: 0.15, delay: 0 },
          { freq: 659, dur: 0.15, delay: 0.15 },
          { freq: 784, dur: 0.15, delay: 0.3 },
          { freq: 1047, dur: 0.4, delay: 0.45 },
        ], 'square')
        break

      case 'lose':
        // Defeat sound
        this.playSequence([
          { freq: 400, dur: 0.3, delay: 0 },
          { freq: 350, dur: 0.3, delay: 0.25 },
          { freq: 300, dur: 0.3, delay: 0.5 },
          { freq: 200, dur: 0.5, delay: 0.75 },
        ], 'sawtooth')
        break
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted
  }

  getMuted(): boolean {
    return this.isMuted
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol))
  }
}

// Singleton instance
export const soundManager = new SoundManager()
