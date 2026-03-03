"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DisruptionsWidget } from "@/components/overlay/disruptions-widget";
import { HeaderWidget } from "@/components/overlay/header-widget";
import { MarqueeTicker } from "@/components/overlay/marquee-ticker";
import { QuoteWidget } from "@/components/overlay/quote-widget";
import { TrainsWidget } from "@/components/overlay/trains-widget";
import { WeatherWidget } from "@/components/overlay/weather-widget";
import { Badge } from "@/components/ui/badge";
import { buildDefaultClientConfig, MODULE_ORDER, getStationConfig } from "@/lib/config/liveboard";
import { loadClientConfig } from "@/lib/config/client-config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import type { ClientConfig, ModuleKey, OverlayQueryOptions } from "@/lib/types/liveboard";
import { useClock } from "@/hooks/use-clock";
import { useLiveData } from "@/hooks/use-live-data";

const fullLayoutSpec: Record<
  Exclude<ModuleKey, "header" | "ticker">,
  { colStart: number; colSpan: number; rowStart: number; rowSpan?: number }
> = {
  departures: { colStart: 1, colSpan: 6, rowStart: 1 },
  arrivals: { colStart: 7, colSpan: 6, rowStart: 1 },
  weather: { colStart: 1, colSpan: 7, rowStart: 2, rowSpan: 2 },
  disruptions: { colStart: 8, colSpan: 5, rowStart: 2 },
  quote: { colStart: 8, colSpan: 5, rowStart: 3 },
};

interface LiveboardOverlayProps {
  queryOptions: OverlayQueryOptions;
}

function moduleOrderWithoutHeaderAndTicker(
  modules: ModuleKey[],
): Exclude<ModuleKey, "header" | "ticker">[] {
  return modules.filter(
    (module): module is Exclude<ModuleKey, "header" | "ticker"> =>
      module !== "header" && module !== "ticker",
  );
}

