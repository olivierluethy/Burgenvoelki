import { lazy, Suspense } from 'react';
import { useUIStore } from '@/state/uiStore';
import { MainMenu } from '@/ui/screens/MainMenu';
import { SetupScreen } from '@/ui/screens/SetupScreen';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { Loader } from '@/ui/components/Loader';
import { ErrorBoundary } from '@/ui/components/ErrorBoundary';

// Heavy screens (Three.js / Rapier / R3F) are code-split so the menu loads fast.
const GameScreen = lazy(() => import('@/game/GameScreen').then((m) => ({ default: m.GameScreen })));
const ProfileScreen = lazy(() =>
  import('@/ui/screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
);
const CustomizeScreen = lazy(() =>
  import('@/ui/screens/CustomizeScreen').then((m) => ({ default: m.CustomizeScreen })),
);
const BattlePassScreen = lazy(() =>
  import('@/ui/screens/BattlePassScreen').then((m) => ({ default: m.BattlePassScreen })),
);

function Screens() {
  const screen = useUIStore((s) => s.screen);

  switch (screen) {
    case 'menu':
      return <MainMenu />;
    case 'setup':
      return <SetupScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'game':
      return <GameScreen />;
    case 'profile':
      return <ProfileScreen />;
    case 'customize':
      return <CustomizeScreen />;
    case 'battlepass':
      return <BattlePassScreen />;
    default:
      return <MainMenu />;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader label="Entering the hall" />}>
        <Screens />
      </Suspense>
    </ErrorBoundary>
  );
}
