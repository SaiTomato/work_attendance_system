import jwt, { JwtPayload } from 'jsonwebtoken';

export const ACCESS_TOKEN_EXPIRES = '1h';
export const REFRESH_TOKEN_EXPIRES = '7d';

export interface AccessTokenPayload extends JwtPayload {
  id: string;
  username: string;
  role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  id: string;
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET_ACCESS!,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(
    token,
    process.env.JWT_SECRET_ACCESS!
  ) as AccessTokenPayload;
}

export function signRefreshToken(payload: Pick<RefreshTokenPayload, 'id'>) {
  return jwt.sign(
    { id: payload.id },
    process.env.JWT_SECRET_REFRESH!,
    { expiresIn: REFRESH_TOKEN_EXPIRES }
  );
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(
    token,
    process.env.JWT_SECRET_REFRESH!
  ) as RefreshTokenPayload;

  return { id: payload.id };
}