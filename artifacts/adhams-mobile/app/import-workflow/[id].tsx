import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useImportWorkflow, useCompleteImportStage } from '@/hooks/usePurchaseOrders';
import { useAuthStore } from '@/store/authStore';
import { hasPermission } from '@/lib/roles';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SkeletonList } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatDate } from '@/lib/formatters';
import Toast from 'react-native-toast-message';
import { useState } from 'react';

const STAGE_NAMES = [
  'Proforma Invoice',
  'Advance Payment',
  'Container Loading',
  'Remaining Payment',
  'Unloading & QC',
  'Stocking',
];

export default function ImportWorkflowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canWrite = user?.role ? hasPermission(user.role, 'write_inventory') : false;

  const { data: workflow, isLoading, isError, refetch, isRefetching } = useImportWorkflow(Number(id));
  const completeStage = useCompleteImportStage();

  const [completeId, setCompleteId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    if (completeId === null) return;
    completeStage.mutate(
      { poId: Number(id), stageId: completeId, notes, completedBy: user?.name },
      {
        onSuccess: () => { Toast.show({ type: 'success', text1: 'Stage completed!' }); setCompleteId(null); setNotes(''); },
        onError: (err) => Toast.show({ type: 'error', text1: 'Failed', text2: err.message }),
      }
    );
  };

  if (isLoading) return <SafeAreaView className="flex-1 bg-background"><SkeletonList count={6} /></SafeAreaView>;
  if (isError || !workflow) return <SafeAreaView className="flex-1 bg-background"><ErrorState onRetry={refetch} /></SafeAreaView>;

  const completedCount = workflow.stages?.filter((s) => s.status === 'completed').length || 0;
  const totalStages = workflow.totalStages || 6;
  const progressPercent = (completedCount / totalStages) * 100;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center px-5 pt-4 pb-3">
          <Button title="← Back" variant="ghost" size="sm" onPress={() => router.back()} />
          <Text className="text-xl font-bold text-gray-900 ml-2">Import Workflow</Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FF3C00" />}>

          {/* Progress Bar */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Card>
              <Text className="text-sm font-bold text-gray-900 mb-2">
                Progress: {completedCount}/{totalStages} stages
              </Text>
              <View className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Stages */}
          {(workflow.stages || STAGE_NAMES.map((name, i) => ({
            id: i + 1, stageNumber: i + 1, name, status: 'pending', completedAt: undefined, completedBy: undefined, notes: undefined,
          }))).map((stage, index) => {
            const isCompleted = stage.status === 'completed';
            const isPending = stage.status === 'pending';
            const isNext = !isCompleted && index === completedCount;

            return (
              <Animated.View key={stage.id} entering={FadeInDown.delay(200 + index * 80).springify()}>
                <Card className={`mt-3 ${isNext ? 'border-primary border-2' : ''}`}>
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1">
                      <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${isCompleted ? 'bg-success' : isNext ? 'bg-primary' : 'bg-gray-200'}`}>
                        <Text className="text-white text-xs font-bold">
                          {isCompleted ? '✓' : stage.stageNumber || index + 1}
                        </Text>
                      </View>
                      <Text className={`text-sm font-semibold ${isCompleted ? 'text-gray-400' : 'text-gray-900'}`}>
                        {stage.name || STAGE_NAMES[index] || `Stage ${index + 1}`}
                      </Text>
                    </View>
                    <Badge status={stage.status} />
                  </View>

                  {isCompleted && stage.completedAt && (
                    <Text className="text-[10px] text-gray-400 ml-11">
                      Completed: {formatDate(stage.completedAt)} {stage.completedBy ? `by ${stage.completedBy}` : ''}
                    </Text>
                  )}

                  {stage.notes && (
                    <Text className="text-xs text-gray-500 ml-11 mt-1">{stage.notes}</Text>
                  )}

                  {isNext && canWrite && (
                    <View className="mt-3 ml-11">
                      <Button title="Complete Stage" size="sm" onPress={() => setCompleteId(stage.id)} />
                    </View>
                  )}
                </Card>
              </Animated.View>
            );
          })}
        </ScrollView>

        <Modal visible={completeId !== null} onClose={() => setCompleteId(null)} title="Complete Stage">
          <View className="pb-8">
            <Input label="Notes" placeholder="Enter notes..." value={notes} onChangeText={setNotes} multiline />
            <Button title="Mark Complete" onPress={handleComplete} loading={completeStage.isPending} fullWidth size="lg" variant="success" />
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}
