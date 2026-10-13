import { Request, Response } from 'express';
import { prisma } from '../database/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

// Limites recomendados para monitoramento ambiental do armazém
export const IOT_THRESHOLDS = {
  TEMPERATURE: {
    MIN: 18.0,
    MAX: 30.0,
  },
  HUMIDITY: {
    MIN: 40.0,
    MAX: 70.0,
  },
};

const DEFAULT_AREAS = ['Área A', 'Área B', 'Área C'];

/**
 * Listagem do histórico de telemetria IoT simulada
 * Suporta filtros por ?area= e ?limit=
 */
export async function listIoTTelemetry(req: Request, res: Response): Promise<void> {
  try {
    const { area, limit } = req.query;
    const take = limit ? Math.min(Number(limit) || 50, 100) : 50;

    const where: any = {};
    if (area && area !== 'ALL') {
      where.area = { contains: String(area).trim() };
    }

    const readings = await prisma.ioTReading.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take,
    });

    res.json({
      isSimulated: true,
      notice:
        'DADOS SIMULADOS PARA DEMONSTRAÇÃO ACADÊMICA (PIM III) - Telemetria de temperatura e umidade para controle ambiental de armazém.',
      readings,
    });
  } catch (error) {
    console.error('Erro ao listar telemetria IoT:', error);
    res.status(500).json({ message: 'Erro ao carregar telemetria de sensores' });
  }
}

/**
 * Consulta da última leitura registrada em cada uma das 3 áreas (A, B e C)
 */
export async function getLatestTelemetry(_req: Request, res: Response): Promise<void> {
  try {
    const latestByArea: any[] = [];

    for (const area of DEFAULT_AREAS) {
      const reading = await prisma.ioTReading.findFirst({
        where: {
          OR: [{ area }, { area: area.replace('Área ', '') }],
        },
        orderBy: { timestamp: 'desc' },
      });

      if (reading) {
        latestByArea.push(reading);
      } else {
        // Leitura padrão inicial caso ainda não haja registros para a área
        latestByArea.push({
          id: `initial-${area}`,
          area,
          temperature: 22.5,
          humidity: 55.0,
          status: 'NORMAL',
          timestamp: new Date(),
          isSimulated: true,
        });
      }
    }

    // Contagem de alertas ativos nas áreas
    const openAlertsCount = await prisma.alert.count({
      where: {
        module: 'IOT',
        status: 'OPEN',
      },
    });

    res.json({
      latest: latestByArea,
      summary: {
        monitoredAreas: DEFAULT_AREAS.length,
        activeSensors: DEFAULT_AREAS.length * 2, // 1 sensor de temp + 1 de umidade por área
        openAlerts: openAlertsCount,
        thresholds: IOT_THRESHOLDS,
      },
    });
  } catch (error) {
    console.error('Erro ao obter últimas leituras IoT:', error);
    res.status(500).json({ message: 'Erro ao carregar última leitura das áreas' });
  }
}

/**
 * Geração / Simulação de novas leituras de telemetria
 * Avalia automaticamente os limites e dispara alertas com regra anti-duplicação
 */
