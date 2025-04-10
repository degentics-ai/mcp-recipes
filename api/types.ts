import { ZodSchema } from "zod";

export type Tool = {
  name: string;
  description: string;
  inputSchema: ZodSchema;
  execute: (params: any) => Promise<any>;
};
