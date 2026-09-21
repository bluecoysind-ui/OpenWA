import { OpenWAError } from '../openwa-api';

export type AkgErrorKind = 'engine' | 'missing' | 'rate' | 'forbidden' | 'generic';

export function describeAkgError(error: unknown): { kind: AkgErrorKind; message: string } {
  if (error instanceof OpenWAError) {
    if (error.status === 501) {
      return { kind: 'engine', message: error.message || 'Not supported by this engine.' };
    }
    if (error.status === 404) {
      return { kind: 'missing', message: error.message || 'This feature is turned off or the resource was not found.' };
    }
    if (error.status === 429) {
      return { kind: 'rate', message: error.message || 'Rate limited. Wait and retry.' };
    }
    if (error.status === 403) {
      return { kind: 'forbidden', message: 'This API key cannot perform that write. Use an operator or admin key.' };
    }
    return { kind: 'generic', message: error.message || `HTTP ${error.status}` };
  }
  return { kind: 'generic', message: error instanceof Error ? error.message : 'Request failed' };
}

export function isViewerRole(role: string): boolean {
  return role.trim().toLowerCase() === 'viewer';
}
