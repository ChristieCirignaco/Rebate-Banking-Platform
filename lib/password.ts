import { hash, verify, type Options } from "@node-rs/argon2";

// argon2id (the @node-rs/argon2 default) with OWASP baseline parameters. They are
// encoded into the resulting PHC hash string, so verify() reads them back automatically.
const options: Options = {
  memoryCost: 19456, // KiB (~19 MiB)
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

// Better Auth calls hash(password) => Promise<string>.
export async function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

// Better Auth calls verify({ hash, password }) => Promise<boolean>.
// @node-rs/argon2's verify() is positional (hash, password), so we reorder here.
export async function verifyPassword({
  hash: hashed,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  return verify(hashed, password);
}
