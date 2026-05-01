import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { timeAgo } from '@/lib/formatters';
import type { Activity } from '@/lib/types';

interface ActivityFeedProps {
  activities: Activity[];
}

const typeIcons: Record<string, string> = {
  inward: '📦',
  order: '🛒',
  dispatch: '🚚',
  qc: '🔍',
  inventory: '📋',
  grn: '📥',
  finance: '💰',
  default: '📌',
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (!activities.length) {
    return (
      <Card>
        <Text className="text-gray-400 text-center py-4">No recent activities</Text>
      </Card>
    );
  }

  return (
    <View>
      {activities.slice(0, 8).map((activity, index) => (
        <View
          key={activity.id}
          className={`flex-row items-start py-3 ${
            index < activities.length - 1 ? 'border-b border-gray-50' : ''
          }`}
        >
          <View className="w-9 h-9 rounded-xl bg-gray-50 items-center justify-center mr-3 mt-0.5">
            <Text className="text-sm">{typeIcons[activity.type] || typeIcons.default}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-800" numberOfLines={2}>
              {activity.description}
            </Text>
            <View className="flex-row items-center mt-1 gap-2">
              <Text className="text-xs text-gray-400">{timeAgo(activity.timestamp)}</Text>
              {activity.status && <Badge status={activity.status} />}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
