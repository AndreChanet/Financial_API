/**
 * Este script ingresa los precios de los stocks en PostgreSQL solamente para el día actual
 */
require('dotenv').config();

console.log('CARGADOR MANUAL DE CIERRE DIARIO');
console.log('='.repeat(50) + '\n');

// Configura ts-node para poder importar módulos TypeScript
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs'
    }
});

const priceService = require('../src/services/PriceService').default;
const { PrismaClient } = require('@prisma/client');

/**
 * Función principal que carga los precios de cierre diario para todos los stocks de la BDD
 */
async function loadDailyClose() {
    const startTime = Date.now();
    const prisma = new PrismaClient();
    
    try {
        console.log('Obteniendo lista de símbolos de la base de datos...\n');
        
        // Obtiene los símbolos almacenados en la base de datos
        const assets = await prisma.asset.findMany({
            select: { symbol: true, id: true },
            orderBy: { symbol: 'asc' }
        });

        if (assets.length === 0) {
            console.log('No hay símbolos en la base de datos.');
            console.log('Ejecutar primero: npx ts-node load-stocks.js');
            return;
        }

        console.log(`Encontrados ${assets.length} símbolos\n`);
        
        const batchSize = 3;
        let successCount = 0;
        let failCount = 0;
        const failedSymbols = [];

        for (let i = 0; i < assets.length; i += batchSize) {
            const batch = assets.slice(i, i + batchSize);
            
            console.log(`\nLOTE ${Math.floor(i/batchSize) + 1}/${Math.ceil(assets.length/batchSize)}`);
            console.log('-'.repeat(30));
            
            for (const asset of batch) {
                try {
                    console.log(`Procesando: ${asset.symbol}...`);
                    
                    const result = await priceService.getDailyPrices(asset.symbol);
                    
                    if (result && result.regularMarketPrice) {
                        console.log(`     Precio: $${result.regularMarketPrice.toFixed(2)}`);
                        successCount++;
                    } else {
                        console.log(`     Sin datos disponibles`);
                        failCount++;
                        failedSymbols.push(asset.symbol);
                    }
                    
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
                    console.log(`     Error: ${errorMsg}`);
                    failCount++;
                    failedSymbols.push(asset.symbol);
                }
                
                // Pausa para evitar rate limiting de la API
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Pausa más larga entre lotes
            if (i + batchSize < assets.length) {
                console.log(`   Pausa de 2 segundos...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Calcular estadísticas del proceso
        const endTime = Date.now();
        const durationMinutes = ((endTime - startTime) / 60000).toFixed(1);
        
        console.log('\n' + '='.repeat(50));
        console.log('RESUMEN DE CARGA DIARIA');
        console.log('='.repeat(50));
        console.log(`Duración: ${durationMinutes} minutos`);
        console.log(`Exitosos: ${successCount}`);
        console.log(`Fallidos: ${failCount}`);
        console.log(`Total: ${assets.length}`);
        
        if (failedSymbols.length > 0) {
            console.log(`\nSímbolos con error (${failedSymbols.length}):`);
            console.log('   ' + failedSymbols.slice(0, 10).join(', '));
            if (failedSymbols.length > 10) {
                console.log(`   ... y ${failedSymbols.length - 10} más`);
            }
        }
        
        // Verificar los últimos precios registrados
        console.log('\nÚltimos 3 precios registrados:');
        const latestPrices = await prisma.price.findMany({
            take: 3,
            orderBy: {
                date: 'desc'
            },
            include: {
                asset: true
            }
        });
                
        if (latestPrices.length > 0) {
            latestPrices.forEach(p => {
                if (p.date) {
                    const time = p.date.toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                    const dateStr = p.date.toLocaleDateString('es-ES');
                    console.log(`   ${p.asset.symbol}: $${p.close.toFixed(2)} (${dateStr} ${time})`);
                } else {
                    console.log(`   ${p.asset.symbol}: $${p.close.toFixed(2)} (sin fecha)`);
                }
            });
        } else {
            console.log(' No hay precios registrados');
        }
        
        console.log('\nCarga diaria completada');
        console.log('Para automatizar: npm start (ejecuta el scheduler automático)');
        
    } catch (error) {
        console.error('\nERROR GENERAL:', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecuta función principal
loadDailyClose();