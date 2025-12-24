import { z } from 'zod'

export const studentRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
})

export const professorRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  professorKey: z.string().min(1, 'Professor key is required'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const createSessionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const markAttendanceSchema = z.object({
  sessionId: z.string().min(1),
  timestamp: z.number(),
  nonce: z.string().min(1),
  signature: z.string().min(1),
  studentLatitude: z.number().min(-90).max(90),
  studentLongitude: z.number().min(-180).max(180),
})

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>
export type ProfessorRegistrationInput = z.infer<typeof professorRegistrationSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>

