import { z } from "zod";

export const regsiterSchema = z.object({
  name: z.string().min(3, "name must be atleat 3 charcter long"),
  email: z.email("invalid email"),
  password: z.string().min(8, "password must be 8  characters long"),
});

export const loginSchema = z.object({
  email: z.email("invalid email"),
  password: z.string().min(8, "password must be 8  characters long"),
});
