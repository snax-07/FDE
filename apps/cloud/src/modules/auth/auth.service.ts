import bcrypt from 'bcrypt'
import {createHash, randomBytes} from 'node:crypto'
import {Prisma} from '@prisma/client'
import {prisma} from '../../infrastructure/database/client'
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '../../http/schemas/v1/auth.schema'

const BCRYPT_ROUNDS = 12
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000
const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000

export class AuthError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message)
    this.name = 'AuthError'
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function register(input: RegisterInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: input.tenantName,
        slug: input.tenantSlug,
        users: {
          create: {
            email: input.email,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        users: {
          select: {id: true, email: true, role: true},
        },
      },
    })

    return {tenant, user: tenant.users[0]}
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AuthError('That tenant slug is already registered', 409)
    }
    throw error
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email,
      isActive: true,
      tenant: {slug: input.tenantSlug, isActive: true},
    },
    include: {
      tenant: {select: {id: true, name: true, slug: true}},
    },
  })

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AuthError('Invalid tenant, email, or password', 401)
  }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS)
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashToken(token),
      expiresAt,
    },
    select: {id: true},
  })

  await prisma.user.update({
    where: {id: user.id},
    data: {lastLoginAt: new Date()},
  })

  return {
    accessToken: token,
    tokenType: 'Bearer' as const,
    expiresAt,
    sessionId: session.id,
    user: {id: user.id, email: user.email, role: user.role},
    tenant: user.tenant,
  }
}

export async function createPasswordReset(input: ForgotPasswordInput) {
  const user = await prisma.user.findFirst({
    where: {
      email: input.email,
      isActive: true,
      tenant: {slug: input.tenantSlug, isActive: true},
    },
    select: {id: true, email: true},
  })

  if (!user) return null

  const token = randomBytes(32).toString('base64url')
  const tokenHash = hashToken(token)

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: {userId: user.id, usedAt: null},
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
      },
    }),
  ])

  return {email: user.email, token, tokenHash}
}

export async function resetPassword(input: ResetPasswordInput) {
  const tokenHash = hashToken(input.token)
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

  await prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findUnique({
      where: {tokenHash},
      select: {id: true, userId: true, expiresAt: true, usedAt: true},
    })

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
      throw new AuthError('Reset link is invalid or expired', 400)
    }

    const consumed = await transaction.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: {gt: new Date()},
      },
      data: {usedAt: new Date()},
    })

    if (consumed.count !== 1) {
      throw new AuthError('Reset link is invalid or expired', 400)
    }

    await transaction.user.update({
      where: {id: resetToken.userId, isActive: true},
      data: {passwordHash},
    })

    await transaction.session.updateMany({
      where: {userId: resetToken.userId, revokedAt: null},
      data: {revokedAt: new Date()},
    })
  })
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: {id: userId},
    select: {passwordHash: true},
  })

  if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new AuthError('Current password is incorrect', 400)
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS)
  await prisma.$transaction([
    prisma.user.update({where: {id: userId}, data: {passwordHash}}),
    prisma.session.updateMany({
      where: {userId, revokedAt: null},
      data: {revokedAt: new Date()},
    }),
  ])
}
