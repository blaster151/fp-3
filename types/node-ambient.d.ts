declare module "node:fs" {
  export const promises: {
    readFile(path: string, options?: unknown): Promise<string>;
    writeFile(path: string, data: string, options?: unknown): Promise<void>;
    mkdir(path: string, options?: unknown): Promise<void>;
  };
  export function readFileSync(path: string, options?: unknown): string;
  export function writeFileSync(path: string, data: string, options?: unknown): void;
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: unknown): void;
  export function accessSync(path: string, mode?: number): void;
  export const constants: { readonly F_OK: number };
}

declare module "fs" {
  export * from "node:fs";
  export const promises: {
    readFile(path: string, options?: unknown): Promise<string>;
    writeFile(path: string, data: string, options?: unknown): Promise<void>;
    mkdir(path: string, options?: unknown): Promise<void>;
  };
}

declare module "node:path" {
  export function resolve(...segments: string[]): string;
  export function dirname(path: string): string;
  export function join(...segments: string[]): string;
  export function relative(from: string, to: string): string;
}

declare module "path" {
  export * from "node:path";
  export function resolve(...segments: string[]): string;
  export function dirname(path: string): string;
  export function join(...segments: string[]): string;
  export function relative(from: string, to: string): string;
}

declare const process: {
  readonly argv: ReadonlyArray<string>;
  readonly cwd: () => string;
  readonly exit: (code?: number) => never;
};

declare const require: {
  (id: string): unknown;
  main?: unknown;
};

declare const module: {
  exports: unknown;
};
