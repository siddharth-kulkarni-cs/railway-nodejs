import { mathService, CalculationInput } from './math.service';

describe('MathService', () => {
  describe('performCalculation', () => {
    it('should correctly add two numbers', () => {
      const input: CalculationInput = { operand1: 5, operand2: 3, operation: 'add' };
      expect(mathService.performCalculation(input)).toBe(8);
    });

    it('should correctly subtract two numbers', () => {
      const input: CalculationInput = { operand1: 5, operand2: 3, operation: 'subtract' };
      expect(mathService.performCalculation(input)).toBe(2);
    });

    it('should correctly multiply two numbers', () => {
      const input: CalculationInput = { operand1: 5, operand2: 3, operation: 'multiply' };
      expect(mathService.performCalculation(input)).toBe(15);
    });

    it('should correctly divide two numbers', () => {
      const input: CalculationInput = { operand1: 6, operand2: 3, operation: 'divide' };
      expect(mathService.performCalculation(input)).toBe(2);
    });

    it('should throw an error when dividing by zero', () => {
      const input: CalculationInput = { operand1: 6, operand2: 0, operation: 'divide' };
      expect(() => mathService.performCalculation(input)).toThrow('Division by zero is not allowed.');
    });

    it('should handle negative numbers correctly', () => {
      const inputAdd: CalculationInput = { operand1: -5, operand2: 3, operation: 'add' };
      expect(mathService.performCalculation(inputAdd)).toBe(-2);

      const inputMultiply: CalculationInput = { operand1: -5, operand2: -3, operation: 'multiply' };
      expect(mathService.performCalculation(inputMultiply)).toBe(15);
    });

    it('should throw an error for an unsupported operation', () => {
      const input: CalculationInput = { operand1: 6, operand2: 3, operation: 'modulo' };
      expect(() => mathService.performCalculation(input)).toThrow('Unsupported operation: modulo');
    });

    it('should handle decimal numbers correctly', () => {
        const input: CalculationInput = { operand1: 5.5, operand2: 2.5, operation: 'add' };
        expect(mathService.performCalculation(input)).toBe(8);

        const inputDivide: CalculationInput = { operand1: 5, operand2: 2, operation: 'divide' };
        expect(mathService.performCalculation(inputDivide)).toBe(2.5);
    });
  });
});
