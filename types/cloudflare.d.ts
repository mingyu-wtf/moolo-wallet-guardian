interface Fetcher {
  fetch(input: Request): Promise<Response>;
}

interface D1Database {
  readonly __d1DatabaseBrand?: "D1Database";
}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
  };
}
