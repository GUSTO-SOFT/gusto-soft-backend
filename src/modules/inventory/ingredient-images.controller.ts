import { Controller, Get, Param } from '@nestjs/common';
import { IngredientImagesService } from './ingredient-images.service';

@Controller('inventario/ingredientes/imagenes')
export class IngredientImagesController {
  constructor(private readonly ingredientImagesService: IngredientImagesService) {}

  @Get(':filename')
  getImage(@Param('filename') filename: string) {
    return this.ingredientImagesService.getImage(filename);
  }
}
