import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Web3Provider from '../components/web3/Web3Provider';
import { AppShell } from './components/AppShell';
import { BootSequence } from './components/BootSequence';
import { FXOverlay } from './components/FXOverlay';
import { AdminView } from './views/AdminView';
import { DashboardView } from './views/DashboardView';
import { OnboardingView } from './views/OnboardingView';
import { StatusView } from './views/StatusView';

import './styles/app.css';

export default function App() {
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <Web3Provider>
      <FXOverlay />
      {bootDone ? (
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<DashboardView />} />
              <Route path="onboard" element={<OnboardingView />} />
              <Route path="admin" element={<AdminView />} />
              <Route path="status" element={<StatusView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      ) : (
        <BootSequence onComplete={() => setBootDone(true)} />
      )}
    </Web3Provider>
  );
}
