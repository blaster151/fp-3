declare module "fs" {
  export const promises: {
    writeFile(path: string, data: string, options?: string): Promise<void>;
  };
}
