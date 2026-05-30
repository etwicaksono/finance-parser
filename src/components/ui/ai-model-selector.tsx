import React, { useState } from "react";
import { AiProviderType, AiSettingsConfig } from "@/actions/ai-settings";
import { Key, Server, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface AiModelSelectorProps {
  config: AiSettingsConfig;
  onChange: (newConfig: AiSettingsConfig) => void;
  geminiModels: string[];
  swiftrouterModels: string[];
  compact?: boolean;
}

export function AiModelSelector({
  config,
  onChange,
  geminiModels,
  swiftrouterModels,
  compact = false
}: AiModelSelectorProps) {
  const [openCombobox, setOpenCombobox] = useState(false);

  const handleProviderChange = (newProvider: AiProviderType) => {
    let newModel = config.activeModel;
    if (newProvider === "gemini") {
      newModel = geminiModels[0] || "gemini-2.5-flash";
    } else if (newProvider === "swiftrouter") {
      newModel = swiftrouterModels[0] || "google/gemini-2.5-flash";
    }
    onChange({ ...config, provider: newProvider, activeModel: newModel });
  };

  const currentModels = config.provider === "gemini" ? geminiModels : swiftrouterModels;

  return (
    <div className={cn("flex flex-col gap-4", compact ? "sm:flex-row sm:items-end" : "")}>
      <div className={cn("space-y-2", compact ? "flex-1" : "")}>
        <label className="text-sm font-medium leading-none">AI Provider</label>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={config.provider}
          onChange={(e) => handleProviderChange(e.target.value as AiProviderType)}
        >
          <option value="gemini" className="bg-background">Google Gemini</option>
          <option value="swiftrouter" className="bg-background">SwiftRouter</option>
        </select>
      </div>

      <div className={cn("space-y-2", compact ? "flex-1" : "")}>
        <div className="flex items-center gap-2">
          {config.provider === "gemini" ? <Key className="h-4 w-4 text-primary" /> : <Server className="h-4 w-4 text-primary" />}
          <label className="text-sm font-medium">Active Model</label>
        </div>
        <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
          <PopoverTrigger 
            render={
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCombobox}
                className="w-full justify-between font-normal"
              />
            }
          >
            {config.activeModel || "Select model..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Search model..." />
              <CommandList>
                <CommandEmpty>No model found.</CommandEmpty>
                <CommandGroup>
                  {currentModels.map((model) => (
                    <CommandItem
                      key={model}
                      value={model}
                      onSelect={(currentValue) => {
                        onChange({ ...config, activeModel: model });
                        setOpenCombobox(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          config.activeModel === model ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {model}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
