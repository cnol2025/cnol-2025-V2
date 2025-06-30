import { useEffect, useRef } from 'react';

// Hook pour les effets sonores
export const useSoundEffects = () => {
  const audioContext = useRef(null);
  const sounds = useRef({});

  useEffect(() => {
    // Initialiser l'AudioContext
    if (typeof window !== 'undefined' && window.AudioContext) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  // Utilitaire pour jouer un fichier audio
  const playAudioFile = (src) => {
    if (typeof window !== 'undefined') {
      const audio = new window.Audio(src);
      audio.play();
    }
  };

  // Son de succès
  const playSuccess = () => {
    if (!audioContext.current) return;
    // Son synthétique
    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    oscillator.frequency.setValueAtTime(800, audioContext.current.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.current.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(1200, audioContext.current.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.3, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.3);
    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + 0.3);
    // Son mp3
    playAudioFile('/success.mp3');
    // Retour haptique
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Son d'erreur
  const playError = () => {
    if (!audioContext.current) return;
    // Son synthétique
    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    oscillator.frequency.setValueAtTime(400, audioContext.current.currentTime);
    oscillator.frequency.setValueAtTime(300, audioContext.current.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(200, audioContext.current.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.3, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.3);
    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + 0.3);
    // Son mp3
    playAudioFile('/error.mp3');
    // Retour haptique
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // Son de clic
  const playClick = () => {
    if (!audioContext.current) return;

    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);

    oscillator.frequency.setValueAtTime(600, audioContext.current.currentTime);
    oscillator.frequency.setValueAtTime(500, audioContext.current.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.2, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.1);

    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + 0.1);

    // Retour haptique léger
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Son de notification/avertissement
  const playNotification = () => {
    if (!audioContext.current) return;
    // Son synthétique
    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);
    oscillator.frequency.setValueAtTime(1000, audioContext.current.currentTime);
    oscillator.frequency.setValueAtTime(1200, audioContext.current.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(1000, audioContext.current.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.2, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.3);
    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + 0.3);
    // Son mp3
    playAudioFile('/warning.mp3');
    // Retour haptique
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  // Son de scan QR
  const playScan = () => {
    if (!audioContext.current) return;

    const oscillator = audioContext.current.createOscillator();
    const gainNode = audioContext.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.current.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.current.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.current.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(1200, audioContext.current.currentTime + 0.2);
    oscillator.frequency.setValueAtTime(1400, audioContext.current.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.3, audioContext.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 0.4);

    oscillator.start(audioContext.current.currentTime);
    oscillator.stop(audioContext.current.currentTime + 0.4);

    // Retour haptique
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
  };

  return {
    playSuccess,
    playError,
    playClick,
    playNotification,
    playScan
  };
};

// Composant pour les boutons avec effets sonores
export function SoundButton({ 
  children, 
  soundType = 'click',
  onClick,
  soundEnabled = true,
  ...props 
}) {
  const { playClick, playSuccess, playError, playNotification, playScan } = useSoundEffects();

  const handleClick = (e) => {
    if (soundEnabled) {
      switch (soundType) {
        case 'success':
          playSuccess();
          break;
        case 'error':
          playError();
          break;
        case 'notification':
          playNotification();
          break;
        case 'scan':
          playScan();
          break;
        default:
          playClick();
      }
    }

    onClick?.(e);
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

// Hook pour les retours haptiques
export const useHapticFeedback = () => {
  const vibrate = (pattern) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const lightVibration = () => vibrate(10);
  const mediumVibration = () => vibrate(50);
  const heavyVibration = () => vibrate(100);
  const successVibration = () => vibrate([100, 50, 100]);
  const errorVibration = () => vibrate([200, 100, 200]);
  const notificationVibration = () => vibrate([50, 50, 50]);

  return {
    vibrate,
    lightVibration,
    mediumVibration,
    heavyVibration,
    successVibration,
    errorVibration,
    notificationVibration
  };
};

// Composant pour les paramètres audio
export function AudioSettings({ 
  soundEnabled = true, 
  hapticEnabled = true,
  onSoundToggle,
  onHapticToggle 
}) {
  return (
    <div style={{ padding: '1rem' }}>
      <h3>Paramètres audio</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label>
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => onSoundToggle?.(e.target.checked)}
          />
          Effets sonores
        </label>
        <label>
          <input
            type="checkbox"
            checked={hapticEnabled}
            onChange={(e) => onHapticToggle?.(e.target.checked)}
          />
          Retours haptiques
        </label>
      </div>
    </div>
  );
} 