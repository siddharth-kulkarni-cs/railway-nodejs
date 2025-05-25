// Example TypeScript types for your application

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type RequestHandler = (
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
) => void | Promise<void>; 