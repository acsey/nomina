import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as net from 'net';

export enum DeviceType {
  ZKTECO = 'ZKTECO',
  ANVIZ = 'ANVIZ',
  SUPREMA = 'SUPREMA',
  GENERIC_HTTP = 'GENERIC_HTTP',
  MANUAL = 'MANUAL',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  SYNCING = 'SYNCING',
}

interface DeviceConfig {
  ip?: string;
  port?: number;
  serialNumber?: string;
  communicationKey?: string;
  timezone?: string;
  syncInterval?: number;
}

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.biometricDevice.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const device = await this.prisma.biometricDevice.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo no encontrado');
    }

    return device;
  }

  async create(data: {
    companyId: string;
    name: string;
    deviceType: string;
    connectionMode: string;
    ip?: string;
    port?: number;
    serialNumber?: string;
    location?: string;
    config?: DeviceConfig;
  }) {
    if (data.ip && !this.isValidIP(data.ip)) {
      throw new BadRequestException('Direccion IP invalida');
    }

    return this.prisma.biometricDevice.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        deviceType: data.deviceType,
        connectionMode: data.connectionMode,
        ip: data.ip,
        port: data.port || 4370,
        serialNumber: data.serialNumber,
        location: data.location,
        config: data.config as any,
        status: DeviceStatus.OFFLINE,
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    deviceType?: string;
    connectionMode?: string;
    ip?: string;
    port?: number;
    serialNumber?: string;
    location?: string;
    isActive?: boolean;
    config?: DeviceConfig;
  }) {
    await this.findById(id);

    if (data.ip && !this.isValidIP(data.ip)) {
      throw new BadRequestException('Direccion IP invalida');
    }

    return this.prisma.biometricDevice.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.deviceType && { deviceType: data.deviceType }),
        ...(data.connectionMode && { connectionMode: data.connectionMode }),
        ...(data.ip !== undefined && { ip: data.ip }),
        ...(data.port !== undefined && { port: data.port }),
        ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.config && { config: data.config as any }),
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.biometricDevice.delete({
      where: { id },
    });
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string; latency?: number }> {
    const device = await this.findById(id);

    if (!device.ip) {
      return { success: false, message: 'No se ha configurado la direccion IP del dispositivo' };
    }

    const startTime = Date.now();

    try {
      const connected = await this.pingDevice(device.ip, device.port || 4370);
      const latency = Date.now() - startTime;

      if (connected) {
        await this.prisma.biometricDevice.update({
          where: { id },
          data: {
            status: DeviceStatus.ONLINE,
            lastSyncAt: new Date(),
          },
        });

        return {
          success: true,
          message: `Conexion exitosa con ${device.name}`,
          latency,
        };
      } else {
        await this.prisma.biometricDevice.update({
          where: { id },
          data: { status: DeviceStatus.OFFLINE },
        });

        return { success: false, message: 'No se pudo establecer conexion con el dispositivo' };
      }
    } catch (error: any) {
      await this.prisma.biometricDevice.update({
        where: { id },
        data: { status: DeviceStatus.ERROR },
      });

      return { success: false, message: `Error de conexion: ${error.message}` };
    }
  }

  async syncRecords(id: string): Promise<{
    success: boolean;
    message: string;
    recordsProcessed?: number;
    newRecords?: number;
  }> {
    const device = await this.findById(id);

    if (device.status !== DeviceStatus.ONLINE && device.deviceType !== DeviceType.MANUAL) {
      const connectionTest = await this.testConnection(id);
      if (!connectionTest.success) {
        return { success: false, message: 'Dispositivo no disponible' };
      }
    }

    await this.prisma.biometricDevice.update({
      where: { id },
      data: { status: DeviceStatus.SYNCING },
    });

    try {
      this.logger.log(`Sincronizando registros del dispositivo ${device.name}...`);

      // En implementacion real, aqui se usaria el SDK del dispositivo
      // Para ZKTeco: usar biblioteca zklib
      // Para Anviz: usar SDK de Anviz

      await this.prisma.biometricDevice.update({
        where: { id },
        data: {
          status: DeviceStatus.ONLINE,
          lastSyncAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Sincronizacion completada',
        recordsProcessed: 0,
        newRecords: 0,
      };
    } catch (error: any) {
      await this.prisma.biometricDevice.update({
        where: { id },
        data: { status: DeviceStatus.ERROR },
      });

      this.logger.error(`Error al sincronizar dispositivo ${device.name}: ${error.message}`);
      return { success: false, message: `Error durante sincronizacion: ${error.message}` };
    }
  }

  async receiveAttendanceRecord(data: {
    serialNumber?: string;
    deviceId?: string;
    employeeId?: string;
    employeeNumber?: string;
    timestamp: string;
    type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
    verifyMode?: string;
  }) {
    this.logger.log(`Registro recibido: ${JSON.stringify(data)}`);

    let device = null;
    if (data.deviceId) {
      device = await this.prisma.biometricDevice.findUnique({
        where: { id: data.deviceId },
      });
    } else if (data.serialNumber) {
      device = await this.prisma.biometricDevice.findFirst({
        where: { serialNumber: data.serialNumber },
      });
    }

    if (!device) {
      throw new BadRequestException('Dispositivo no reconocido');
    }

    let employee = null;
    if (data.employeeId) {
      employee = await this.prisma.employee.findUnique({
        where: { id: data.employeeId },
      });
    } else if (data.employeeNumber) {
      employee = await this.prisma.employee.findFirst({
        where: {
          employeeNumber: data.employeeNumber,
          companyId: device.companyId,
        },
      });
    }

    if (!employee) {
      this.logger.warn(`Empleado no encontrado: ${data.employeeNumber || data.employeeId}`);
      throw new BadRequestException('Empleado no encontrado');
    }

    const timestamp = new Date(data.timestamp);
    const dateOnly = new Date(timestamp.toISOString().split('T')[0]);

    let attendanceRecord = await this.prisma.attendanceRecord.findFirst({
      where: {
        employeeId: employee.id,
        date: dateOnly,
      },
    });

    if (!attendanceRecord) {
      attendanceRecord = await this.prisma.attendanceRecord.create({
        data: {
          employeeId: employee.id,
          date: dateOnly,
          status: 'PRESENT',
        },
      });
    }

    const updateData: any = {};
    switch (data.type) {
      case 'CHECK_IN':
        if (!attendanceRecord.checkIn) {
          updateData.checkIn = timestamp;
        }
        break;
      case 'CHECK_OUT':
        updateData.checkOut = timestamp;
        break;
      case 'BREAK_START':
        updateData.breakStart = timestamp;
        break;
      case 'BREAK_END':
        updateData.breakEnd = timestamp;
        break;
    }

    if (attendanceRecord.checkIn && updateData.checkOut) {
      const checkIn = new Date(attendanceRecord.checkIn);
      const checkOut = new Date(updateData.checkOut);
      let hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

      if (attendanceRecord.breakStart && attendanceRecord.breakEnd) {
        const breakStart = new Date(attendanceRecord.breakStart);
        const breakEnd = new Date(attendanceRecord.breakEnd);
        const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
        hoursWorked -= breakHours;
      }

      updateData.hoursWorked = Math.round(hoursWorked * 100) / 100;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.attendanceRecord.update({
        where: { id: attendanceRecord.id },
        data: updateData,
      });
    }

    await this.prisma.biometricLog.create({
      data: {
        deviceId: device.id,
        employeeId: employee.id,
        timestamp,
        eventType: data.type,
        verifyMode: data.verifyMode,
        rawData: data as any,
      },
    });

    return { success: true, message: 'Registro procesado correctamente' };
  }

  async getDeviceLogs(deviceId: string, options?: { startDate?: Date; endDate?: Date; limit?: number }) {
    await this.findById(deviceId);

    return this.prisma.biometricLog.findMany({
      where: {
        deviceId,
        ...(options?.startDate && { timestamp: { gte: options.startDate } }),
        ...(options?.endDate && { timestamp: { lte: options.endDate } }),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 100,
    });
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const parts = ip.split('.').map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  private pingDevice(ip: string, port: number, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }
}
