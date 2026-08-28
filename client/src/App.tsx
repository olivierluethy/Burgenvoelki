import { useUIStore } from '@/state/uiStore';
import { MainMenu } from '@/ui/screens/MainMenu';
import { SetupScreen } from '@/ui/screens/SetupScreen';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { ProfileScreen } from '@/ui/screens/ProfileScreen';
import { CustomizeScreen } from '@/ui/screens/CustomizeScreen';
import { BattlePassScreen } from '@/ui/screens/BattlePassScreen';
import { GameScreen } from '@/game/GameScreen';

export default function App() {
  const screen = useUIStore((s) => s.screen);

  switch (screen) {
    case 'menu':
      return <MainMenu />;
    case 'setup':
      return <SetupScreen />;
    case 'game':
      return <GameScreen />;
    case 'settings':
      return <SettingsScreen />;
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
