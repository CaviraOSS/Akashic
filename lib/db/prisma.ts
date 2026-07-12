import { PrismaClient } from "@prisma/client"

let _prisma: PrismaClient;

export const getPrisma = (): PrismaClient => {
  if (!_prisma) {
    _prisma = new PrismaClient();
  }
  return _prisma;
}

export const prismaProxy = new Proxy({} as PrismaClient, {
  get(target, prop) {
    return getPrisma()[prop as keyof PrismaClient];
  }
});
