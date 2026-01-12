import 'next-auth';
import { UserRole } from '@/generated/prisma/enums';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    username: string;
    email?: string | null;
    role: UserRole;
  }

  interface Session {
    user: User & {
      id: string;
      username: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: string;
  }
}
