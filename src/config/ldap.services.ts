import { UnauthorizedException } from '@nestjs/common';
import * as ldap from 'ldapjs';

const LDAP_URL = process.env.LDAP_URL as string;
const BASE_DN = process.env.BASE_DN as string;
const DOMAIN = process.env.DOMAIN as string;

export const ldapLogin = (username: string, password: string) => {
  return new Promise<any>((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL });

    const userDN = `${username}@${DOMAIN}`;

    client.bind(userDN, password, (err) => {
      if (err) {
        client.unbind();
        if (err.name === 'InvalidCredentialsError') {
          return reject(
            new UnauthorizedException({
              message: 'Sai mật khẩu',
              code: 'INVALID_PASSWORD',
            }),
          );
        }

        return reject({
          message: 'Không kết nối được domain',
          code: 'LDAP_ERROR',
        });
      }

      const opts: ldap.SearchOptions = {
        filter: `(sAMAccountName=${username})`,
        scope: 'sub',
        attributes: ['*'],
      };

      client.search(BASE_DN, opts, (err, res) => {
        if (err) {
          client.unbind();
          return reject({
            message: 'Lỗi lấy thông tin user',
            code: 'SEARCH_ERROR',
          });
        }

        let user: any = null;

        res.on('searchEntry', (entry: any) => {
          user = entry.pojo;
        });
        res.on('error', (err) => {
          client.unbind();
          return reject({
            message: 'Lỗi trong quá trình search',
            code: 'SEARCH_STREAM_ERROR',
          });
        });

        res.on('end', () => {
          client.unbind();

          if (!user) {
            return reject({
              message: 'User không tồn tại trong domain',
              code: 'USER_NOT_FOUND',
            });
          }

          resolve({
            fullName: user.cn,
            email: user.mail,
          });
        });
      });
    });
  });
};

// ----- LẤY USER DOMAIN ----- //
export const syncUsersFromLDAP = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL });

    const opts: ldap.SearchOptions = {
      filter: '(&(objectCategory=person)(objectClass=user))',
      scope: 'sub',
      attributes: ['cn', 'mail', 'sAMAccountName'],
      paged: {
        pageSize: 1000,
        pagePause: false,
      },
    };
    const users: any[] = [];

    client.bind(`administrator@${DOMAIN}`, 'PAD@BTtsc0508', (err) => {
      if (err) {
        client.unbind();
        return reject(err);
      }

      client.search(BASE_DN, opts, (err, res) => {
        if (err) {
          client.unbind();
          return reject(err);
        }

        res.on('searchEntry', (entry: any) => {
          const obj: any = {};

          entry.attributes.forEach((attr: any) => {
            obj[attr.type] = attr.values[0];
          });

          users.push(obj);
        });

        res.on('error', (err) => {
          client.unbind();
          return reject(err);
        });

        res.on('end', () => {
          client.unbind();
          resolve(users);
        });
      });
    });
  });
};
