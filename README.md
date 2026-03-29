# Torn Growth Optimizer

Panel privado de crecimiento para [Torn City](https://www.torn.com). Dashboard en tiempo real con optimizador de stats, market scanner, buscador de targets y mucho mas.

## Features

- **Dashboard** - Barras de recursos (energia, nerve, happy, vida), cooldowns, resumen financiero y estrategia de crecimiento
- **Acciones Prioritarias** - Te dice que hacer ahora con links directos a Torn, orden optimo de acciones diarias
- **Gimnasio** - Optimizador de stats con recomendacion de que entrenar segun tus ratios
- **Crimenes** - Tracker de nerve, guia de crimenes por nivel, historial criminal desde la API
- **Viajes** - Monitor de viajes con tabla de destinos y profitabilidad
- **Market Scanner** - Escanea TODO el Item Market automaticamente buscando deals. Calculo con media ponderada real y comision del 5%. Filtros de precio min/max. Alerta sonora en deals buenos
- **Targets** - Buscador de jugadores inactivos (>60 dias) para atacar. Filtra por nivel, muestra solo los que estan disponibles (no hospital/jail). Link directo para atacar
- **Stats** - Estadisticas lifetime (ataques, defensas, crimenes, drogas, viajes, bounties, etc.)
- **Checklist Diaria** - Lista de tareas diarias con persistencia y auto-reset cada dia

## Extras

- API key persistida en localStorage (no hay que ponerla cada vez)
- Notificaciones del navegador + alerta sonora cuando barras llegan al 80%
- Auto-refresh cada 30 segundos
- Tema oscuro cyberpunk

## Instalacion

```bash
git clone https://github.com/adri-gradoli/TornGrowthOptimizer.git
cd TornGrowthOptimizer
npm install
npm run dev
```

Abre http://localhost:5173 e introduce tu API Key de Torn (Settings > API Keys > Public).

## Tech

- React + Vite
- Torn API v1 + v2
- Zero dependencies (solo React)

## Screenshots

![Dashboard](https://img.shields.io/badge/status-active-brightgreen)

---

Hecho con Claude Code
