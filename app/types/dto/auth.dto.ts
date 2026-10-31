export interface LoginRequestDto {
  email: string;
  password: string;
}
export interface LoginResponseDto {
  access_token: string;
}
export interface RegisterRequestDto {
  email: string;
  password: string;
  name: string;
}
export type RegisterResponseDto = LoginResponseDto;
