/** The backend has two roles; a driver is a transport record, not a user role. */
export interface User {
    id: number
    email: string
    name: string
    role: 'admin' | 'user'
    user_agent: string
    ip: string
    created_at: string
    updated_at: string
}
export interface UserInput {
    email: string
    name: string
    password?: string
}
export interface UserUpdate {
    email?: string
    name?: string
    password?: string
}
