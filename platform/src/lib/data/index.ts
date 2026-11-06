import type { DataSource } from '../types';
import { zohoConfigured } from '../zoho/auth';
import { mockSource } from './mock';
import { zohoSource } from './zoho';

/** DATA_MODE=mock يفرض البيانات التجريبية حتى لو المفاتيح موجودة */
export function getDataSource(): DataSource {
  if (process.env.DATA_MODE === 'mock') return mockSource;
  if (process.env.DATA_MODE === 'zoho' || zohoConfigured()) return zohoSource;
  return mockSource;
}
