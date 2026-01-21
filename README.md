#   API de Datos Financieros
API para extracción, procesamiento y almacenamiento de datos financieros (STOCKS) históricos y en tiempo real.


## Características 
- Extracción automática de datos de Yahoo Finance API y carga en BDD.

- Scheduler programado para cierre diario de mercado (Lunes-Viernes 4:30 PM EST)

- Scripts de administración para carga masiva y manual


## Endpoints de la API
```text
GET  /                   # Información general de la API
GET  /api/stats          # Estadísticas de la base de datos
GET  /api/scheduler/status # Estado del scheduler
GET  /api/health         # Health check del sistema
```

## Tecnologías Utilizadas

### Entorno de ejecución, Frameworks y Lenguaje
```text
Node.js v24.12.0 (Entorno de ejecución JavaScript)
TypeScript v5.9.3 (Lenguaje de programación)
npm v11.6.2 (gestor de paquetes)
ts-node v10.9.2 (Ejecutor: permite ejecutar archivos TypeScript directamente)
Express v5.0.6 (Framework)
```

### Capa de Datos
```text
PostgreSQL v9.11 (Base de datos)
Prisma v4.16.2 (ORM: Permite interactuar con BDD mediante TypeScript)
Yahoo Finance API (API de Yahoo, fuente externa de datos)
```

### Lógica y Automatización
```text
node-cron v3.0.11 (Programación de tareas automáticas)
Axios v0.9.36 (Cliente HTTP para realizar peticiones a la API)
```


## Instalación

### 1. Clonar repositorio y acceder al proyecto
git clone https://github.com/tu-usuario/financial-api.git
cd financial-api

### 2. Instalar dependencias Node.js
npm install

### 3. Configurar base de datos
cp .env.example .env
### Editar .env con tus credenciales de PostgreSQL

### 4. Sincronizar esquema primsma con la BDD
npx prisma generate
npx prisma migrate dev --name init

### 5. Cargar los datos iniciales de base de datos (opcional)
npx ts-node scripts/load-stocks.js


## Estructura del Proyecto
```text
financial-api/
├── src/
│   ├── services/
│   │   ├── PriceService.ts      # Extrae y transforma los datos
│   │   └── SchedulerService.ts  # Gestióna tareas programadas automáticas
│   └── index.ts                 # Define endpoints, inicia servidor HTTP y el scheduler.
├── scripts/
│   ├── load-stocks.js           # Carga masiva de datos históricos (contiene STOCKS a cargar)
│   └── load-daily-close.js      # Carga manual de datos del cierre diario (contiene STOCKS a cargar)
├── prisma/
│   └── schema.prisma            # Esquema de base de datos
├── .env.example                 # Variables de entorno de ejemplo
├── package.json                 # Dependencias y scripts
└── tsconfig.json                # Configuración TypeScript
```