export function LiveboardOverlay({ queryOptions }: LiveboardOverlayProps) {
  const [clientConfig, setClientConfig] = useState<ClientConfig>(() =>
    buildDefaultClientConfig(queryOptions.stationKey),
  );
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const loadedConfig = loadClientConfig();

      if (queryOptions.stationKey) {
        const stationFromQuery = getStationConfig(queryOptions.stationKey);
        setClientConfig({
          ...loadedConfig,
          stationKey: stationFromQuery.key,
          city: stationFromQuery.city,
          station: stationFromQuery.station,
        });
      } else {
        setClientConfig(loadedConfig);
      }

      setIsConfigLoaded(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [queryOptions.stationKey]);

  const now = useClock();
  const { bundle, isLoading, isRefreshing } = useLiveData(clientConfig.stationKey, queryOptions.lang);
  const dictionary = getDictionary(queryOptions.lang);
  const station = getStationConfig(clientConfig.stationKey);
  const locale = queryOptions.lang === "en" ? "en-GB" : "fr-FR";

  const enabledModules = useMemo(
    () => MODULE_ORDER.filter((module) => clientConfig.modules[module]),
    [clientConfig.modules],
  );

  const sourceHealth = [
    { label: dictionary.labels.weather, state: bundle.weather?.health },
    { label: dictionary.labels.departures, state: bundle.departures?.health },
    { label: dictionary.labels.disruptions, state: bundle.disruptions?.health },
    { label: dictionary.labels.quote, state: bundle.quote?.health },
  ];

  const title = `${clientConfig.city} – ${clientConfig.station}`;

  const rootClassName = queryOptions.transparent
    ? "bg-transparent"
    : "bg-[radial-gradient(circle_at_20%_20%,rgba(24,56,110,0.35),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(6,86,90,0.25),transparent_40%),linear-gradient(180deg,#020612_0%,#040913_42%,#03070E_100%)]";

  const animateKey = bundle.fetchedAt ?? "initial";
  const compactMode = queryOptions.layout === "full";
  const departuresMaxItems = queryOptions.layout === "full" ? 9 : 5;
  const arrivalsMaxItems = queryOptions.layout === "full" ? 9 : 4;

  const renderModule = (module: Exclude<ModuleKey, "header" | "ticker">) => {
    switch (module) {
      case "weather":
        return (
          <WeatherWidget
            dictionary={dictionary}
            stationLabel={clientConfig.station}
            locale={locale}
            timezone={station.timezone}
            source={bundle.weather}
            safeMode={queryOptions.safeMode}
            compact={compactMode}
          />
        );
      case "departures":
        return (
          <TrainsWidget
            dictionary={dictionary}
            source={bundle.departures}
            title={dictionary.labels.departures}
            endpointLabel={dictionary.labels.to}
            safeMode={queryOptions.safeMode}
            compact={compactMode}
            maxItems={departuresMaxItems}
          />
        );
      case "arrivals":
        return (
          <TrainsWidget
            dictionary={dictionary}
            source={bundle.arrivals}
            title={dictionary.labels.arrivals}
            endpointLabel={dictionary.labels.from}
            safeMode={queryOptions.safeMode}
            compact={compactMode}
            maxItems={arrivalsMaxItems}
          />
        );
      case "disruptions":
        return (
          <DisruptionsWidget
            dictionary={dictionary}
            source={bundle.disruptions}
            departuresSource={bundle.departures}
            arrivalsSource={bundle.arrivals}
            departuresMaxItems={departuresMaxItems}
            arrivalsMaxItems={arrivalsMaxItems}
            safeMode={queryOptions.safeMode}
            compact={compactMode}
            maxLines={9}
          />
        );
      case "quote":
        return (
          <QuoteWidget
            dictionary={dictionary}
            source={bundle.quote}
            safeMode={queryOptions.safeMode}
            compact={compactMode}
          />
        );
      default:
        return null;
    }
  };

  const fullModules = moduleOrderWithoutHeaderAndTicker(enabledModules);
  const lowerThirdModules = fullModules.slice(0, 2);

  return (
    <main className={`h-screen w-full overflow-hidden text-white ${rootClassName}`}>
      <div className="mx-auto flex h-full w-full max-w-[1920px] flex-col gap-3 p-3">
        {enabledModules.includes("header") && (
          <HeaderWidget
            brandTitle={clientConfig.brandTitle}
            title={title}
            now={now}
            updatedAt={bundle.fetchedAt}
            dictionary={dictionary}
            locale={locale}
            timezone={station.timezone}
            sourceHealth={sourceHealth}
            compact={compactMode}
          />
        )}

        {queryOptions.layout === "full" && (
          <motion.section
            key={animateKey}
            initial={{ opacity: 0.92, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="auto-flow-dense grid min-h-0 flex-1 grid-cols-12 gap-3"
            style={{ gridTemplateRows: "1.16fr 0.42fr 0.42fr" }}
          >
            {fullModules.map((module) => (
              <div
                key={module}
                className="min-h-0"
                style={{
                  gridColumn: `${fullLayoutSpec[module].colStart} / span ${fullLayoutSpec[module].colSpan}`,
                  gridRow: `${fullLayoutSpec[module].rowStart} / span ${fullLayoutSpec[module].rowSpan ?? 1}`,
                }}
              >
                {renderModule(module)}
              </div>
            ))}
          </motion.section>
        )}

        {queryOptions.layout === "lowerthird" && (
          <section className="mt-auto flex flex-col gap-3">
            <motion.div
              key={animateKey}
              initial={{ opacity: 0.92, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-12 gap-3"
            >
              {lowerThirdModules.map((module) => (
                <div key={module} className="col-span-6">
                  {renderModule(module)}
                </div>
              ))}
            </motion.div>
          </section>
        )}

        {enabledModules.includes("ticker") && (
          <MarqueeTicker text={clientConfig.tickerText} className="mt-auto" compact={compactMode} />
        )}

        <div className="pointer-events-none absolute right-5 bottom-5 flex items-center gap-2 text-sm text-slate-200">
          <Badge variant="outline" className="border-slate-300/30 bg-slate-900/60 text-slate-200">
            {queryOptions.layout}
          </Badge>
          {isConfigLoaded && isRefreshing && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-2 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              MAJ
            </span>
          )}
          {!isConfigLoaded && (
            <span className="rounded-full bg-slate-900/70 px-2 py-1">Chargement config...</span>
          )}
          {isLoading && isConfigLoaded && (
            <span className="rounded-full bg-slate-900/70 px-2 py-1">Chargement donnees...</span>
          )}
        </div>
      </div>
    </main>
  );
}
