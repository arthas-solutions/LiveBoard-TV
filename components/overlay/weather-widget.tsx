"use client";

import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ModuleShell } from "@/components/overlay/module-shell";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { SourceResponse, WeatherData } from "@/lib/types/liveboard";
import { formatShortTime } from "@/lib/utils/date";

interface WeatherWidgetProps {
  dictionary: Dictionary;
  stationLabel: string;
  locale: string;
  timezone: string;
  source: SourceResponse<WeatherData> | null;
  safeMode?: boolean;
  compact?: boolean;
}

function renderMessage(
  source: SourceResponse<WeatherData> | null,
  dictionary: Dictionary,
  safeMode: boolean,
) {
  if (!source) {
    return dictionary.labels.unavailable;
  }

  if (source.requiresConfig) {
    return dictionary.labels.configRequired;
  }

  if (safeMode) {
    return dictionary.labels.unavailable;
  }

  return source.message ?? dictionary.labels.unavailable;
}

function weatherIconForCode(weatherCode?: number): { Icon: LucideIcon; toneClassName: string } {
  if (weatherCode === 0) {
    return { Icon: Sun, toneClassName: "text-amber-300" };
  }
  if (weatherCode === 1 || weatherCode === 2) {
    return { Icon: CloudSun, toneClassName: "text-amber-200" };
  }
  if (weatherCode === 3) {
    return { Icon: Cloud, toneClassName: "text-slate-300" };
  }
  if (weatherCode === 45 || weatherCode === 48) {
    return { Icon: CloudFog, toneClassName: "text-slate-300" };
  }
  if ([51, 53, 55, 56, 57].includes(weatherCode ?? -1)) {
    return { Icon: CloudDrizzle, toneClassName: "text-sky-300" };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode ?? -1)) {
    return { Icon: CloudRain, toneClassName: "text-blue-300" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode ?? -1)) {
    return { Icon: CloudSnow, toneClassName: "text-cyan-200" };
  }
  if ([95, 96, 99].includes(weatherCode ?? -1)) {
    return { Icon: CloudLightning, toneClassName: "text-amber-300" };
  }

  return { Icon: Cloud, toneClassName: "text-slate-300" };
}

function relativeHourLabel(offsetHours: number, locale: string): string {
  if (locale.startsWith("en")) {
    return offsetHours === 1 ? "In 1 hour" : `In ${offsetHours} hours`;
  }
  return offsetHours === 1 ? "Dans 1 heure" : `Dans ${offsetHours} heures`;
}

