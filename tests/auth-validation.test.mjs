import test from 'node:test'
import assert from 'node:assert/strict'
import { LoginSchema, RegisterSchema } from '../app/features/auth/ui/login.schema.ts'

test('password spaces survive login and registration unchanged', () => {
  const password = '  my pass word  '
  const credentials = LoginSchema.parse({ email: ' user@example.com ', password })
  assert.equal(credentials.password, password)
  assert.equal(credentials.email, 'user@example.com')
  assert.equal(RegisterSchema.parse({ name: ' Test ', ...credentials }).password, password)
})

test('bcrypt password limit uses UTF-8 bytes, including Cyrillic', () => {
  const input = { email: 'user@example.com', password: 'я'.repeat(36) }
  assert.equal(LoginSchema.safeParse(input).success, true)
  assert.equal(LoginSchema.safeParse({ ...input, password: 'я'.repeat(37) }).success, false)
  assert.equal(RegisterSchema.safeParse({ name: 'Test', ...input, password: '🙂'.repeat(19) }).success, false)
})

test('registration requires name and valid email without imposing a login minimum', () => {
  assert.equal(RegisterSchema.safeParse({ name: ' ', email: 'user@example.com', password: 'secret' }).success, false)
  assert.equal(RegisterSchema.safeParse({ name: 'Test', email: 'bad', password: 'secret' }).success, false)
  assert.equal(LoginSchema.safeParse({ email: 'user@example.com', password: 'x' }).success, true)
})
