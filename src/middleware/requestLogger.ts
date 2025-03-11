/**
 * Request logging middleware
 * Logs incoming HTTP requests for debugging and monitoring
 */

import { Request, Response, NextFunction } from "express";

/**
 * Logs details about incoming HTTP requests
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};
