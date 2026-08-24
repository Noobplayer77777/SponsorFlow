import { logActivity } from './activity.service';
import prisma from '../utils/prisma';

// Mock prisma
jest.mock('../utils/prisma', () => ({
  activity: {
    create: jest.fn()
  }
}));

describe('Activity Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log an activity successfully', async () => {
    (prisma.activity.create as jest.Mock).mockResolvedValue({ id: '123' });

    await logActivity('company-123', 'TEST_TYPE', 'Test Description', 'user-456');

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: {
        companyId: 'company-123',
        userId: 'user-456',
        type: 'TEST_TYPE',
        description: 'Test Description'
      }
    });
  });

  it('should not throw if logging fails (non-blocking)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (prisma.activity.create as jest.Mock).mockRejectedValue(new Error('DB Error'));

    await expect(
      logActivity('company-123', 'TEST_TYPE', 'Test Description', 'user-456')
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
