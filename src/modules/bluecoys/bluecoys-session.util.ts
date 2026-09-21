import { userPart } from '../../engine/identity/wa-id';
import { BLUECOYS_CONFIG_PHONE, BLUECOYS_CONFIG_USERNAME, type BluecoysSessionConfig } from './bluecoys.types';
import { digitsOnlyPhone } from './bluecoys-phone';

export function readBluecoysConfig(config: Record<string, unknown> | null | undefined): BluecoysSessionConfig | null {
  if (!config) return null;
  const username = config[BLUECOYS_CONFIG_USERNAME];
  const phone = config[BLUECOYS_CONFIG_PHONE];
  if (typeof username !== 'string' || !username.trim()) return null;
  if (typeof phone !== 'string' || !phone.trim()) return null;
  return { [BLUECOYS_CONFIG_USERNAME]: username, [BLUECOYS_CONFIG_PHONE]: phone };
}

export function phonesMatch(expectedDigits: string, linkedPhone: string): boolean {
  return digitsOnlyPhone(userPart(linkedPhone)) === digitsOnlyPhone(expectedDigits);
}
