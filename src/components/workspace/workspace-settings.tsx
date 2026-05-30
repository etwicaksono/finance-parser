import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { playNotification, SoundTone } from "@/features/audio/notification-sounds";
import { logout } from "@/actions/auth";

export function WorkspaceSettingsDropdown() {
  const { settings, updateSettings, isLoaded } = useWorkspaceSettings();
  const router = useRouter();

  if (!isLoaded) return null;

  const handleTestSound = (tone: SoundTone) => {
    playNotification(tone);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" />
        }
      >
        <Settings className="h-4 w-4" />
        <span className="sr-only">Workspace Settings</span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-6">
          
          {/* Audio Notifications Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Audio Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.audioEnabled}
                  onChange={(e) => updateSettings({ audioEnabled: e.target.checked })}
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {settings.audioEnabled && (
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Select Tone</span>
                <div className="flex flex-col gap-1">
                  {(["success", "chime", "beep"] as SoundTone[]).map((tone) => (
                    <div
                      key={tone}
                      className={`flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors ${
                        settings.audioTone === tone ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        updateSettings({ audioTone: tone });
                        handleTestSound(tone);
                      }}
                    >
                      <span className="capitalize">{tone}</span>
                      {settings.audioTone === tone && <Volume2 className="h-3.5 w-3.5" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar Sesi
            </Button>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}
