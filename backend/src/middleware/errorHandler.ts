import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: error.message,
      code: error.code
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
