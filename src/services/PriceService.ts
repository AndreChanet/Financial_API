/**
 * Este servicio extrae datos financieros y los almacena en una base de datos.
 * Integraciónes: Yahoo Finance API / almacenamiento en PostgreSQL utilizando Prisma
 */

import axios from 'axios';
import prisma from '../lib/prisma';

// Interfaz para la respuesta de Yahoo Finance API
interface YahooChartResult {
    meta: {
        currency: string;
        symbol: string;
        regularMarketPrice: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        previousClose: number;
        regularMarketTime: number;
    };
    timestamp: number[];
    indicators: {
        quote: Array<{
            open: number[];
            high: number[];
            low: number[];
            close: number[];
            volume: number[];
        }>;
    };
}

interface YahooFinanceResponse {
    chart: {
        result: YahooChartResult[];
        error: any;
    };
}

export interface BulkLoadResult {
    symbol: string;
    records?: number;
    status: 'success' | 'failed';
    error?: string;
}

export interface DateRangeConfig {
    range: string;
    interval: string;
}

/**
 * Servicio principal para extracción y gestión de datos financieros
 * Extrae desde Yahoo Finance API y almacena en PostgreSQL
 */
export class PriceService {
    
    // Configuraciones de rangos soportados por Yahoo Finance
    private readonly dateRangeConfigs: Record<string, DateRangeConfig> = {
        '1d': { range: '1d', interval: '15m' },
        '5d': { range: '5d', interval: '1d' },
        '1mo': { range: '1mo', interval: '1d' },
        '3mo': { range: '3mo', interval: '1d' },
        '6mo': { range: '6mo', interval: '1d' },
        '1y': { range: '1y', interval: '1d' },
        '2y': { range: '2y', interval: '1d' },
        '5y': { range: '5y', interval: '1wk' },
        '10y': { range: '10y', interval: '1mo' },
        'max': { range: 'max', interval: '1mo' }
    };

    /**
     * Obtiene y almacena el precio diario de un símbolo bursátil
     */
    async getDailyPrices(symbol: string): Promise<any> {
        try {
            console.log(`Extrayendo precio diario para: ${symbol}`);
            
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
            const response = await axios.get<YahooFinanceResponse>(url);
            const data = response.data;
            
            if (!data.chart?.result?.[0]) {
                throw new Error(`No se encontraron datos para el símbolo: ${symbol}`);
            }
            
            const result = data.chart.result[0];
            const meta = result.meta;
            
            const priceData = {
                symbol: symbol.toUpperCase(),
                regularMarketPrice: meta.regularMarketPrice,
                regularMarketDayHigh: meta.regularMarketDayHigh,
                regularMarketDayLow: meta.regularMarketDayLow,
                regularMarketVolume: meta.regularMarketVolume,
                previousClose: meta.previousClose,
                regularMarketTime: new Date(meta.regularMarketTime * 1000),
                currency: meta.currency
            };
            
            console.log(`Precio extraído: ${symbol} - $${priceData.regularMarketPrice}`);
            await this.saveDailyPriceToDatabase(priceData);
            
            return priceData;
            
        } catch (error) {
            console.error(`Error extrayendo precio diario para ${symbol}:`, error);
            throw new Error(`Fallo al obtener precio diario para ${symbol}`);
        }
    }

