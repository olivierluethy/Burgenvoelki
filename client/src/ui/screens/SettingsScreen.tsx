import { useUIStore } from '@/state/uiStore';
import { Eyebrow, CourtRule, Button, Panel } from '@/ui/primitives';

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="font-ui text-[15px] text-text-hi">{label}</span>
        <span className="num text-sm text-text-mid">{Math.round(value * 100)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--team-blue)]"
      />
    </label>
  );
}

/** Settings overlay: audio, camera, controls (STYLEGUIDE §6.6). */
export function SettingsScreen() {
  const settings = useUIStore((s) => s.settings);
  const setSettings = useUIStore((s) => s.setSettings);
  const close = useUIStore((s) => s.closeOverlay);

  return (
    <div className="arena-backdrop h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[640px] px-6 py-10">
        <button className="eyebrow text-text-mid transition hover:text-text-hi" onClick={close}>
          ← Back
        </button>
        <Eyebrow className="mt-6">Settings</Eyebrow>
        <h1 className="mt-2 font-display text-4xl font-extrabold">Preferences</h1>
        <CourtRule segmented className="mt-4 max-w-[320px]" />

        <div className="mt-8 space-y-6">
          <Panel court>
            <Eyebrow className="mb-4">Audio</Eyebrow>
            <div className="space-y-5">
              <Slider
                label="Master volume"
                value={settings.masterVolume}
                onChange={(v) => setSettings({ masterVolume: v })}
              />
              <Slider
                label="Sound effects"
                value={settings.sfxVolume}
                onChange={(v) => setSettings({ sfxVolume: v })}
              />
            </div>
          </Panel>

          <Panel court>
            <Eyebrow className="mb-4">Camera</Eyebrow>
            <Slider
              label="Camera shake"
              value={settings.cameraShake}
              onChange={(v) => setSettings({ cameraShake: v })}
            />
          </Panel>

          <Panel court>
            <Eyebrow className="mb-4">Controls</Eyebrow>
            <label className="flex items-center justify-between">
              <span className="font-ui text-[15px] text-text-hi">Show control hints in HUD</span>
              <input
                type="checkbox"
                checked={settings.showControlHints}
                onChange={(e) => setSettings({ showControlHints: e.target.checked })}
                className="h-5 w-5 accent-[var(--team-blue)]"
              />
            </label>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-text-mid">
              <ControlRow k="WASD" v="Move" />
              <ControlRow k="Mouse" v="Aim" />
              <ControlRow k="Left click" v="Throw" />
              <ControlRow k="E" v="Pick up / grab" />
              <ControlRow k="Shift" v="Sprint" />
              <ControlRow k="Space" v="Dodge dash" />
              <ControlRow k="Esc" v="Menu" />
            </div>
          </Panel>
        </div>

        <div className="mt-8">
          <Button onClick={close}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function ControlRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2">
      <kbd className="rounded-sm border border-bg-500 bg-bg-700 px-2 py-0.5 font-data text-xs text-text-hi">
        {k}
      </kbd>
      <span>{v}</span>
    </div>
  );
}
