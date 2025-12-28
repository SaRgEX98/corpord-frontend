export interface User {
    id: string
    email: string
    name: string;
    last_name: string;
    avatar_url: string;
    role: 'admin' | 'driver' | 'client'
}