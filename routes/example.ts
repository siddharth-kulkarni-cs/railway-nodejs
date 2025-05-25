// Example TypeScript route
import { Router } from 'express';
import { exampleService } from '../services/example.service';
import { RequestHandler } from '../types';

const router = Router();

// GET all users
const getAllUsers: RequestHandler = async (req, res) => {
  try {
    const users = await exampleService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// GET user by ID
const getUserById: RequestHandler = async (req, res) => {
  try {
    const user = await exampleService.getUser(req.params.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// POST create new user
const createUser: RequestHandler = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      res.status(400).json({ 
        success: false, 
        error: 'Name and email are required' 
      });
      return;
    }
    
    const newUser = await exampleService.createUser({ name, email });
    res.status(201).json({ success: true, data: newUser });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

// Register routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);

export default router; 