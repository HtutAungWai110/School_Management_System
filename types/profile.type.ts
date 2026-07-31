export enum Role {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

export type Profile = {
  avatar_url: string;
  created_at: string;
  email: string;
  full_name: string;
  id: string;
  role: string;
  phone: string;
  address: string;
  date_of_birth: string;
}
