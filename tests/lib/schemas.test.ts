import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  idSchema,
  createUserSchema,
  createLocationSchema,
  createShiftSchema,
} from '@/lib/schemas';

describe('Validation schemas', () => {
  describe('emailSchema', () => {
    it('accepts valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = emailSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('idSchema', () => {
    it('accepts valid CUID', () => {
      const result = idSchema.safeParse('clq1234567890abcdefghij');
      expect(result.success).toBe(true);
    });

    it('rejects invalid ID', () => {
      const result = idSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('accepts valid user data', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: 'EMPLOYEE',
        staffRole: 'DESK',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing name', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        password: '123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid role', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
        role: 'INVALID_ROLE',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createLocationSchema', () => {
    it('accepts valid location data', () => {
      const result = createLocationSchema.safeParse({
        name: 'Test Location',
        address: '123 Test St',
        latitude: 51.5074,
        longitude: -0.1278,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing name', () => {
      const result = createLocationSchema.safeParse({
        address: '123 Test St',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid latitude', () => {
      const result = createLocationSchema.safeParse({
        name: 'Test Location',
        latitude: 100, // Invalid: > 90
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid longitude', () => {
      const result = createLocationSchema.safeParse({
        name: 'Test Location',
        longitude: 200, // Invalid: > 180
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createShiftSchema', () => {
    it('accepts valid shift data', () => {
      const result = createShiftSchema.safeParse({
        title: 'Morning Shift',
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T17:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing title', () => {
      const result = createShiftSchema.safeParse({
        startTime: '2024-01-15T09:00:00.000Z',
        endTime: '2024-01-15T17:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });

    it('rejects end time before start time', () => {
      const result = createShiftSchema.safeParse({
        title: 'Invalid Shift',
        startTime: '2024-01-15T17:00:00.000Z',
        endTime: '2024-01-15T09:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });
  });
});
