import express from 'express';
import scheduler from './services/SchedulerService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * Ruta principal - Información básica del servicio
 */
app.get('/', (req, res) => {
    res.json({
        service: 'Financial Data API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            base: '/',
            stats: '/api/stats',
            schedulerStatus: '/api/scheduler/status'
        }
    });
});

/**
 * Endpoint de estadísticas - Información sobre los datos almacenados
 */
app.get('/api/stats', async (req, res) => {
    try {
        // Importar PrismaClient aquí para evitar dependencia circular
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const assetCount = await prisma.asset.count();
        const priceCount = await prisma.price.count();
        
        await prisma.$disconnect();
        
        res.json({
            success: true,
            data: {
                assets: assetCount,
                prices: priceCount,
                updated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas de la base de datos'
        });
    }
});

/**
 * Endpoint de estado del scheduler - Información sobre tareas programadas
 */
app.get('/api/scheduler/status', (req, res) => {
    res.json({
        success: true,
        data: {
            isRunning: true,
            nextDailyClose: 'Lunes a Viernes, 21:30 UTC',
            nextHealthCheck: 'Cada hora en punto'
        }
    });
});

/**
 * Iniciar el servidor
 */
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    console.log(`Accesible en: http://localhost:${PORT}`);
    
    // Iniciar scheduler automático
    scheduler.start();
    console.log('Scheduler iniciado - Tareas programadas activas');
});