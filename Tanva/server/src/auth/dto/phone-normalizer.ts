import type { TransformFnParams } from 'class-transformer';

function extractMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  const match = digits.match(/1[3-9]\d{9}$/);
  return match ? match[0] : digits;
}

export function normalizePhone({ value }: TransformFnParams) {
  if (typeof value !== 'string') return value;
  return extractMobile(value.trim());
}

