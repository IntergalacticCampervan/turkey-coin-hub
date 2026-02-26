import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { BootSequence } from './components/BootSequence';
import { FXOverlay } from './components/FXOverlay';

export default function App() {
  // Start in BOOT state to show boot sequence
  // Change to 'IDLE' to skip boot sequence
  const [systemState, setSystemState] = useState<'BOOT' | 'IDLE'>('BOOT');

  useEffect(() => {
    // Force dark appearance for terminal aesthetic
    document.documentElement.classList.add('dark');
  }, []);

  const handleBootComplete = () => {
    setSystemState('IDLE');
  };

  if (systemState === 'BOOT') {
    return (
      <>
        <FXOverlay />
        <BootSequence onComplete={handleBootComplete} />
      </>
    );
  }

  return (
    <>
      <FXOverlay />
      <RouterProvider router={router} />
    </>
  );
}