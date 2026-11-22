import { createHmac, timingSafeEqual } from 'node:crypto';

export function hashDeviceId(deviceId: string, pepper: string): string {
  return createHmac('sha256', pepper).update(deviceId).digest('hex');
}

export function deviceHashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