    /**
     * Obtiene precios históricos según el rango especificado
     * @param symbol - Símbolo bursátil (del asset)
     * @param rangeKey - Clave del rango temporal.
     * @returns Array de datos históricos con precios OHLC + volumen
     */
    async getHistoricalPrices(symbol: string, rangeKey: string = '1mo'): Promise<any[]> {
        try {
            const config = this.dateRangeConfigs[rangeKey] || this.dateRangeConfigs['1mo'];
            console.log(`Extrayendo precios históricos para: ${symbol} (rango: ${config.range})`);
            
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${config.range}&interval=${config.interval}`;
            const response = await axios.get<YahooFinanceResponse>(url);
            const data = response.data;
            
            if (!data.chart?.result?.[0]) {
                throw new Error(`No se encontraron datos históricos para el símbolo: ${symbol}`);
            }
            
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const quotes = result.indicators.quote[0];
            
            const historicalData = timestamps
                .map((timestamp: number, index: number) => ({
                    date: new Date(timestamp * 1000),
                    open: quotes.open[index],
                    high: quotes.high[index],
                    low: quotes.low[index],
                    close: quotes.close[index],
                    volume: quotes.volume[index]
                }))
                .filter(item => item.open !== null);
            
            console.log(`${historicalData.length} registros históricos extraídos para: ${symbol}`);
            await this.saveHistoricalPricesToDatabase(symbol, historicalData);
            
            return historicalData;
            
        } catch (error) {
            console.error(`Error extrayendo precios históricos para ${symbol}:`, error);
            throw new Error(`Fallo al obtener precios históricos para ${symbol}`);
        }
    }

    /**
     * Se asegura que un asset exista en la base de datos, y si no existe lo ingresa en la tabla Asset
     */
    public async ensureAssetExists(symbol: string): Promise<any> {
        try {
            const asset = await prisma.asset.upsert({
                where: { symbol: symbol },
                update: {},
                create: {
                    symbol: symbol,
                    name: symbol,
                    type: 'STOCK'
                }
            });
            return asset;
        } catch (error) {
            console.error(`Error gestionando asset ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Guarda el precio diario en la base de datos PostgreSQL
     */
    private async saveDailyPriceToDatabase(priceData: any): Promise<void> {
        try {
            const asset = await this.ensureAssetExists(priceData.symbol);
            
            await prisma.price.create({
                data: {
                    open: priceData.regularMarketPrice,
                    high: priceData.regularMarketDayHigh,
                    low: priceData.regularMarketDayLow,
                    close: priceData.regularMarketPrice,
                    volume: priceData.regularMarketVolume,
                    assetId: asset.id
                }
            });
            
            console.log(`Precio diario guardado en base de datos: ${priceData.symbol}`);
            
        } catch (error) {
            console.error(`Error guardando precio diario para ${priceData.symbol}:`, error);
        }
    }

    /**
     * Guarda precios históricos en la base de datos PostgreSQL
     */
    private async saveHistoricalPricesToDatabase(symbol: string, historicalData: any[]): Promise<void> {
        try {
            const asset = await this.ensureAssetExists(symbol);
            
            if (historicalData.length === 0) {
                console.log(`No hay datos válidos para guardar: ${symbol}`);
                return;
            }
            
            const priceRecords = historicalData.map(data => ({
                date: data.date,
                open: data.open,
                high: data.high,
                low: data.low,
                close: data.close,
                volume: data.volume,
                assetId: asset.id
            }));
            
            await prisma.price.createMany({
                data: priceRecords,
                skipDuplicates: true
            });
            
            console.log(`${priceRecords.length} precios históricos guardados para: ${symbol}`);
            
        } catch (error) {
            console.error(`Error guardando precios históricos para ${symbol}:`, error);
        }
    }

    getAvailableDateRanges(): string[] {
        return Object.keys(this.dateRangeConfigs);
    }

    /**
     * Obtiene la configuración de un rango temporal específico
     * @param rangeKey - Clave del rango
     * @returns Configuración del rango / valor por defecto asignado: '1mo'
     */
    getDateRangeConfig(rangeKey: string): DateRangeConfig {
        return this.dateRangeConfigs[rangeKey] || this.dateRangeConfigs['1mo'];
    }

    /**
     * Carga masiva de datos históricos para múltiples símbolos
     * @param symbols - Array de símbolos a procesar
     * @param range - Rango temporal configurado: '5y'
     * @returns Resultados del proceso por cada símbolo
     */
    async loadBulkHistoricalData(symbols: string[], range: string = '5y'): Promise<BulkLoadResult[]> {
        try {
            console.log(`Iniciando carga masiva para ${symbols.length} símbolos...`);
            
            const results: BulkLoadResult[] = [];
            
            for (const symbol of symbols) {
                try {
                    console.log(`Procesando: ${symbol}...`);
                    
                    const historicalData = await this.getHistoricalPrices(symbol, range);
                    
                    results.push({
                        symbol: symbol,
                        records: historicalData.length,
                        status: 'success'
                    });
                    
                    console.log(`${symbol}: ${historicalData.length} registros cargados`);
                    
                    // Pausa para evitar rate limiting de Yahoo Finance API
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                    console.error(`Error procesando ${symbol}:`, errorMessage);
                    
                    results.push({
                        symbol: symbol,
                        status: 'failed',
                        error: errorMessage
                    });
                }
            }
            
            console.log(`Carga masiva completada. Resumen:`);
            results.forEach(result => {
                console.log(`  ${result.symbol}: ${result.status} ${result.records ? `(${result.records} registros)` : ''}`);
            });
            
            return results;
            
        } catch (error) {
            console.error('Error en carga masiva:', error);
            throw error;
        }
    }
}

// Exporta la instancia única del servicio 
export default new PriceService();
