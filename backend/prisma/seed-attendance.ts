/**
 * Script independiente para crear registros de asistencia
 * Ejecutar con: npx ts-node prisma/seed-attendance.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAttendance() {
  console.log('🕐 Iniciando creación de registros de asistencia...');

  // Obtener todos los empleados activos
  const allEmployees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, companyId: true },
  });

  console.log(`📋 Encontrados ${allEmployees.length} empleados activos`);

  if (allEmployees.length === 0) {
    console.log('⚠️ No hay empleados. Ejecuta primero el seed principal.');
    return;
  }

  const todayDate = new Date();
  let recordsCreated = 0;

  // Función para obtener días hábiles recientes (excluyendo fines de semana)
  const getRecentWorkdays = (count: number): Date[] => {
    const workdays: Date[] = [];
    let current = new Date(todayDate);
    current.setHours(0, 0, 0, 0);

    // Incluir hoy si es día hábil
    const todayDayOfWeek = current.getDay();
    if (todayDayOfWeek !== 0 && todayDayOfWeek !== 6) {
      workdays.push(new Date(current));
    }

    while (workdays.length < count) {
      current.setDate(current.getDate() - 1);
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workdays.push(new Date(current));
      }
    }
    return workdays.reverse();
  };

  const recentWorkdays = getRecentWorkdays(15);
  console.log(`📅 Generando asistencia para ${recentWorkdays.length} días hábiles`);

  // Generar asistencia para todos los empleados
  for (const emp of allEmployees) {
    for (const workday of recentWorkdays) {
      const isToday = workday.toDateString() === todayDate.toDateString();

      // 10% probabilidad de faltar (excepto hoy)
      if (!isToday && Math.random() < 0.1) {
        continue;
      }

      // Simular hora de entrada (entre 7:45 y 8:20)
      const minuteVariation = Math.floor(Math.random() * 35) - 15;
      const checkIn = new Date(workday);

      if (minuteVariation < 0) {
        checkIn.setHours(7, 60 + minuteVariation, Math.floor(Math.random() * 60), 0);
      } else {
        checkIn.setHours(8, minuteVariation, Math.floor(Math.random() * 60), 0);
      }

      let checkOut: Date | null = null;
      let breakStart: Date | null = null;
      let breakEnd: Date | null = null;
      let hoursWorked: number | null = null;

      if (!isToday) {
        // Hora de comida
        breakStart = new Date(workday);
        breakStart.setHours(13, Math.floor(Math.random() * 15), 0, 0);

        breakEnd = new Date(workday);
        breakEnd.setHours(14, Math.floor(Math.random() * 15), 0, 0);

        // Hora de salida
        checkOut = new Date(workday);
        const checkOutHour = 17 + Math.floor(Math.random() * 2);
        checkOut.setHours(checkOutHour, Math.floor(Math.random() * 60), 0, 0);

        // Calcular horas trabajadas
        const totalMs = checkOut.getTime() - checkIn.getTime();
        const breakMs = breakEnd.getTime() - breakStart.getTime();
        hoursWorked = Math.round(((totalMs - breakMs) / (1000 * 60 * 60)) * 100) / 100;
      }

      // Determinar estado
      let status: 'PRESENT' | 'LATE' | 'EARLY_LEAVE' = 'PRESENT';
      if (checkIn.getHours() > 8 || (checkIn.getHours() === 8 && checkIn.getMinutes() > 5)) {
        status = 'LATE';
      }

      try {
        await prisma.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: workday,
            },
          },
          update: {
            checkIn,
            checkOut,
            breakStart,
            breakEnd,
            status,
            hoursWorked,
          },
          create: {
            employeeId: emp.id,
            date: workday,
            checkIn,
            checkOut,
            breakStart,
            breakEnd,
            status,
            hoursWorked,
          },
        });
        recordsCreated++;
      } catch (error) {
        console.error(`Error creando registro para ${emp.firstName} ${emp.lastName} en ${workday.toISOString().split('T')[0]}:`, error);
      }
    }
  }

  console.log(`✅ ${recordsCreated} registros de asistencia creados/actualizados`);

  // Mostrar resumen por empresa
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  for (const company of companies) {
    const count = await prisma.attendanceRecord.count({
      where: {
        employee: { companyId: company.id },
      },
    });
    console.log(`   📊 ${company.name}: ${count} registros`);
  }
}

seedAttendance()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
