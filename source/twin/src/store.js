import {openVaultRepository} from './repository.js';
const scope=new URL(import.meta.env.BASE_URL,location.href).pathname;
const repository=openVaultRepository('twin-v1-'+scope);
export const {readRecord,writeRecord,eraseRecord}=repository;
