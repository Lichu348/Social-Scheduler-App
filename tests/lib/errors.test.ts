import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/lib/errors';

describe('Error classes', () => {
  describe('AppError', () => {
    it('creates error with message, status code, and code', () => {
      const error = new AppError('Test error', 500, 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('creates error without code', () => {
      const error = new AppError('Test error', 400);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('creates error with 400 status and VALIDATION_ERROR code', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('NotFoundError', () => {
    it('creates error with default message', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('creates error with custom message', () => {
      const error = new NotFoundError('User not found');
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('ForbiddenError', () => {
    it('creates error with default message', () => {
      const error = new ForbiddenError();
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('creates error with custom message', () => {
      const error = new ForbiddenError('Not allowed');
      expect(error.message).toBe('Not allowed');
    });
  });

  describe('ConflictError', () => {
    it('creates error with 409 status and CONFLICT code', () => {
      const error = new ConflictError('Resource already exists');
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });
});
