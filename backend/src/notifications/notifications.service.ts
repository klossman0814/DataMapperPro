import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationsDto } from './dto/update-notifications.dto';

export interface NotificationPreferences {
  jobCompleted: boolean;
  jobFailed: boolean;
  weeklySummary: boolean;
  weeklySummaryDay: string;
  weeklySummaryTime: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  jobCompleted: true,
  jobFailed: true,
  weeklySummary: false,
  weeklySummaryDay: 'monday',
  weeklySummaryTime: '09:00',
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user?.notificationPreferences) {
      return { ...DEFAULT_PREFERENCES };
    }

    const stored = user.notificationPreferences as Record<string, any>;
    return {
      ...DEFAULT_PREFERENCES,
      ...stored,
    };
  }

  async updatePreferences(userId: string, dto: UpdateNotificationsDto): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const merged = { ...current, ...dto };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: JSON.parse(JSON.stringify(merged)),
      },
    });

    return merged;
  }
}
