"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PerizinanStatus, TokenType } from "@/generated/prisma/enums";
import { z } from "zod";
import { randomUUID } from "crypto";

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a public form token (admin creates this link to share)
 * Token valid for 7 days by default
 */
export async function generateFormToken(expirationDays = 7) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const token = await prisma.perizinanToken.create({
      data: {
        token: randomUUID(),
        type: TokenType.FORM,
        expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
      },
    });

    return {
      success: true,
      token: token.token,
      expiresAt: token.expiresAt,
    };
  } catch (error) {
    console.error("Failed to generate form token:", error);
    return { error: "Gagal membuat link" };
  }
}

/**
 * Generate approval token for a specific perizinan
 * Token valid for 48 hours by default, single use
 */
export async function generateApprovalToken(
  perizinanId: string,
  expirationHours = 48
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Check perizinan exists and is pending
    const perizinan = await prisma.perizinan.findUnique({
      where: { id: perizinanId },
    });

    if (!perizinan) {
      return { error: "Perizinan tidak ditemukan" };
    }

    if (perizinan.status !== PerizinanStatus.PENDING) {
      return { error: "Perizinan sudah diproses" };
    }

    const token = await prisma.perizinanToken.create({
      data: {
        token: randomUUID(),
        type: TokenType.APPROVE,
        perizinanId,
        expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000),
      },
    });

    return {
      success: true,
      token: token.token,
      expiresAt: token.expiresAt,
    };
  } catch (error) {
    console.error("Failed to generate approval token:", error);
    return { error: "Gagal membuat link approval" };
  }
}

// ============================================
// TOKEN VALIDATION
// ============================================

export async function validateToken(token: string) {
  const tokenData = await prisma.perizinanToken.findUnique({
    where: { token },
    include: {
      perizinan: {
        include: {
          car: { select: { id: true, name: true, licensePlate: true } },
        },
      },
    },
  });

  if (!tokenData) {
    return { valid: false, error: "Link tidak valid" };
  }

  if (tokenData.expiresAt < new Date()) {
    return { valid: false, error: "Link sudah kadaluarsa" };
  }

  if (tokenData.usedAt) {
    return { valid: false, error: "Link sudah digunakan" };
  }

  return {
    valid: true,
    tokenData,
  };
}

// ============================================
// PUBLIC FORM SUBMISSION
// ============================================

const publicPerizinanSchema = z.object({
  carId: z.string().uuid("Pilih kendaraan"),
  name: z.string().min(1, "Nama pemohon wajib diisi"),
  purpose: z.string().min(1, "Keperluan wajib diisi"),
  destination: z.string().min(1, "Tujuan wajib diisi"),
  description: z.string().optional(),
  numberOfPassengers: z.coerce
    .number()
    .int()
    .positive("Jumlah penumpang wajib diisi"),
  date: z.coerce.date(),
  estimation: z.coerce.number().int().positive("Estimasi durasi wajib diisi"),
});

export type PublicPerizinanInput = z.infer<typeof publicPerizinanSchema>;

/**
 * Submit perizinan using a public form token (no login required)
 */
export async function submitPublicPerizinan(
  token: string,
  data: PublicPerizinanInput
) {
  // Validate token
  const validation = await validateToken(token);
  if (!validation.valid) {
    return { error: validation.error };
  }

  if (validation.tokenData?.type !== TokenType.FORM) {
    return { error: "Token tidak valid untuk form" };
  }

  const validated = publicPerizinanSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const perizinan = await prisma.$transaction(async (tx) => {
      // Create the perizinan
      const newPerizinan = await tx.perizinan.create({
        data: {
          carId: validated.data.carId,
          name: validated.data.name,
          purpose: validated.data.purpose,
          destination: validated.data.destination,
          description: validated.data.description ?? null,
          numberOfPassengers: validated.data.numberOfPassengers,
          date: validated.data.date,
          estimation: validated.data.estimation,
          status: PerizinanStatus.PENDING,
        },
      });

      // Mark token as used and link to perizinan
      await tx.perizinanToken.update({
        where: { token },
        data: {
          usedAt: new Date(),
          perizinanId: newPerizinan.id,
        },
      });

      return newPerizinan;
    });

    return { success: true, perizinan };
  } catch (error) {
    console.error("Failed to submit public perizinan:", error);
    return { error: "Gagal mengirim pengajuan" };
  }
}

// ============================================
// PUBLIC APPROVAL
// ============================================

/**
 * Approve perizinan using a public token (no login required)
 */
export async function approveWithToken(token: string) {
  // Validate token
  const validation = await validateToken(token);
  if (!validation.valid) {
    return { error: validation.error };
  }

  if (validation.tokenData?.type !== TokenType.APPROVE) {
    return { error: "Token tidak valid untuk approval" };
  }

  const perizinanId = validation.tokenData?.perizinanId;
  if (!perizinanId) {
    return { error: "Data perizinan tidak ditemukan" };
  }

  try {
    await prisma.$transaction([
      // Update perizinan status
      prisma.perizinan.update({
        where: { id: perizinanId },
        data: { status: PerizinanStatus.APPROVED },
      }),
      // Mark token as used
      prisma.perizinanToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    revalidatePath("/dashboard/perizinan");
    return { success: true };
  } catch (error) {
    console.error("Failed to approve with token:", error);
    return { error: "Gagal menyetujui perizinan" };
  }
}

// ============================================
// TOKEN MANAGEMENT (Admin)
// ============================================

export async function getActiveTokens() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const tokens = await prisma.perizinanToken.findMany({
    where: {
      expiresAt: { gte: new Date() },
      usedAt: null,
    },
    orderBy: { createdAt: "desc" },
    include: {
      perizinan: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  return tokens;
}

export async function deleteToken(tokenId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.perizinanToken.delete({
      where: { id: tokenId },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete token:", error);
    return { error: "Gagal menghapus token" };
  }
}

// ============================================
// PUBLIC DATA FETCHING
// ============================================

/**
 * Get cars list for public form (no auth required)
 */
export async function getPublicCars() {
  const cars = await prisma.car.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      licensePlate: true,
    },
  });

  return cars;
}
