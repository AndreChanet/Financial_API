/**
 * Este script ingresa los precios de los stocks en PostgreSQL, para el rango de fechas configurado
 */
require('dotenv').config();

console.log('Iniciando carga masiva de stocks...\n');

require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs'
    }
});

const priceService = require('../src/services/PriceService').default;

// Lista de stocks a cargar:
const allStocks = [
    // Tech
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA',
    'AVGO', 'ADBE', 'CRM', 'ORCL', 'CSCO', 'INTC', 'AMD',
    'QCOM', 'IBM', 'TXN', 'NOW', 'INTU', 'UBER',
    
    // Finance
    'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'SCHW',
    'V', 'MA', 'AXP', 'PYPL', 'COIN',
    
    // Healthcare
    'JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'DHR', 'LLY',
    'MRK', 'BMY', 'ABBV', 'GILD', 'CVS', 'CI',
    
    // Consumer & Retail
    'WMT', 'PG', 'KO', 'PEP', 'COST', 'MCD', 'SBUX',
    'NKE', 'TGT', 'HD', 'LOW', 'AMT', 'NEE',
    
    // Industrials & Energy
    'BA', 'CAT', 'GE', 'HON', 'MMM', 'RTX', 'LMT',
    'XOM', 'CVX', 'COP', 'SLB', 'EOG'
];

/**
 * Función principal que carga datos históricos para todos los stocks
 */
async function loadAllStocks() {
    console.log(`Cargando ${allStocks.length} stocks...\n`);
    console.log('Nota: Este proceso puede tomar entre 10 y 40 minutos.\n');
    
    const startTime = Date.now();
    
    try {
        // Paso 1: Crear o verificar todos los assets en la base de datos
        console.log('PASO 1: Creando/verificando assets...');
        
        const batchSize = 10;
        for (let i = 0; i < allStocks.length; i += batchSize) {
            const batch = allStocks.slice(i, i + batchSize);
            
            for (const symbol of batch) {
                try {
                    await priceService.ensureAssetExists(symbol);
                    console.log(`   Creado: ${symbol}`);
                } catch (error) {
                    console.log(`   Error con ${symbol}: ${error.message}`);
                }
            }
            
            if (i + batchSize < allStocks.length) {
                console.log(`   Lote ${Math.floor(i/batchSize) + 1} completado...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // Paso 2: Cargar datos históricos (conigurado: 5 años de datos)
        console.log('\nPASO 2: Cargando datos históricos (5 años)...');
        console.log('   Este paso tomará varios minutos...\n');
        
        const results = [];
        const dataBatchSize = 5; //conigurado: 5 años de datos
        
        for (let i = 0; i < allStocks.length; i += dataBatchSize) {
            const batch = allStocks.slice(i, i + dataBatchSize);
            console.log(`   Lote ${Math.floor(i/dataBatchSize) + 1}/${Math.ceil(allStocks.length/dataBatchSize)}: ${batch.join(', ')}`);
            
            try {
                const batchResults = await priceService.loadBulkHistoricalData(batch, '5y');
                results.push(...batchResults);
                
                batchResults.forEach(result => {
                    console.log(`      ${result.symbol}: ${result.status} (${result.records || 0} registros)`);
                });
                
                // Pausa para evitar rate limiting de la API
                if (i + dataBatchSize < allStocks.length) {
                    console.log(`      Pausa de 3 segundos...\n`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                
            } catch (error) {
                console.error(`      Error en lote: ${error.message}`);
            }
        }
        
        const endTime = Date.now();
        const durationMinutes = ((endTime - startTime) / 60000).toFixed(1);
        
        const successful = results.filter(r => r.status === 'success').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const totalRecords = results.reduce((sum, r) => sum + (r.records || 0), 0);
        
        // Muestra resumen final
        console.log('\n' + '='.repeat(60));
        console.log('RESUMEN FINAL DE CARGA MASIVA');
        console.log('='.repeat(60));
        console.log(`Duración: ${durationMinutes} minutos`);
        console.log(`Stocks procesados: ${allStocks.length}`);
        console.log(`Exitosos: ${successful}`);
        console.log(`Fallidos: ${failed}`);
        console.log(`Total registros: ${totalRecords}`);
        console.log(`Promedio por stock: ${Math.round(totalRecords / successful)} registros`);
        console.log('='.repeat(60));
        
        // Muestra stocks con errores
        const failedStocks = results.filter(r => r.status === 'failed');
        if (failedStocks.length > 0) {
            console.log('\nSTOCKS CON ERRORES:');
            failedStocks.forEach(f => {
                console.log(`   ${f.symbol}: ${f.error}`);
            });
        }
        
        console.log('\nVerificando base de datos final...');
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        const assetCount = await prisma.asset.count();
        const priceCount = await prisma.price.count();
        
        console.log(`Assets en BD: ${assetCount}`);
        console.log(`Precios en BD: ${priceCount}`);
        console.log(`Promedio: ${Math.round(priceCount / assetCount)} precios por asset`);
        
        await prisma.$disconnect();
        
        console.log('\nCARGA MASIVA COMPLETADA');
        
    } catch (error) {
        console.error('\nERROR GENERAL:', error.message);
    }
}

// Ejecuta función principal
loadAllStocks();