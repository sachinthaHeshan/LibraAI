import "@fastify/jwt";

export type AccountRole = "owner" | "member";

type LibraJwtUser = {
  sub: string;
  orgId: string;
  email: string;
  /** Missing on tokens issued before member accounts existed; treated as owner. */
  role?: AccountRole;
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: LibraJwtUser;
    user: LibraJwtUser;
  }
}
