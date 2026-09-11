import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, startOfDay } from "date-fns";

export async function GET() {
  try {
    const todayStart = startOfDay(new Date());

    // Process upcoming taxes (due in <= 10 days).
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
      const daysUntilDue = Math.floor(
        (startOfDay(tax.dueDate).getTime() - todayStart.getTime()) /
          (1000 * 60 * 60 * 24),
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
