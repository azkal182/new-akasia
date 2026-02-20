import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays, addDays, startOfDay } from "date-fns";
import { UsageStatus, CarStatus } from "@/generated/prisma/enums";

export async function GET() {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);

    // 1. Process UsageRecords
    const activeUsages = await prisma.usageRecord.findMany({
      where: {
        endTime: null,
        status: UsageStatus.ONGOING,
      },
    });

    const usagesToClose = [];
    const carsToFree = [];

    for (const usage of activeUsages) {
      if (!usage.estimatedDays) continue;

      const elapsedDays = differenceInCalendarDays(
        todayStart,
        startOfDay(usage.startTime),
      );

      // If elapsed days >= (estimatedDays - 1), it means it has reached or passed its estimated duration tonight.
      if (elapsedDays >= usage.estimatedDays - 1) {
        usagesToClose.push(usage.id);
        carsToFree.push(usage.carId);
      }
    }

    if (usagesToClose.length > 0) {
      await prisma.$transaction([
        prisma.usageRecord.updateMany({
          where: { id: { in: usagesToClose } },
          data: {
            endTime: now,
            status: UsageStatus.COMPLETED,
          },
        }),
        prisma.car.updateMany({
          where: { id: { in: carsToFree } },
          data: {
            status: CarStatus.AVAILABLE,
          },
        }),
      ]);
    }

    // 2. Process Upcoming Taxes (Due in <= 10 days)
    const tenDaysFromNow = addDays(todayStart, 10);

    // Taxes that are not paid and the due date is <= 10 days from today
    // We also want to include overdue taxes if they haven't been paid.
    const upcomingTaxes = await prisma.tax.findMany({
      where: {
        isPaid: false,
        dueDate: {
          lte: tenDaysFromNow,
        },
      },
      include: {
        car: { select: { id: true, name: true, licensePlate: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    // We can format the taxes to be more readable for the notification payload
    const taxAlerts = upcomingTaxes.map((tax) => {
      const daysUntilDue = differenceInCalendarDays(
        startOfDay(tax.dueDate),
        todayStart,
      );
      const isOverdue = daysUntilDue < 0;

      return {
        id: tax.id,
        carName: tax.car.name,
        licensePlate: tax.car.licensePlate,
        type: tax.type,
        dueDate: tax.dueDate,
        daysUntilDue,
        isOverdue,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        closedUsagesCount: usagesToClose.length,
        closedUsageIds: usagesToClose,
        freedCarIds: carsToFree,
        upcomingTaxesCount: taxAlerts.length,
        upcomingTaxes: taxAlerts,
      },
    });
  } catch (error) {
    console.error("Failed to run daily cron:", error);
    return NextResponse.json(
      { error: "Internal server error while running cron" },
      { status: 500 },
    );
  }
}
