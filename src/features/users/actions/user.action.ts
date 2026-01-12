'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { UserRole } from '@/generated/prisma/enums';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  email: z.string().email().optional().nullable(),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.nativeEnum(UserRole),
});

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  username: z.string().min(3, 'Username minimal 3 karakter'),
  email: z.string().email().optional().nullable(),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean(),
});

const changePasswordSchema = z.object({
  userId: z.string().uuid(),
  newPassword: z.string().min(6, 'Password minimal 6 karakter'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export async function getUsers(options?: { role?: UserRole; includeInactive?: boolean }) {
  const { role, includeInactive } = options ?? {};

  const where: Record<string, unknown> = { deletedAt: null };
  if (role) where.role = role;
  if (!includeInactive) where.isActive = true;

  const users = await prisma.user.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          usageRecords: true,
        },
      },
    },
  });

  return users;
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          usageRecords: true,
        },
      },
    },
  });

  return user;
}

export async function createUser(data: CreateUserInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Check if current user is admin
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== UserRole.ADMIN) {
    return { error: 'Hanya admin yang dapat menambah user' };
  }

  const validated = createUserSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  // Check if username exists
  const existingUser = await prisma.user.findUnique({
    where: { username: validated.data.username },
  });

  if (existingUser) {
    return { error: 'Username sudah digunakan' };
  }

  try {
    const hashedPassword = await bcrypt.hash(validated.data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: validated.data.name,
        username: validated.data.username,
        email: validated.data.email ?? null,
        password: hashedPassword,
        role: validated.data.role,
      },
    });

    revalidatePath('/dashboard/users');
    return { success: true, user: { id: user.id, name: user.name } };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { error: 'Gagal membuat user' };
  }
}

export async function updateUser(id: string, data: UpdateUserInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== UserRole.ADMIN) {
    return { error: 'Hanya admin yang dapat mengubah user' };
  }

  const validated = updateUserSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  // Check if username exists for other users
  const existingUser = await prisma.user.findFirst({
    where: { username: validated.data.username, id: { not: id } },
  });

  if (existingUser) {
    return { error: 'Username sudah digunakan' };
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: validated.data.name,
        username: validated.data.username,
        email: validated.data.email ?? null,
        role: validated.data.role,
        isActive: validated.data.isActive,
      },
    });

    revalidatePath('/dashboard/users');
    revalidatePath(`/dashboard/users/${id}`);
    return { success: true, user: { id: user.id, name: user.name } };
  } catch (error) {
    console.error('Failed to update user:', error);
    return { error: 'Gagal mengupdate user' };
  }
}

export async function changePassword(data: ChangePasswordInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== UserRole.ADMIN && session.user.id !== data.userId) {
    return { error: 'Tidak memiliki akses' };
  }

  const validated = changePasswordSchema.safeParse(data);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  try {
    const hashedPassword = await bcrypt.hash(validated.data.newPassword, 10);

    await prisma.user.update({
      where: { id: validated.data.userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to change password:', error);
    return { error: 'Gagal mengubah password' };
  }
}

export async function deleteUser(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== UserRole.ADMIN) {
    return { error: 'Hanya admin yang dapat menghapus user' };
  }

  // Prevent self-deletion
  if (session.user.id === id) {
    return { error: 'Tidak dapat menghapus akun sendiri' };
  }

  try {
    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { error: 'Gagal menghapus user' };
  }
}

export async function toggleUserStatus(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (currentUser?.role !== UserRole.ADMIN) {
    return { error: 'Hanya admin yang dapat mengubah status user' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { isActive: true },
    });

    if (!user) {
      return { error: 'User tidak ditemukan' };
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    revalidatePath('/dashboard/users');
    return { success: true, isActive: !user.isActive };
  } catch (error) {
    console.error('Failed to toggle user status:', error);
    return { error: 'Gagal mengubah status user' };
  }
}
