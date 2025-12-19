import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicates() {
  console.log('🧹 Limpiando datos duplicados...');

  // Clean duplicate departments
  const departments = await prisma.department.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenDeptNames = new Set<string>();
  for (const dept of departments) {
    const key = `${dept.name}-${dept.companyId}`;
    if (seenDeptNames.has(key)) {
      await prisma.department.delete({ where: { id: dept.id } });
      console.log(`  Eliminado departamento duplicado: ${dept.name}`);
    } else {
      seenDeptNames.add(key);
    }
  }

  // Clean duplicate benefits
  const benefits = await prisma.benefit.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenBenefitNames = new Set<string>();
  for (const benefit of benefits) {
    if (seenBenefitNames.has(benefit.name)) {
      await prisma.benefit.delete({ where: { id: benefit.id } });
      console.log(`  Eliminada prestacion duplicada: ${benefit.name}`);
    } else {
      seenBenefitNames.add(benefit.name);
    }
  }

  // Clean duplicate job positions
  const jobPositions = await prisma.jobPosition.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenPositionNames = new Set<string>();
  for (const position of jobPositions) {
    if (seenPositionNames.has(position.name)) {
      await prisma.jobPosition.delete({ where: { id: position.id } });
      console.log(`  Eliminado puesto duplicado: ${position.name}`);
    } else {
      seenPositionNames.add(position.name);
    }
  }

  // Clean duplicate work schedules
  const workSchedules = await prisma.workSchedule.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const seenScheduleNames = new Set<string>();
  for (const schedule of workSchedules) {
    if (seenScheduleNames.has(schedule.name)) {
      // Delete schedule details first
      await prisma.workScheduleDetail.deleteMany({ where: { workScheduleId: schedule.id } });
      await prisma.workSchedule.delete({ where: { id: schedule.id } });
      console.log(`  Eliminado horario duplicado: ${schedule.name}`);
    } else {
      seenScheduleNames.add(schedule.name);
    }
  }

  console.log('\n✅ Limpieza completada!');
}

cleanupDuplicates()
  .catch((e) => {
    console.error('❌ Error en limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
