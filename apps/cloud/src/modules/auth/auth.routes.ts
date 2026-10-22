import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify'
import {prisma} from '../../infrastructure/database/client'
import {
  authenticate,
  type AuthenticatedUser,
} from '../../http/middleware/authentication'
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../../http/schemas/v1/auth.schema'
import {sendPasswordResetEmail} from './password-reset-email'
import {
  AuthError,
  changePassword,
  createPasswordReset,
  hashToken,
  login,
  register,
  resetPassword,
} from './auth.service'

function authUser(request: FastifyRequest): AuthenticatedUser {
  if (!request.auth) throw new AuthError('Authentication required', 401)
  return request.auth
}

function invalidBody(reply: FastifyReply) {
  return reply.status(400).send({
    success: false,
    message: 'Request body is invalid',
  })
}

export default async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) return invalidBody(reply)

    const result = await register(parsed.data)
    return reply.status(201).send({success: true, ...result})
  })

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) return invalidBody(reply)

    const result = await login(parsed.data)
    return reply.status(200).send({success: true, ...result})
  })

  app.post('/password/forgot', async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body)
    if (!parsed.success) return invalidBody(reply)

    const reset = await createPasswordReset(parsed.data)
    if (reset) {
      try {
        await sendPasswordResetEmail(reset.email, reset.token)
      } catch (error) {
        await prisma.passwordResetToken.deleteMany({
          where: {tokenHash: hashToken(reset.token), usedAt: null},
        })
        request.log.error({err: error}, 'Password reset email could not be sent')
      }
    }

    return reply.status(202).send({
      success: true,
      message: 'If the account exists, password reset instructions will be sent',
    })
  })

  app.post('/password/reset', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body)
    if (!parsed.success) return invalidBody(reply)

    await resetPassword(parsed.data)
    return reply.status(200).send({success: true, message: 'Password has been reset'})
  })

  app.post('/password/change', {preHandler: authenticate}, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body)
    if (!parsed.success) return invalidBody(reply)

    await changePassword(authUser(request).userId, parsed.data)
    return reply.status(200).send({
      success: true,
      message: 'Password has been changed; sign in again',
    })
  })

  app.post('/logout', {preHandler: authenticate}, async (request, reply) => {
    const user = authUser(request)
    await prisma.session.updateMany({
      where: {id: user.sessionId, userId: user.userId, revokedAt: null},
      data: {revokedAt: new Date()},
    })
    return reply.status(200).send({success: true, message: 'Signed out'})
  })

  app.get('/me', {preHandler: authenticate}, async (request, reply) => {
    const user = authUser(request)
    return reply.status(200).send({
      success: true,
      user: {id: user.userId, email: user.email, role: user.role},
      tenantId: user.tenantId,
    })
  })
}
