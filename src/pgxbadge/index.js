import { createRegistry } from '../register.js';
import { PgxBadge } from './pgx-badge.js';

const registry = createRegistry();
registry.define('dbs-pgxbadge', PgxBadge);
