# Livebord Paris - Multi gares

Overlay OBS/YouTube moderne (1920x1080), modulaire, avec donnees reelles:

- Meteo: Open-Meteo (sans cle)
- Trains: SNCF/Navitia (token serveur)
- Perturbations: IDFM PRIM (API key serveur)
- Citation: Wikiquote Quote of the Day Parser + ZenQuotes (fallback reseau) + fallback local

Le projet est preconfigure avec plusieurs gares parisiennes (presets `/control`).

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- shadcn/ui
- Framer Motion

## Installation

```bash
npm install
```

## Variables d'environnement

1. Copie `.env.example` vers `.env.local` si besoin.
2. Configure les cles:

```bash
SNCF_API_TOKEN=...
IDFM_PRIM_API_KEY=...
NEXT_PUBLIC_DEFAULT_CITY=Paris
NEXT_PUBLIC_DEFAULT_STATION=Gare Montparnasse
NEXT_PUBLIC_TICKER_DEFAULT=...
```

### Obtenir les cles

- SNCF/Navitia token: https://api.sncf.com (compte developpeur)
- IDFM PRIM key: portail PRIM IDFM (produit "Messages Info Trafic - requete globale")

> Si une cle est absente/invalide, l'UI affiche `CONFIG REQUISE` (pas de mock).

## Lancer en local

```bash
npm run dev
```

- Overlay principal: http://localhost:3000/
- Panneau de controle: http://localhost:3000/control

## Raccourcis BAT (Windows)

Depuis le dossier `project-1`:

- `run-dev-server.bat`: lance le serveur Next.js sur `127.0.0.1:3000`
- `open-overlay-full.bat`: ouvre l'overlay full dans le navigateur
- `open-overlay-lowerthird.bat`: ouvre l'overlay lower third
- `open-control.bat`: ouvre le panel `/control`
- `start-liveboard.bat`: lance le serveur (si besoin), attend qu'il reponde, puis ouvre l'overlay full

## URLs OBS Browser Source

- Full dashboard:

```text
http://localhost:3000/?layout=full
```

- Full + fond transparent:

```text
http://localhost:3000/?layout=full&transparent=1
```

- Lower third:

```text
http://localhost:3000/?layout=lowerthird
```

- Lower third + safe mode:

```text
http://localhost:3000/?layout=lowerthird&safe=1
```

- English (infrastructure prete):

```text
http://localhost:3000/?layout=full&lang=en
```

## Comportement runtime

- Refresh client toutes les 120s (`useLiveData`).
- Route handlers Next.js avec cache/revalidate:
  - `/api/weather` -> `revalidate=120`
  - `/api/trains/departures` -> `revalidate=120`
  - `/api/trains/arrivals` -> `revalidate=120`
  - `/api/disruptions` -> `revalidate=120`
  - `/api/quote-of-the-day` -> `revalidate=120`
- Le client n'appelle jamais SNCF/IDFM directement.

## API internes

- `GET /api/weather?stationKey=paris-montparnasse`
- `GET /api/trains/departures?stationKey=paris-montparnasse`
- `GET /api/trains/arrivals?stationKey=paris-montparnasse`
- `GET /api/disruptions?stationKey=paris-montparnasse`
- `GET /api/quote-of-the-day`

Exemples de `stationKey`:
- `paris-montparnasse`
- `paris-montparnasse-vaugirard`
- `paris-nord`
- `paris-est`
- `paris-gare-de-lyon`
- `paris-austerlitz`
- `paris-saint-lazare`
- `la-defense`
- `paris-bercy-bourgogne-auvergne`
- `villepreux-les-clayes`

## Control panel (`/control`)

Le panneau permet:

- modifier le ticker
- activer/desactiver les modules
- choisir la station preset
- preparer l'URL OBS (`layout`, `lang`, `transparent`, `safe`)

La config est en `localStorage` (`liveboard-config-v1`) avec fallback sur les defaults serveur/public env.

### Presets Paris disponibles

- Paris - Gare Montparnasse
- Paris - Montparnasse Hall 3 Vaugirard
- Paris - Gare du Nord
- Paris - Gare de l'Est
- Paris - Gare de Lyon
- Paris - Gare d'Austerlitz
- Paris - Saint-Lazare
- Puteaux - La Defense
- Paris - Bercy Bourgogne - Pays d'Auvergne
- Les Clayes-sous-Bois - Villepreux - Les Clayes

## Comportements UI importants

- Le widget **Meteo** suit la gare selectionnee (coordonnees de la station preset).
- La **Phrase du jour** suit `lang` (`fr` traduit automatiquement si source anglaise, `en` en original).
- Le widget **Perturbations** affiche uniquement les trains **en retard** presents dans les tableaux visibles.
- Le widget **Perturbations** est limite a **9 lignes** maximum.
- En layout `full`, les tableaux trains affichent jusqu'a **9 departs** et **9 arrivees**.
- Le mode dev masque les overlays/indicateurs Next.js/Turbopack pour garder une capture OBS propre.

## Changer gare/ville plus tard

1. Ajouter une entree dans `lib/config/liveboard.ts` dans `STATIONS`.
2. Renseigner:
   - `displayName`
   - `coordinates` (meteo)
   - `sncfStopAreaId` (trains)
   - `disruptionsKeywords` (filtrage IDFM)
3. Le preset sera disponible automatiquement dans `/control`.

## Qualite et commandes utiles

```bash
npm run lint
npm run typecheck
npm run format
npm run format:write
```