export function WeatherWidget({
  dictionary,
  stationLabel,
  locale,
  timezone,
  source,
  safeMode = false,
  compact = false,
}: WeatherWidgetProps) {
  const hasData = source?.data && source.ok;
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: timezone,
  });
  const compactWeek =
    source?.data && source.data.weeklyForecast.length > 0
      ? source.data.weeklyForecast.slice(1, 6).length > 0
        ? source.data.weeklyForecast.slice(1, 6)
        : source.data.weeklyForecast.slice(0, 5)
      : [];
  const nowVisual = source?.data ? weatherIconForCode(source.data.weatherCode) : null;

  return (
    <ModuleShell
      title={`${dictionary.labels.weather} - ${stationLabel}`}
      className="h-full"
      contentClassName="h-full min-h-0"
      rightSlot={<Badge variant="outline">{source?.source ?? "Open-Meteo"}</Badge>}
    >
      {!hasData && (
        <p className="text-base text-slate-200/90">{renderMessage(source, dictionary, safeMode)}</p>
      )}

      {hasData && source.data && (
        <div className="flex h-full min-h-0 flex-col gap-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] items-start gap-2.5">
            <div className="space-y-1.5">
              <div className="flex items-end gap-2.5">
                {nowVisual && (
                  <nowVisual.Icon className={`mb-1 h-10 w-10 ${nowVisual.toneClassName}`} />
                )}
                <div>
                  <p className="text-3xl font-semibold text-white">{source.data.temperature}°C</p>
                  <p className="mt-0.5 text-sm text-slate-200">{source.data.condition}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-200">
                <p className="inline-flex items-center gap-2">
                  <Thermometer className="h-4 w-4" />
                  {dictionary.labels.feelLike}:{" "}
                  {source.data.apparentTemperature ?? source.data.temperature}°C
                </p>
                <p className="inline-flex items-center gap-2">
                  <Wind className="h-4 w-4" />
                  {dictionary.labels.wind}: {source.data.windSpeed} km/h
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {source.data.forecast.map((point) => (
                <div
                  key={point.offsetHours}
                  className="rounded-lg border border-slate-200/10 bg-slate-900/70 px-2.5 py-2"
                >
                  <div className="flex items-center justify-center gap-2">
                    {(() => {
                      const visual = weatherIconForCode(point.weatherCode);
                      return <visual.Icon className={`h-7 w-7 ${visual.toneClassName}`} />;
                    })()}
                    <p className="text-sm leading-tight font-semibold text-slate-100">
                      {relativeHourLabel(point.offsetHours, locale)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-end justify-center gap-2">
                    <span className="text-base leading-none font-bold text-white">
                      {point.temperature}°C
                    </span>
                    <span className="text-xs text-slate-300">
                      {formatShortTime(new Date(point.time), locale, timezone)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 rounded-lg border border-slate-200/10 bg-slate-900/60 p-2.5">
            <p
              className={`${compact ? "mb-2.5 text-sm" : "mb-2 text-xs"} font-semibold tracking-wide text-slate-300 uppercase`}
            >
              {dictionary.labels.weekForecast}
            </p>
            {!compact && (
              <div className="rounded-md border border-slate-200/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/70 text-slate-200">
                    <tr>
                      <th className="px-2 py-1.5">{dictionary.labels.day}</th>
                      <th className="px-2 py-1.5">{dictionary.labels.condition}</th>
                      <th className="px-2 py-1.5 text-right">{dictionary.labels.min}</th>
                      <th className="px-2 py-1.5 text-right">{dictionary.labels.max}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {source.data.weeklyForecast.map((day, index) => (
                      <tr
                        key={`${day.date}-${index}`}
                        className="border-t border-slate-800/80 text-slate-100"
                      >
                        <td className="px-2 py-1.5 capitalize">
                          {weekdayFormatter.format(new Date(`${day.date}T12:00:00`))}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex items-center gap-1.5">
                            {(() => {
                              const visual = weatherIconForCode(day.weatherCode);
                              return <visual.Icon className={`h-5 w-5 ${visual.toneClassName}`} />;
                            })()}
                            {day.condition}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right">{day.temperatureMin}°C</td>
                        <td className="px-2 py-1.5 text-right">{day.temperatureMax}°C</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {compact && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-5 gap-1.5">
                  {compactWeek.map((day, index) => (
                    <div
                      key={`${day.date}-${index}`}
                      className="rounded-md border border-slate-200/10 bg-slate-900/70 px-2 py-1.5"
                    >
                      <div className="flex h-full flex-col justify-start gap-1">
                        <div className="flex w-full items-start justify-between gap-1">
                          <span className="text-base font-bold tracking-wide text-slate-200 uppercase">
                            J+{index + 1}
                          </span>
                          <span className="max-w-[58%] truncate text-base font-semibold text-slate-100 capitalize">
                            {weekdayFormatter.format(new Date(`${day.date}T12:00:00`))}
                          </span>
                        </div>
                        {(() => {
                          const visual = weatherIconForCode(day.weatherCode);
                          return (
                            <visual.Icon className={`mx-auto h-8 w-8 ${visual.toneClassName}`} />
                          );
                        })()}
                        <div className="grid w-full grid-cols-2 gap-1 text-center">
                          <span className="text-xs leading-none font-semibold text-emerald-200">
                            {dictionary.labels.hot} {day.temperatureMax}°
                          </span>
                          <span className="text-xs leading-none font-semibold text-cyan-100">
                            {dictionary.labels.cold} {day.temperatureMin}°
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
