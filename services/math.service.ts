export interface CalculationInput {
  operand1: number;
  operand2: number;
  operation: string;
}

export class MathService {
  performCalculation(input: CalculationInput): number {
    const { operand1, operand2, operation } = input;

    switch (operation) {
      case 'add':
        return operand1 + operand2;
      case 'subtract':
        return operand1 - operand2;
      case 'multiply':
        return operand1 * operand2;
      case 'divide':
        if (operand2 === 0) {
          throw new Error('Division by zero is not allowed.');
        }
        return operand1 / operand2;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }
}

export const mathService = new MathService();
