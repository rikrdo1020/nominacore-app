import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRateRules, updateRateRule } from '../lib/api/rate-rules';
import { queryKeys } from '../lib/query-keys';
import type { RateRule } from '../types/api';

interface RateRulesFormValues {
  rules: RateRule[];
}

export function useRateRules() {
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: queryKeys.rateRules.list,
    queryFn: getRateRules,
  });

  const { control, reset } = useForm<RateRulesFormValues>({
    defaultValues: { rules: [] },
  });

  useEffect(() => {
    reset({ rules: rulesQuery.data ?? [] });
  }, [rulesQuery.data, reset]);

  const updateMutation = useMutation({
    mutationFn: (rule: RateRule) =>
      updateRateRule(rule.id, rule.max_regular_hours, rule.regular_rate, rule.overtime_rate, rule.lunch_duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rateRules.list });
    },
  });

  const updateField = (id: number, field: keyof RateRule, value: string) => {
    const rule = (rulesQuery.data ?? []).find((r) => r.id === id);
    if (!rule) return;
    updateMutation.mutate({ ...rule, [field]: parseFloat(value) || 0 });
  };

  return {
    rules: rulesQuery.data ?? [],
    isLoading: rulesQuery.isLoading,
    loadError: rulesQuery.isError ? 'Error al cargar tarifas' : null,
    control,
    updateField,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.isError ? 'Error al actualizar tarifa' : null,
  };
}
