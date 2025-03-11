/**
 * File upload middleware configuration
 * Uses multer for handling multipart/form-data
 */

import multer from 'multer';

/**
 * Configure multer for memory storage
 */
const storage = multer.memoryStorage();

/**
 * File filter to only allow images
 */
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image file.'));
  }
};

/**
 * Export the configured multer instance
 */
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});
