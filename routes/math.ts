import { Router, Request, Response } from 'express';
import { mathService, CalculationInput } from '../services/math.service';

const router = Router();

router.post('/calculate', (req: Request, res: Response) => {
  const { operand1, operand2, operation } = req.body as CalculationInput;

  // Validate presence of required fields
  if (operand1 === undefined || operand2 === undefined || !operation) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: operand1, operand2, operation.'
    });
  }

  // Validate operand types
  if (typeof operand1 !== 'number' || typeof operand2 !== 'number') {
    return res.status(400).json({
      success: false,
      error: 'Invalid input: operand1 and operand2 must be numbers.'
    });
  }

  // Validate operation type
  const supportedOperations = ['add', 'subtract', 'multiply', 'divide'];
  if (typeof operation !== 'string' || !supportedOperations.includes(operation)) {
    return res.status(400).json({
      success: false,
      error: "Invalid input: operation must be one of 'add', 'subtract', 'multiply', 'divide'."
    });
  }

  try {
    const result = mathService.performCalculation({ operand1, operand2, operation });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Division by zero') || error.message.includes('Unsupported operation')) {
        return res.status(400).json({ success: false, error: error.message });
      }
    }
    // For other unexpected errors
    console.error('Calculation error:', error);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred during calculation.' });
  }
});

export default router;
