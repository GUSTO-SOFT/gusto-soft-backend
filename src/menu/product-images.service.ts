import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { extname, join } from 'path';
import { errorBody } from '../common/utils/error-response';

export const MENU_IMAGES_DIR = join(process.cwd(), 'uploads', 'menu');

@Injectable()
export class ProductImagesService {
  buildPublicUrl(filename: string) {
    return `/menu/productos/imagenes/${filename}`;
  }

  getImage(filename: string) {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const path = join(MENU_IMAGES_DIR, safeName);
    if (!existsSync(path)) {
      throw new NotFoundException(errorBody('IMAGEN_NO_ENCONTRADA', 'Imagen no encontrada'));
    }

    return new StreamableFile(createReadStream(path), {
      type: this.contentType(path),
    });
  }

  private contentType(path: string) {
    const ext = extname(path).toLowerCase();
    if (ext === '.png') {
      return 'image/png';
    }
    if (ext === '.webp') {
      return 'image/webp';
    }
    return 'image/jpeg';
  }
}
