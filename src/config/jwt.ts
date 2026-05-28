import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;
const REF_JWT_SECRET = process.env.REF_JWT_SECRET as string;

export const createToken = (data: object) => {
  return jwt.sign({ data }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '30s',
  });
};

export const createRefToken = (data: object) => {
  return jwt.sign({ data }, REF_JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
};

export const decodeToken = (token: string) => {
  return jwt.decode(token);
};

export const checkToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};

export const checkRefToken = (token: string) => {
  return jwt.verify(token, REF_JWT_SECRET);
};