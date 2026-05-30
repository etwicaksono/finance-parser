import { useState, useEffect } from "react";
import { SoundTone } from "@/features/audio/notification-sounds";

export interface WorkspaceSettings {
  audioEnabled: boolean;
  audioTone: SoundTone;
}

const DEFAULT_SETTINGS: WorkspaceSettings = {
  audioEnabled: true,
  audioTone: "success",
};

export function useWorkspaceSettings() {
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("workspace-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Map old notification-settings format to new workspace-settings if migrating
        if (parsed.enabled !== undefined && parsed.audioEnabled === undefined) {
          parsed.audioEnabled = parsed.enabled;
          delete parsed.enabled;
        }
        if (parsed.tone !== undefined && parsed.audioTone === undefined) {
          parsed.audioTone = parsed.tone;
          delete parsed.tone;
        }
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error("Failed to parse workspace settings", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = (updates: Partial<WorkspaceSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("workspace-settings", JSON.stringify(next));
      return next;
    });
  };

  return { settings, updateSettings, isLoaded };
}
