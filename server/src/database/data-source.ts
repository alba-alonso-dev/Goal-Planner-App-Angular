import { DataSource } from 'typeorm';
import { loadConfig } from '../config/app-config.js';
import { typeOrmOptions } from './typeorm-options.js';

/** DataSource para el CLI de TypeORM (p. ej. `npm run migration:run`). */
export default new DataSource(typeOrmOptions(loadConfig().databaseUrl));
