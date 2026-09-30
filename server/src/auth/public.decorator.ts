import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marca un endpoint como accesible sin sesión (por defecto todos la requieren). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
