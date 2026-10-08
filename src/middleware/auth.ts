import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { getOrCreateUser, getUserByUid, touchUserActivity } from '../db/queries.ts';

export type AdminRole = 'leader' | 'deputy' | 'moderator' | 'member';

export interface AuthUserContext {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  authProvider: 'discord' | 'firebase';
  isSuspended?: boolean;
  issuedAt?: number;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  adminContext?: AuthUserContext;
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters');
}
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function signAdminSessionCookie(payload: AuthUserContext): string {
  const payloadWithTimestamp: AuthUserContext = {
    ...payload,
    issuedAt: Date.now(),
  };
  const data = Buffer.from(JSON.stringify(payloadWithTimestamp)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifyAdminSessionCookie(token?: string): AuthUserContext | null {
  if (!token || !token.includes('.')) return null;
  const [data, signature] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(data)
    .digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as AuthUserContext;
    if (parsed.issuedAt && Date.now() - parsed.issuedAt > TWO_HOURS_MS) {
      return null; // 2-hour inactivity expiration
    }
    return parsed;
  } catch {
    return null;
  }
}

export const resolveAuthContext = async (
  req: AuthRequest,
  res?: Response
): Promise<AuthUserContext | null> => {
  // 1. Check Discord OAuth2 httpOnly session cookie first
  const cookieToken = req.cookies?.curs_admin_session;
  if (cookieToken) {
    const verifiedCookie = verifyAdminSessionCookie(cookieToken);
    if (verifiedCookie) {
      const dbUser = await getUserByUid(verifiedCookie.uid);
      if (dbUser) {
        if (dbUser.isSuspended) {
          return {
            ...verifiedCookie,
            role: (dbUser.discordRole as AdminRole) || verifiedCookie.role,
            isSuspended: true,
          };
        }

        // Check 2-hour inactivity in DB
        if (
          dbUser.lastActiveAt &&
          Date.now() - new Date(dbUser.lastActiveAt).getTime() > TWO_HOURS_MS
        ) {
          if (res) {
            res.clearCookie('curs_admin_session', {
              httpOnly: true,
              secure: true,
              sameSite: 'none',
            });
          }
          return null;
        }

        await touchUserActivity(dbUser.uid);
        const refreshedContext: AuthUserContext = {
          ...verifiedCookie,
          role: (dbUser.discordRole as AdminRole) || verifiedCookie.role,
          isSuspended: false,
          issuedAt: Date.now(),
        };

        // Sliding 2-hour window cookie refresh
        if (res && !res.headersSent) {
          res.cookie('curs_admin_session', signAdminSessionCookie(refreshedContext), {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: TWO_HOURS_MS,
          });
        }
        return refreshedContext;
      }
      return verifiedCookie;
    }
  }

  // 2. Check Firebase Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
      const email = decodedToken.email || 'user@curs.clan';
      const displayName = decodedToken.name || email.split('@')[0];

      const leaderEmails = (process.env.ADMIN_LEADER_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase());
      const defaultRole: AdminRole = leaderEmails.includes(email.toLowerCase())
        ? 'leader'
        : 'member';

      const dbUser = await getOrCreateUser(
        decodedToken.uid,
        email,
        displayName,
        undefined,
        defaultRole
      );

      // The configured owner cannot be demoted by stale stored role data.
      const effectiveRole: AdminRole = leaderEmails.includes(email.toLowerCase())
        ? 'leader'
        : (dbUser.discordRole as AdminRole) || 'member';

      return {
        uid: decodedToken.uid,
        email: dbUser.email,
        displayName: dbUser.displayName || displayName,
        role: effectiveRole,
        authProvider: 'firebase',
        isSuspended: Boolean(dbUser.isSuspended),
      };
    } catch (error) {
      console.error('Error verifying Firebase ID token:', error);
      return null;
    }
  }

  return null;
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ctx = await resolveAuthContext(req, res);
    if (!ctx) {
      return res.status(401).json({
        error: 'Требуется авторизация (Discord OAuth2 или Google) либо истекли 2 часа бездействия.',
      });
    }
    if (ctx.isSuspended) {
      return res.status(403).json({
        error: 'Ваш доступ к админ-панели временно приостановлен Лидером клана CURS.',
      });
    }
    req.adminContext = ctx;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Ошибка проверки сессии' });
  }
};

export const requireRole = (allowedRoles: AdminRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const ctx = await resolveAuthContext(req, res);
      if (!ctx) {
        return res.status(401).json({
          error: 'Требуется авторизация для доступа к админ-панели (сессия 2 часа).',
        });
      }
      if (ctx.isSuspended) {
        return res.status(403).json({
          error: 'Доступ запрещён (403): ваша учётная запись администратора временно отключена Лидером.',
        });
      }
      if (!allowedRoles.includes(ctx.role)) {
        return res.status(403).json({
          error: `Доступ запрещён (403). Ваша роль «${ctx.role}» не входит в список разрешённых: ${allowedRoles.join(', ')}`,
        });
      }
      req.adminContext = ctx;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка проверки прав доступа' });
    }
  };
};
