import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { prisma } from "@/lib/prisma";
import { CarStatus, UsageStatus } from "@/generated/prisma/enums";

/**
 * Closes vehicle usage records whose estimated duration has elapsed.
 * This endpoint is intended to be called by a scheduler every minute.
 */
export async function GET() {
  try {
    const now = new Date();
    const activeUsages = await prisma.usageRecord.findMany({
      where: {
        endTime: null,
        status: UsageStatus.ONGOING,
      },
      select: {
        id: true,
        carId: true,
        startTime: true,
        estimatedDays: true,
        estimatedDurationMinutes: true,
      },
    });

    const usagesToClose: string[] = [];
    const carsToFree: string[] = [];

    for (const usage of activeUsages) {
      const estimatedDurationMinutes =
        usage.estimatedDurationMinutes ??
        (usage.estimatedDays ? usage.estimatedDays * 1440 : null);

      if (!estimatedDurationMinutes) continue;

      const estimatedEndTime = addMinutes(usage.startTime, estimatedDurationMinutes);
      if (estimatedEndTime <= now) {
        usagesToClose.push(usage.id);
        carsToFree.push(usage.carId);
      }
    }

    if (usagesToClose.length > 0) {
      await prisma.$transaction([
        prisma.usageRecord.updateMany({
          where: {
            id: { in: usagesToClose },
            endTime: null,
            status: UsageStatus.ONGOING,
          },
          data: {
            endTime: now,
            status: UsageStatus.COMPLETED,
          },
        }),
        prisma.car.updateMany({
          where: { id: { in: carsToFree } },
          data: { status: CarStatus.AVAILABLE },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: {
        closedUsagesCount: usagesToClose.length,
        closedUsageIds: usagesToClose,
        freedCarIds: carsToFree,
      },
    });
  } catch (error) {
    console.error("Failed to close expired vehicle usages:", error);
    return NextResponse.json(
      { error: "Internal server error while closing vehicle usages" },
      { status: 500 },
    );
  }
}
