export function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function sessionNameForUsername(username: string): string {
  const slug = username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const name = `bc-${slug}`.slice(0, 50);
  if (name.length < 3) {
    throw new Error('username must yield a session name of at least 3 characters');
  }
  return name;
}
