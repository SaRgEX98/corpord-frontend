/** Roles seeded by backend migrations; drivers are separate transport records. */
export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user" | "moderator";
  user_agent: string;
  ip: string;
  created_at: string;
  updated_at: string;
}
export interface UserInput {
  email: string;
  name: string;
  password: string;
}
export interface UserUpdate {
  email?: string;
  name?: string;
  password?: string;
}
