import {createHash} from 'node:crypto'
import type {FastifyReply, FastifyRequest} from 'fastify'
import {prisma} from '../../infrastructure/database/client'

export type AuthenticatedUser = {
  sessionId: string
  userId: string
  tenantId: string
  email: string
  role: string
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthenticatedUser
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authorization = request.headers.authorization
  const match = authorization?.match(/^Bearer\s+([A-Za-z0-9_-]{40,})$/i)

  if (!match) {
    await reply.status(401).send({success: false, message: 'Authentication required'})
    return
  }

  const tokenHash = createHash('sha256').update(match[1]).digest('hex')
  const session = await prisma.session.findUnique({
    where: {refreshTokenHash: tokenHash},
    include: {user: {include: {tenant: true}}},
  })

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.isActive ||
    !session.user.tenant.isActive
  ) {
    await reply.status(401).send({success: false, message: 'Invalid or expired session'})
    return
  }

  request.auth = {
    sessionId: session.id,
    userId: session.user.id,
    tenantId: session.user.tenantId,
    email: session.user.email,
    role: session.user.role,
  }
}