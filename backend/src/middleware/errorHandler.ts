/**
 * Global error handling middleware
 * Processes errors and sends appropriate responses to clients
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Custom error interface extending Error
 */
interface CustomError extends Error {
  status?: number;
  code?: string;
}

/**
 * Error handling middleware
 * @param error - Error object thrown in the application
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  const code = error.code || 'INTERNAL_ERROR';

  res.status(status).json({
    success: false,
    error: {
      code,
      message
    }
  });
};
