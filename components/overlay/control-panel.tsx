"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  buildDefaultClientConfig,
  getStationNumberByKey,
  MODULE_ORDER,
  STATIONS,
  getStationConfig,
} from "@/lib/config/liveboard";
import { loadClientConfig, saveClientConfig } from "@/lib/config/client-config";
import type { ClientConfig, LayoutPreset, ModuleKey } from "@/lib/types/liveboard";

const moduleLabels: Record<ModuleKey, string> = {
  header: "Header",
  weather: "Meteo",
  departures: "Departs",
  arrivals: "Arrivees",
  disruptions: "Perturbations",
  quote: "Phrase du jour",
  ticker: "Ticker",
};

export function ControlPanel() {
  const [config, setConfig] = useState<ClientConfig>(() => loadClientConfig());
  const [layout, setLayout] = useState<LayoutPreset>("full");
  const [transparent, setTransparent] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const stationShortcuts = Object.values(STATIONS).map((item, index) => ({
    number: index + 1,
    key: item.key,
    label: item.displayName,
  }));

  const station = getStationConfig(config.stationKey);

  const overlayUrl = useMemo(() => {
    const params = new URLSearchParams({
      layout,
      lang,
    });
    const stationNumber = getStationNumberByKey(config.stationKey);
    if (stationNumber) {
      params.set("station", String(stationNumber));
    }

    if (transparent) {
      params.set("transparent", "1");
    }

    if (safeMode) {
      params.set("safe", "1");
    }

    return `/?${params.toString()}`;
  }, [config.stationKey, lang, layout, safeMode, transparent]);

  const onStationChange = (stationKey: string) => {
    const nextStation = getStationConfig(stationKey);
    setConfig((prev) => ({
      ...prev,
      stationKey,
      city: nextStation.city,
      station: nextStation.station,
    }));
  };

  const onModuleToggle = (module: ModuleKey, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: enabled,
      },
    }));
  };

  const onSave = () => {
    saveClientConfig(config);
    setSavedAt(new Date().toLocaleTimeString("fr-FR"));
  };

  const onReset = () => {
    const defaults = buildDefaultClientConfig();
    setConfig(defaults);
    saveClientConfig(defaults);
    setSavedAt(new Date().toLocaleTimeString("fr-FR"));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#090f1f_0%,#070c16_45%,#060910_100%)] p-6 text-slate-100">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card className="border border-slate-200/15 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-3xl">Liveboard Control</CardTitle>
            <CardDescription className="text-base text-slate-300">
              Configuration locale stockee dans le navigateur. Utilise ce panneau avant
              d&apos;envoyer l&apos;URL vers OBS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Preset layout OBS</Label>
                <Select value={layout} onValueChange={(value) => setLayout(value as LayoutPreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">full</SelectItem>
                    <SelectItem value="lowerthird">lowerthird</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Langue overlay</Label>
                <Select value={lang} onValueChange={(value) => setLang(value as "fr" | "en")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">fr</SelectItem>
                    <SelectItem value="en">en</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Options</Label>
                <div className="space-y-2 rounded-lg border border-slate-200/10 p-3">
                  <label className="flex items-center justify-between text-sm">
                    Transparent
                    <Switch checked={transparent} onCheckedChange={setTransparent} />
                  </label>
                  <label className="flex items-center justify-between text-sm">
                    Safe mode
                    <Switch checked={safeMode} onCheckedChange={setSafeMode} />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm">
              URL OBS: <span className="font-mono">{overlayUrl}</span>
            </div>

            <div className="rounded-lg border border-slate-200/10 bg-slate-900/60 p-3 text-sm">
              <p className="mb-2 text-xs tracking-wide text-slate-300 uppercase">
                Raccourcis station (`?station=`)
              </p>
              <div className="grid gap-1 md:grid-cols-2">
                {stationShortcuts.map((entry) => (
                  <p key={entry.key} className="text-slate-200">
                    <span className="font-mono font-semibold text-cyan-200">{entry.number}</span>{" "}
                    - {entry.label}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="border border-slate-200/15 bg-slate-950/70">
              <CardHeader>
                <CardTitle>Parametres de gare</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Station preset</Label>
                  <Select value={config.stationKey} onValueChange={onStationChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(STATIONS).map((item) => (
                        <SelectItem value={item.key} key={item.key}>
                          {item.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Titre Liveboard</Label>
                  <Input
                    value={config.brandTitle}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, brandTitle: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={config.city}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, city: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gare</Label>
                  <Input
                    value={config.station}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, station: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Ticker texte</Label>
                  <Textarea
                    rows={4}
                    value={config.tickerText}
                    onChange={(event) =>
                      setConfig((prev) => ({ ...prev, tickerText: event.target.value }))
                    }
                  />
                </div>

                <div className="rounded-lg border border-slate-200/10 bg-slate-900/70 p-3 text-sm text-slate-300 md:col-span-2">
                  Coordonnees source meteo: {station.coordinates.latitude},{" "}
                  {station.coordinates.longitude}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <Card className="border border-slate-200/15 bg-slate-950/70">
              <CardHeader>
                <CardTitle>Activer / desactiver modules</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {MODULE_ORDER.map((module) => (
                  <div
                    key={module}
                    className="flex items-center justify-between rounded-lg border border-slate-200/10 px-3 py-2"
                  >
                    <span>{moduleLabels[module]}</span>
                    <Switch
                      checked={config.modules[module]}
                      onCheckedChange={(checked) => onModuleToggle(module, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3">
          <Button onClick={onSave}>Sauvegarder</Button>
          <Button variant="secondary" onClick={onReset}>
            Reinitialiser
          </Button>
          {savedAt && <p className="text-sm text-slate-300">Sauvegarde locale: {savedAt}</p>}
        </div>
      </div>
    </div>
  );
}
