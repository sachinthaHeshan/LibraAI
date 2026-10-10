export function decodePayload(token: string) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload!, "base64url").toString("utf8")) as {
    sub: string;
    orgId: string;
    email: string;
    role?: "owner" | "member";
    iat: number;
    exp: number;
  };
}
