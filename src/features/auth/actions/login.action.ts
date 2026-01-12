'use server';

import { signIn } from '@/lib/auth';
import { loginSchema, type LoginInput } from '../schemas/auth.schema';
import { AuthError } from 'next-auth';
import { DEFAULT_LOGIN_REDIRECT } from '../../../../routes';

export async function login(data: LoginInput) {
  const validated = loginSchema.safeParse(data);

  if (!validated.success) {
    return { error: 'Invalid fields' };
  }

  const { username, password } = validated.data;

  try {
    await signIn('credentials', {
      username,
      password,
      redirectTo: DEFAULT_LOGIN_REDIRECT,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid username or password' };
        default:
          return { error: 'Something went wrong' };
      }
    }
    throw error;
  }
}
