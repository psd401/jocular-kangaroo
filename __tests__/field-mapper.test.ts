import { snakeToCamel, camelToSnake } from '@/lib/db/field-mapper';

describe('Field Mapper', () => {
  describe('snakeToCamel', () => {
    it('should convert snake_case to camelCase', () => {
      expect(snakeToCamel('first_name')).toBe('firstName');
      expect(snakeToCamel('last_name')).toBe('lastName');
      expect(snakeToCamel('special_education_status')).toBe('specialEducationStatus');
    });

    it('should handle single words', () => {
      expect(snakeToCamel('name')).toBe('name');
      expect(snakeToCamel('id')).toBe('id');
    });

    it('should handle empty string', () => {
      expect(snakeToCamel('')).toBe('');
    });
  });

  describe('camelToSnake', () => {
    it('should convert camelCase to snake_case', () => {
      expect(camelToSnake('firstName')).toBe('first_name');
      expect(camelToSnake('lastName')).toBe('last_name');
      expect(camelToSnake('specialEducationStatus')).toBe('special_education_status');
    });

    it('should handle single words', () => {
      expect(camelToSnake('name')).toBe('name');
      expect(camelToSnake('id')).toBe('id');
    });

    it('should handle empty string', () => {
      expect(camelToSnake('')).toBe('');
    });
  });
});