export async function simulateIoTTelemetry(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const userName = req.user?.name || 'Operador';
    
    // Suporta { readings: [...] }, { area, temperature, humidity } ou chamada sem parâmetros
    const normalizeArea = (a?: string) => {
      if (!a) return 'Área A';
      const stripped = a.trim().replace(/^(?:[aá]rea\s+)+/i, '').trim();
      return `Área ${stripped || 'A'}`;
    };

    let itemsToSimulate: Array<{ area: string; temperature?: number; humidity?: number }> = [];

    if (Array.isArray(req.body?.readings) && req.body.readings.length > 0) {
      itemsToSimulate = req.body.readings.map((r: any) => ({
        area: normalizeArea(r.area),
        temperature: r.temperature !== undefined ? Number(r.temperature) : undefined,
        humidity: r.humidity !== undefined ? Number(r.humidity) : undefined,
      }));
    } else if (req.body?.area) {
      itemsToSimulate = [{
        area: normalizeArea(req.body.area),
        temperature: req.body.temperature !== undefined ? Number(req.body.temperature) : undefined,
        humidity: req.body.humidity !== undefined ? Number(req.body.humidity) : undefined,
      }];
    } else {
      itemsToSimulate = DEFAULT_AREAS.map((a) => ({
        area: a,
        temperature: req.body?.temperature !== undefined ? Number(req.body.temperature) : undefined,
        humidity: req.body?.humidity !== undefined ? Number(req.body.humidity) : undefined,
      }));
    }

    const createdReadings: any[] = [];
    const createdAlerts: any[] = [];

    for (const item of itemsToSimulate) {
      const currentArea = item.area;
      // Definir temperatura e umidade (permite valores explícitos no payload para testes ou gera variação natural)
      let temp: number;
      let humid: number;

      if (item.temperature !== undefined && !isNaN(item.temperature)) {
        temp = item.temperature;
      } else {
        // Variação suave em torno de valores normais
        const baseTemp = currentArea.includes('A') ? 22.0 : currentArea.includes('B') ? 24.0 : 26.5;
        const deltaTemp = (Math.random() - 0.5) * 2.0; // +/- 1 °C
        temp = Number((baseTemp + deltaTemp).toFixed(1));
      }

      if (item.humidity !== undefined && !isNaN(item.humidity)) {
        humid = item.humidity;
      } else {
        const baseHumid = 55.0;
        const deltaHumid = (Math.random() - 0.5) * 8.0; // +/- 4%
        humid = Number((baseHumid + deltaHumid).toFixed(1));
      }

      // Avaliação de limites
      const isTempOutOfRange =
        temp < IOT_THRESHOLDS.TEMPERATURE.MIN || temp > IOT_THRESHOLDS.TEMPERATURE.MAX;
      const isHumidOutOfRange =
        humid < IOT_THRESHOLDS.HUMIDITY.MIN || humid > IOT_THRESHOLDS.HUMIDITY.MAX;

      let readingStatus = 'NORMAL';
      if (isTempOutOfRange && isHumidOutOfRange) {
        readingStatus = 'CRITICAL';
      } else if (isTempOutOfRange || isHumidOutOfRange) {
        readingStatus = 'WARNING';
      }

      // 1. Salvar leitura no banco
      const reading = await prisma.ioTReading.create({
        data: {
          area: currentArea,
          temperature: temp,
          humidity: humid,
          status: readingStatus,
          isSimulated: true,
          timestamp: new Date(),
        },
      });
      createdReadings.push(reading);

      // 2. Avaliar Alerta de Temperatura (com REGRA ANTI-DUPLICAÇÃO)
      if (isTempOutOfRange) {
        const existingOpenTempAlert = await prisma.alert.findFirst({
          where: {
            area: currentArea,
            type: 'TEMPERATURA',
            status: 'OPEN',
            module: 'IOT',
          },
        });

        if (!existingOpenTempAlert) {
          const limitBreached =
            temp > IOT_THRESHOLDS.TEMPERATURE.MAX
              ? IOT_THRESHOLDS.TEMPERATURE.MAX
              : IOT_THRESHOLDS.TEMPERATURE.MIN;
          const direction = temp > IOT_THRESHOLDS.TEMPERATURE.MAX ? 'acima' : 'abaixo';

          const newAlert = await prisma.alert.create({
            data: {
              title: `Temperatura ${direction} do limite na ${currentArea}`,
              message: `Temperatura detectada: ${temp.toFixed(1)} °C (Limite: ${limitBreached.toFixed(
                1
              )} °C)`,
              severity: temp > 35 || temp < 15 ? 'CRITICAL' : 'HIGH',
              module: 'IOT',
              area: currentArea,
              type: 'TEMPERATURA',
              detectedValue: temp,
              limitValue: limitBreached,
              status: 'OPEN',
              resolved: false,
            },
          });
          createdAlerts.push(newAlert);
        }
      }

      // 3. Avaliar Alerta de Umidade (com REGRA ANTI-DUPLICAÇÃO)
      if (isHumidOutOfRange) {
        const existingOpenHumidAlert = await prisma.alert.findFirst({
          where: {
            area: currentArea,
            type: 'UMIDADE',
            status: 'OPEN',
            module: 'IOT',
          },
        });

        if (!existingOpenHumidAlert) {
          const limitBreached =
            humid > IOT_THRESHOLDS.HUMIDITY.MAX
              ? IOT_THRESHOLDS.HUMIDITY.MAX
              : IOT_THRESHOLDS.HUMIDITY.MIN;
          const direction = humid > IOT_THRESHOLDS.HUMIDITY.MAX ? 'acima' : 'abaixo';

          const newAlert = await prisma.alert.create({
            data: {
              title: `Umidade ${direction} do limite na ${currentArea}`,
              message: `Umidade detectada: ${humid.toFixed(1)}% (Limite: ${limitBreached.toFixed(1)}%)`,
              severity: humid > 80 || humid < 30 ? 'CRITICAL' : 'MEDIUM',
              module: 'IOT',
              area: currentArea,
              type: 'UMIDADE',
              detectedValue: humid,
              limitValue: limitBreached,
              status: 'OPEN',
              resolved: false,
            },
          });
          createdAlerts.push(newAlert);
        }
      }
    }

    // Registrar no AuditLog
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'IOT_SIMULATE',
        module: 'IOT',
        description: `Geração de telemetria simulada para ${itemsToSimulate.map((i) => i.area).join(', ')} por ${userName}. ${createdAlerts.length} novo(s) alerta(s) gerado(s).`,
      },
    });

    res.status(201).json({
      message: 'Leitura de telemetria registrada com sucesso!',
      readings: createdReadings,
      alertsCreated: createdAlerts,
    });
  } catch (error) {
    console.error('Erro ao simular telemetria IoT:', error);
    res.status(500).json({ message: 'Erro interno ao registrar telemetria simulada' });
  }
}

/**
 * Listagem de alertas com filtros (status: OPEN | RESOLVED, area, type)
 */
export async function listAlerts(req: Request, res: Response): Promise<void> {
  try {
    const { status, area, type } = req.query;

    const where: any = { module: 'IOT' };
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (area && area !== 'ALL') {
      where.area = { contains: String(area).trim() };
    }
    if (type && type !== 'ALL') {
      where.type = String(type);
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ alerts });
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ message: 'Erro ao listar alertas operacionais' });
  }
}

/**
 * Resolução de Alerta (Transição de status para RESOLVED)
 * Restrito a ADMIN, GERENTE e OPERADOR
 */
export async function resolveAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userName = req.user?.name || 'Operador';

    const alert = await prisma.alert.findUnique({
      where: { id },
    });

    if (!alert) {
      res.status(404).json({ message: 'Alerta não encontrado' });
      return;
    }

    if (alert.status === 'RESOLVED') {
      res.status(200).json({
        message: 'Este alerta já se encontra resolvido.',
        alert,
      });
      return;
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userName,
        resolvedUserId: userId,
      },
    });

    // Gravar auditoria
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ALERT_RESOLVE',
        module: 'IOT',
        description: `Alerta "${alert.title}" na ${alert.area || 'área'} resolvido por ${userName}.`,
      },
    });

    res.json({
      message: 'Alerta resolvido com sucesso!',
      alert: updated,
    });
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    res.status(500).json({ message: 'Erro interno ao resolver alerta' });
  }
}
