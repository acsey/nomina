import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGeofenceDto, UpdateGeofenceDto, AssignGeofenceDto } from './dto';
import { Prisma } from '@prisma/client';

export interface GeofenceValidationResult {
  isInside: boolean;
  distance: number; // metros
  geofenceId: string | null;
  geofenceName: string | null;
  allowOutside: boolean;
  address?: string;
}

@Injectable()
export class GeofenceService {
  constructor(private prisma: PrismaService) {}

  // =============================================
  // CRUD de Geocercas
  // =============================================

  async create(companyId: string, dto: CreateGeofenceDto) {
    // Si es default, desactivar otros defaults
    if (dto.isDefault) {
      await this.prisma.geofence.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.geofence.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        latitude: new Prisma.Decimal(dto.latitude),
        longitude: new Prisma.Decimal(dto.longitude),
        radius: dto.radius,
        type: (dto.type as any) || 'OFFICE',
        address: dto.address,
        isDefault: dto.isDefault || false,
        allowCheckInOutside: dto.allowCheckInOutside || false,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.geofence.findMany({
      where: { companyId, isActive: true },
      include: {
        _count: {
          select: { assignedEmployees: true },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const geofence = await this.prisma.geofence.findUnique({
      where: { id },
      include: {
        assignedEmployees: {
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
        },
      },
    });

    if (!geofence) {
      throw new NotFoundException('Geocerca no encontrada');
    }

    return geofence;
  }

  async update(id: string, dto: UpdateGeofenceDto) {
    const geofence = await this.prisma.geofence.findUnique({ where: { id } });

    if (!geofence) {
      throw new NotFoundException('Geocerca no encontrada');
    }

    // Si se está marcando como default, desactivar otros
    if (dto.isDefault) {
      await this.prisma.geofence.updateMany({
        where: { companyId: geofence.companyId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.geofence.update({
      where: { id },
      data: {
        ...dto,
        latitude: dto.latitude ? new Prisma.Decimal(dto.latitude) : undefined,
        longitude: dto.longitude ? new Prisma.Decimal(dto.longitude) : undefined,
      } as any,
    });
  }

  async delete(id: string) {
    // Soft delete
    return this.prisma.geofence.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // =============================================
  // Asignación de empleados a geocercas
  // =============================================

  async assignEmployee(geofenceId: string, dto: AssignGeofenceDto) {
    const geofence = await this.prisma.geofence.findUnique({
      where: { id: geofenceId },
    });

    if (!geofence) {
      throw new NotFoundException('Geocerca no encontrada');
    }

    // Verificar que el empleado pertenece a la misma empresa
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: dto.employeeId,
        companyId: geofence.companyId,
      },
    });

    if (!employee) {
      throw new BadRequestException('El empleado no pertenece a esta empresa');
    }

    return this.prisma.geofenceEmployee.upsert({
      where: {
        geofenceId_employeeId: {
          geofenceId,
          employeeId: dto.employeeId,
        },
      },
      update: {
        customRadius: dto.customRadius,
        isActive: true,
      },
      create: {
        geofenceId,
        employeeId: dto.employeeId,
        customRadius: dto.customRadius,
      },
    });
  }

  async unassignEmployee(geofenceId: string, employeeId: string) {
    return this.prisma.geofenceEmployee.update({
      where: {
        geofenceId_employeeId: {
          geofenceId,
          employeeId,
        },
      },
      data: { isActive: false },
    });
  }

  async getEmployeeGeofences(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Obtener geocercas asignadas específicamente al empleado
    const assignedGeofences = await this.prisma.geofenceEmployee.findMany({
      where: {
        employeeId,
        isActive: true,
        geofence: { isActive: true },
      },
      include: { geofence: true },
    });

    // Si no tiene asignaciones específicas, usar la geocerca default de la empresa
    if (assignedGeofences.length === 0) {
      const defaultGeofence = await this.prisma.geofence.findFirst({
        where: {
          companyId: employee.companyId,
          isDefault: true,
          isActive: true,
        },
      });

      return defaultGeofence ? [defaultGeofence] : [];
    }

    return assignedGeofences.map((ag) => ({
      ...ag.geofence,
      customRadius: ag.customRadius,
    }));
  }

  // =============================================
  // Validación de ubicación
  // =============================================

  async validateLocation(
    companyId: string,
    employeeId: string,
    latitude: number,
    longitude: number
  ): Promise<GeofenceValidationResult> {
    // Obtener geocercas aplicables al empleado
    const geofences = await this.getApplicableGeofences(companyId, employeeId);

    if (geofences.length === 0) {
      // Sin geocercas configuradas, permitir
      return {
        isInside: true,
        distance: 0,
        geofenceId: null,
        geofenceName: null,
        allowOutside: true,
      };
    }

    // Verificar cada geocerca
    for (const geofence of geofences) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        Number(geofence.latitude),
        Number(geofence.longitude)
      );

      const effectiveRadius = geofence.customRadius || geofence.radius;

      if (distance <= effectiveRadius) {
        return {
          isInside: true,
          distance,
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          allowOutside: geofence.allowCheckInOutside,
          address: geofence.address || undefined,
        };
      }
    }

    // No está dentro de ninguna geocerca
    // Devolver la más cercana
    const closest = this.findClosestGeofence(geofences, latitude, longitude);

    return {
      isInside: false,
      distance: closest.distance,
      geofenceId: closest.geofence.id,
      geofenceName: closest.geofence.name,
      allowOutside: closest.geofence.allowCheckInOutside,
      address: closest.geofence.address || undefined,
    };
  }

  private async getApplicableGeofences(companyId: string, employeeId: string) {
    // Primero buscar asignaciones específicas del empleado
    const employeeAssignments = await this.prisma.geofenceEmployee.findMany({
      where: {
        employeeId,
        isActive: true,
        geofence: {
          companyId,
          isActive: true,
        },
      },
      include: { geofence: true },
    });

    if (employeeAssignments.length > 0) {
      return employeeAssignments.map((ea) => ({
        ...ea.geofence,
        customRadius: ea.customRadius,
      }));
    }

    // Si no hay asignaciones específicas, usar todas las geocercas de la empresa
    const companyGeofences = await this.prisma.geofence.findMany({
      where: {
        companyId,
        isActive: true,
      },
    });

    return companyGeofences.map((g) => ({ ...g, customRadius: null }));
  }

  private findClosestGeofence(
    geofences: any[],
    latitude: number,
    longitude: number
  ) {
    let closest = {
      geofence: geofences[0],
      distance: Infinity,
    };

    for (const geofence of geofences) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        Number(geofence.latitude),
        Number(geofence.longitude)
      );

      if (distance < closest.distance) {
        closest = { geofence, distance };
      }
    }

    return closest;
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * @returns Distancia en metros
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Radio de la Tierra en metros

    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // =============================================
  // Utilidades
  // =============================================

  /**
   * Obtiene la dirección aproximada de coordenadas usando Nominatim (OpenStreetMap)
   * Nota: Para producción considerar usar Google Maps API o similar
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'NominaSystem/1.0',
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.display_name || null;
    } catch {
      return null;
    }
  }
}
