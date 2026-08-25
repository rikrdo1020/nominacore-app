import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployees } from '../lib/api/employees';
import { getRateRules } from '../lib/api/rate-rules';
import { createEmployeeRate, getEmployeeRates, updateEmployeeRate } from '../lib/api/employee-rates';
import { queryKeys } from '../lib/query-keys';
import type { EmployeeRate, RateRule } from '../types/api';

export const DAYS = [
  { dow: 0, name: 'Lunes' },
  { dow: 1, name: 'Martes' },
  { dow: 2, name: 'Miércoles' },
  { dow: 3, name: 'Jueves' },
  { dow: 4, name: 'Viernes' },
  { dow: 5, name: 'Sábado' },
  { dow: 6, name: 'Domingo' },
];

export interface DayRateRow {
  isCustom: boolean;
  max_regular_hours: number;
  regular_rate: number;
  overtime_rate: number;
  lunch_duration: number;
}

interface EmployeeRatesFormValues {
  days: DayRateRow[];
}

export function useEmployeeRates() {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });

  const generalRulesQuery = useQuery({
    queryKey: queryKeys.rateRules.list,
    queryFn: getRateRules,
  });

  const employeeRatesQuery = useQuery({
    queryKey: queryKeys.employeeRates.byEmployee(selectedEmployee || 0),
    queryFn: () => getEmployeeRates(selectedEmployee || undefined),
    enabled: selectedEmployee !== '',
  });

  const employeeRates = employeeRatesQuery.data ?? [];
  const generalRules = generalRulesQuery.data ?? [];

  const { control, reset } = useForm<EmployeeRatesFormValues>({
    defaultValues: { days: DAYS.map(() => ({ isCustom: false, max_regular_hours: 8, regular_rate: 2.5, overtime_rate: 3, lunch_duration: 0.5 })) },
  });

  const getRateForDay = (dow: number): EmployeeRate | RateRule | undefined => {
    const custom = employeeRates.find((r) => r.day_of_week === dow && r.is_active);
    if (custom) return custom;
    return generalRules.find((r) => r.day_of_week === dow);
  };

  const hasCustomRate = (dow: number) => employeeRates.some((r) => r.day_of_week === dow && r.is_active);

  useEffect(() => {
    const days: DayRateRow[] = DAYS.map((day) => {
      const rate = getRateForDay(day.dow);
      return {
        isCustom: hasCustomRate(day.dow),
        max_regular_hours: rate?.max_regular_hours ?? 8,
        regular_rate: rate?.regular_rate ?? 2.5,
        overtime_rate: rate?.overtime_rate ?? 3,
        lunch_duration: rate?.lunch_duration ?? 0.5,
      };
    });
    reset({ days });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeRates, generalRules, reset]);

  const invalidateRates = () => {
    if (selectedEmployee === '') return;
    queryClient.invalidateQueries({ queryKey: queryKeys.employeeRates.byEmployee(selectedEmployee) });
  };

  const toggleMutation = useMutation({
    mutationFn: async (dow: number) => {
      const existing = employeeRates.find((r) => r.day_of_week === dow);
      if (existing) {
        return updateEmployeeRate(existing.id, { is_active: !existing.is_active });
      }
      const general = generalRules.find((r) => r.day_of_week === dow);
      return createEmployeeRate({
        employee_id: selectedEmployee as number,
        day_of_week: dow,
        max_regular_hours: general?.max_regular_hours ?? 8,
        regular_rate: general?.regular_rate ?? 2.5,
        overtime_rate: general?.overtime_rate ?? 3.0,
        lunch_duration: general?.lunch_duration ?? 0.5,
      });
    },
    onSuccess: invalidateRates,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      dow,
      field,
      value,
    }: {
      dow: number;
      field: 'max_regular_hours' | 'regular_rate' | 'overtime_rate' | 'lunch_duration';
      value: string;
    }) => {
      const existing = employeeRates.find((r) => r.day_of_week === dow);
      if (!existing) return Promise.resolve({ success: false });
      return updateEmployeeRate(existing.id, { [field]: parseFloat(value) || 0 });
    },
    onSuccess: invalidateRates,
  });

  const toggleDayRate = (dow: number) => {
    if (selectedEmployee === '') return;
    toggleMutation.mutate(dow);
  };

  const updateRate = (dow: number, field: 'max_regular_hours' | 'regular_rate' | 'overtime_rate' | 'lunch_duration', value: string) => {
    if (selectedEmployee === '') return;
    updateMutation.mutate({ dow, field, value });
  };

  const isBusy = toggleMutation.isPending || updateMutation.isPending;
  const error = toggleMutation.isError
    ? 'Error al modificar tarifa'
    : updateMutation.isError
      ? 'Error al actualizar tarifa'
      : employeeRatesQuery.isError
        ? 'Error al cargar tarifas del empleado'
        : null;

  return {
    employees: employeesQuery.data ?? [],
    selectedEmployee,
    setSelectedEmployee,
    control,
    hasCustomRate,
    toggleDayRate,
    updateRate,
    isLoading: employeeRatesQuery.isLoading,
    isBusy,
    error,
  };
}
