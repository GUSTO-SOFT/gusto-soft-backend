import { Controller, Get, Param } from '@nestjs/common';
import { ProductImagesService } from './product-images.service';

@Controller('menu/productos/imagenes')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Get(':filename')
  getImage(@Param('filename') filename: string) {
    return this.productImagesService.getImage(filename);
  }
}
