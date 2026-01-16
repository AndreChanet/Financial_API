/**
 * Servicio que programa y ejecuta tareas periódicas:
 * - Cierre diario de mercado: extrae e ingresa los precios para los assets.
 * - Health check: revisa la data para validar su futuro ingreso.
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import PriceService from './PriceService';

export class SchedulerService {
    private prisma: PrismaClient;
    private isRunning: boolean = false;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Inicia las tareas programadas automáticamente (se ejecuta al iniciar el servidor y corre en segundo plano)
     */
    public start(): void {
        if (this.isRunning) {
            console.warn('Scheduler está en ejecución');
            return;
        }

        console.log('Iniciando Scheduler de tareas programadas...');
        console.log('');

        // Tarea 1: Cierre diario de mercado (Lunes a Viernes, 9:30 PM UTC = 4:30 PM EST)
        cron.schedule('30 21 * * 1-5', async () => {
            console.log('EJECUTANDO: Cierre diario de mercado');
            console.log('Hora UTC:', new Date().toISOString());
            console.log('Hora local:', new Date().toLocaleString());
            
            try {
                await this.executeDailyClose();
                console.log('Cierre diario completado');
                console.log('');
            } catch (error) {
                console.error('Error en cierre diario:', error instanceof Error ? error.message : 'Error desconocido');
            }
        });

        console.log('Cierre diario programado: Lunes-Viernes 9:30 PM UTC (4:30 PM EST)');

        // Tarea 2: Health check
        cron.schedule('0 * * * *', async () => {
            try {
                const assetCount = await this.prisma.asset.count();
                const priceCount = await this.prisma.price.count();
                console.log(`Health Check - Assets: ${assetCount}, Precios: ${priceCount}`);
            } catch (error) {
                console.error('Health check falló:', error instanceof Error ? error.message : 'Error desconocido');
            }
        });

        console.log('Health check programado: Cada hora en punto');

        this.isRunning = true;
        console.log('');
        console.log('Scheduler iniciado correctamente');
        this.printSchedule();
    }

    /**
     * Ejecuta la lógica de cierre diario para los símbolos en la base de datos
     * Obtiene los precios actuales y los almacena en PostgreSQL
     */
    private async executeDailyClose(): Promise<void> {
        try {

            const assets = await this.prisma.asset.findMany({
                select: { symbol: true }
            });

            if (assets.length === 0) {
                console.log('No hay assets en la base de datos');
                return;
            }

            const symbols = assets.map(a => a.symbol);
            console.log(`Procesando ${symbols.length} símbolos: ${symbols.join(', ')}`);

            let processed = 0;
            let failed = 0;

            for (const symbol of symbols) {
                try {
                    const result = await PriceService.getDailyPrices(symbol);
                    console.log(`${symbol}: $${result.regularMarketPrice}`);
                    processed++;
                } catch (error) {
                    console.log(`${symbol}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
                    failed++;
                }
                
                // Pausa para evitar rate limiting de Yahoo Finance API
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`Resumen: ${processed} exitosos, ${failed} fallidos`);

        } catch (error) {
            console.error('Error en executeDailyClose:', error instanceof Error ? error.message : 'Error desconocido');
        }
    }

    /**
     * Muestra un resumen claro de la programación de tareas
     */
    private printSchedule(): void {
        console.log('');
        console.log('RESUMEN DE PROGRAMACIÓN:');
        console.log('='.repeat(40));
        console.log('1. Cierre diario:   Lunes-Viernes 9:30 PM UTC');
        console.log('2. Health Check:    Cada hora en punto');
        console.log('='.repeat(40));
        console.log('');
    }

    /**
     * Detiene el scheduler
     */
    public stop(): void {
        this.isRunning = false;
        console.log('Scheduler detenido');
    }

    /**
     * Ejecuta manualmente el cierre diario sin esperar a la programación
     */
    public async runDailyCloseNow(): Promise<void> {
        console.log('Ejecutando cierre diario manualmente...');
        await this.executeDailyClose();
    }
}

// Exportar instancia única
const scheduler = new SchedulerService();
export default scheduler;