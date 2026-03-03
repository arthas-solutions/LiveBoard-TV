# LiveBoard-TV

Overlay TV/OBS modulaire en `1920x1080`, developpe par **Arthas Solutions**.

LiveBoard-TV agrege des donnees reelles (meteo, trains, perturbations, citation) pour produire un habillage d'ecran clair, lisible et pilotable en direct.

## Pourquoi ce projet

- Offrir une base overlay professionnelle reutilisable pour un plateau TV, un stream OBS ou un affichage gare/evenement.
- Centraliser les donnees externes cote serveur pour proteger les secrets API.
- Permettre un controle temps reel via un panneau dedie (`/control`) sans toucher au code.

## Fonctionnalites

- Meteo via Open-Meteo (sans cle API).
- Departs/arrivees via SNCF/Navitia (token serveur).
- Perturbations via IDFM PRIM (cle serveur).
- Citation du jour via Wikiquote + ZenQuotes + fallback local.
- 2 layouts overlay: `full` et `lowerthird`.
- Modes transparence, safe area et internationalisation (`lang=en`).

## Stack technique

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- shadcn/ui
- Framer Motion

## Demarrage rapide

```bash
npm install
cp .env.example .env.local
npm run dev
```

Points d'acces locaux:

- Overlay principal: `http://localhost:3000/`
- Panneau de controle: `http://localhost:3000/control`

## Variables d'environnement

Template `.env.local`:

```bash
SNCF_API_TOKEN=
IDFM_PRIM_API_KEY=
NEXT_PUBLIC_DEFAULT_CITY=Paris
NEXT_PUBLIC_DEFAULT_STATION=Gare Montparnasse
NEXT_PUBLIC_TICKER_DEFAULT=Bienvenue a la Gare Montparnasse. Informations en temps reel mises a jour chaque minute.
NEXT_PUBLIC_DEFAULT_BRAND_TITLE=LiveBoard Paris
```

Si une cle est absente ou invalide, l'interface affiche `CONFIG REQUISE`.

## Usage OBS (Browser Source)

- `http://localhost:3000/?layout=full`
- `http://localhost:3000/?layout=full&transparent=1`
- `http://localhost:3000/?layout=lowerthird`
- `http://localhost:3000/?layout=lowerthird&safe=1`
- `http://localhost:3000/?layout=full&lang=en`

## API internes

- `GET /api/weather?stationKey=paris-montparnasse`
- `GET /api/trains/departures?stationKey=paris-montparnasse`
- `GET /api/trains/arrivals?stationKey=paris-montparnasse`
- `GET /api/disruptions?stationKey=paris-montparnasse`
- `GET /api/quote-of-the-day`

Le front n'appelle jamais directement SNCF ou IDFM: les appels externes transitent par les routes API serveur.

## Presets gares disponibles

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

## Ajouter une gare

1. Ajouter une entree dans `lib/config/liveboard.ts` (`STATIONS`).
2. Renseigner `displayName`, `coordinates`, `sncfStopAreaId`, `disruptionsKeywords`.
3. Le preset devient automatiquement disponible dans `/control`.

## Raccourcis Windows

- `run-dev-server.bat`: demarre Next.js sur `127.0.0.1:3000`
- `open-overlay-full.bat`: ouvre l'overlay full
- `open-overlay-lowerthird.bat`: ouvre l'overlay lower third
- `open-control.bat`: ouvre `/control`
- `start-liveboard.bat`: demarre (si besoin), attend la disponibilite, puis ouvre l'overlay

## Qualite et securite

- Ne jamais versionner `.env.local` ou une cle reelle.
- Le repo ignore les `.env*` et versionne uniquement `.env.example`.
- En cas de doute sur une fuite, regenerer immediatement les credentials SNCF et IDFM.
- Eviter de publier des exports debug contenant des donnees sensibles.

## Commandes utiles

```bash
npm run lint
npm run typecheck
npm run format
npm run format:write
```

## Licence

Copyright (c) 2026 Arthas Solutions. Tous droits reserves.

Ce depot est publie uniquement a des fins de demonstration et de portfolio.
Aucune autorisation d'utilisation, de copie, de modification, de redistribution ou d'exploitation commerciale n'est accordee sans autorisation ecrite prealable d'Arthas Solutions.

Toute utilisation commerciale necessite un accord ecrit distinct.
Voir le fichier `LICENSE`.
Contact: `contact@arthas.fr` - Site: `https://arthas.fr`

## Arthas Solutions

Ce projet est un exemple de realisation **Arthas Solutions** pour des experiences data-driven en diffusion video.
Arthas Solutions accompagne les particuliers, TPE et PME avec une approche simple, concrete et orientee resultats.

Contact entreprise: `contact@arthas.fr` - `https://arthas.fr`
