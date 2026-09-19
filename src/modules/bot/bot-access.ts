import { userPart } from '../../engine/identity/wa-id';

export enum BotAccessMode {
  ALL = 'all',
  ALLOW = 'allow',
  BLOCK = 'block',
}

export function senderMatchesList(list: string[] | null | undefined, sender: string): boolean {
  if (!list?.length) return false;
  const needle = userPart(sender).toLowerCase();
  if (!needle) return false;
  return list.some(item => {
    const itemPart = userPart(item).toLowerCase();
    return itemPart !== '' && (itemPart === needle || item.trim().toLowerCase() === sender.trim().toLowerCase());
  });
}

/** Access lists win before any rule/command condition. Empty allow-list in allow mode denies all. */
export function senderIsAllowed(
  mode: BotAccessMode | string | null | undefined,
  allowList: string[] | null | undefined,
  blockList: string[] | null | undefined,
  sender: string | null | undefined,
): boolean {
  if (!sender) return false;
  if (senderMatchesList(blockList, sender)) return false;
  if (mode === BotAccessMode.ALLOW) return senderMatchesList(allowList, sender);
  return true;
}
