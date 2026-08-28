import { useUIStore } from '@/state/uiStore';
import { MainMenu } from '@/ui/screens/MainMenu';
import { SetupScreen } from '@/ui/screens/SetupScreen';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { PlaceholderScreen } from '@/ui/screens/PlaceholderScreen';
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
      return (
        <PlaceholderScreen
          title="Profile"
          note="Your level, stats, badges and cosmetics land in milestone M6."
        />
      );
    case 'customize':
      return (
        <PlaceholderScreen
          title="Customize"
          note="Live character preview and cosmetics land in milestone M6."
        />
      );
    case 'battlepass':
      return (
        <PlaceholderScreen
          title="Battle Pass"
          note="Seasons, rewards and challenges land in milestone M6."
        />
      );
    default:
      return <MainMenu />;
  }
}
