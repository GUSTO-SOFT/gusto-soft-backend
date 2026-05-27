import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { errorBody } from '../common/utils/error-response';
import { MENU_IMAGES_DIR } from './product-images.service';

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

mkdirSync(MENU_IMAGES_DIR, { recursive: true });

export const productImageUploadOptions = {
  storage: diskStorage({
    destination: MENU_IMAGES_DIR,
    filename: (_req, file, callback) => {
      const ext = extname(file.originalname).toLowerCase();
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      callback(null, unique);
    },
  }),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const ext = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      callback(new BadRequestException(errorBody('IMAGEN_INVALIDA', 'Formato de imagen no permitido')), false);
      return;
    }
    callback(null, true);
  },
};
