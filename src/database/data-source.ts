import 'dotenv/config';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../config/database.config';

export const AppDataSource = new DataSource(createDataSourceOptions());
