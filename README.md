# API de Datos Financieros

API para extracción, procesamiento y almacenamiento de datos financieros históricos y en tiempo real.



## Características

* Extracción automática de datos de Yahoo Finance API y carga en BDD.
* Scheduler programado para cierre diario de mercado (Lunes-Viernes 4:30 PM EST)
* Scripts de administración para carga masiva y manual



## Tecnologías Utilizadas

* Backend: Node.js, TypeScript, Express
* Base de datos: PostgreSQL, Prisma ORM
* Scheduling: node-cron
* APIs externas: Yahoo Finance API
* Herramientas: Axios, ts-node



## Estructura del Proyecto

```text

financial-api/

├── src/

│   ├── services/

│   │   ├── PriceService.ts        # Lógica de extracción y transformación de datos

│   │   └── SchedulerService.ts    # Gestión de tareas programadas automáticas

│   └── index.ts                   # Punto de entrada de la API

├── scripts/

│   ├── load-stocks.js             # Carga masiva de datos históricos

│   └── load-daily-close.js        # Carga manual de cierre diario

├── prisma/

│   └── schema.prisma              # Esquema de base de datos

├── .env.example                   # Variables de entorno de ejemplo

├── package.json                   # Dependencias y scripts

└── tsconfig.json                  # Configuración TypeScript



## Instalación

# 1\. Clonar repositorio

git clone https://github.com/tu-usuario/financial-api.git
cd financial-api

# 2\. Instalar dependencias

npm install

# 3\. Configurar base de datos

cp .env.example .env

# Editar .env con tus credenciales de PostgreSQL

# 4\. Configurar base de datos

npx prisma generate
npx prisma migrate dev --name init

# 5\. Cargar datos iniciales (opcional)

npx ts-node scripts/load-stocks.js



## Endpoints de la API

GET  /                   # Información del API
GET  /api/stats          # Estadísticas de la base de datos
GET  /api/scheduler/status # Estado del scheduler
GET  /api/health         # Health check del sistema

