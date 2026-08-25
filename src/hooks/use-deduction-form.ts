import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDeduction } from '../lib/api/deductions';
import { formatMonthYear, getWeekDates } from '../utils/time';

export interface DeductionFormValues {
  employee_id: string;
  date: string;
  type: 'Comida' | 'Vales' | 'Otro';
  amount: string;
  description: string;
}

const schema = yup.object({
  employee_id: yup.string().required('El empleado es requerido'),
  date: yup.string().required('La fecha es requerida'),
  type: yup.mixed<'Comida' | 'Vales' | 'Otro'>().oneOf(['Comida', 'Vales', 'Otro']).required(),
  amount: yup
    .string()
    .required('El monto es requerido')
    .test('positive', 'Debe ser mayor a 0', (v) => !!v && parseFloat(v) > 0),
  description: yup.string(),
});

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const defaultValues: DeductionFormValues = {
  employee_id: '',
  date: today(),
  type: 'Comida',
  amount: '',
  description: '',
};

const AMOUNT_PRESETS = [2, 5, 10, 20];

export function useDeductionForm(employeeId: string) {
  const queryClient = useQueryClient();
  const [justSaved, setJustSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeductionFormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<DeductionFormValues>,
    defaultValues: { ...defaultValues, employee_id: employeeId },
  });

  const type = watch('type');
  const date = watch('date');
  const weekDays = getWeekDates(date);
  const monthLabel = formatMonthYear(date);

  // Switching to a different employee starts a fresh entry for them.
  useEffect(() => {
    if (employeeId) reset({ ...defaultValues, employee_id: employeeId });
  }, [employeeId, reset]);

  const createMutation = useMutation({
    mutationFn: (values: DeductionFormValues) =>
      addDeduction({
        employee_id: Number(values.employee_id),
        date: values.date,
        type: values.type,
        amount: parseFloat(values.amount),
        description: values.description || null,
      }),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
      // Keep employee and date so a second deduction the same day (e.g.
      // Comida then Vales) doesn't need either field re-entered.
      reset({ ...defaultValues, employee_id: values.employee_id, date: values.date });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
    } catch {
      // surfaced below via createMutation.error / submitError
    }
  });

  const submitError = createMutation.isError ? 'Error al registrar descuento' : null;

  const selectDay = (iso: string) => setValue('date', iso, { shouldValidate: true });
  const shiftWeek = (dir: 1 | -1) => setValue('date', addDays(date, dir * 7), { shouldValidate: true });
  const jumpToDate = (iso: string) => setValue('date', iso, { shouldValidate: true });
  const applyAmountPreset = (amount: number) => setValue('amount', String(amount), { shouldValidate: true });

  return {
    register,
    onSubmit,
    errors,
    setValue,
    type,
    date,
    weekDays,
    monthLabel,
    selectDay,
    shiftWeek,
    jumpToDate,
    amountPresets: AMOUNT_PRESETS,
    applyAmountPreset,
    justSaved,
    isSubmitting: isSubmitting || createMutation.isPending,
    submitError,
  };
}
