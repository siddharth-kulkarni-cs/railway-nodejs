// Example TypeScript service
import { User, ApiResponse } from '../types';

export class ExampleService {
  private users: User[] = [];

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const newUser: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date()
    };
    
    this.users.push(newUser);
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return this.users;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Export a singleton instance
export const exampleService = new ExampleService(); 