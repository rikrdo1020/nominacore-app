import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Resolver } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWorkRecord } from '../lib/api/work-records';
import { addHoursToTime, calcHours, formatMonthYear, getWeekDates } from '../utils/time';
import type { WorkRecord } from '../types/api';

export interface WorkRecordFormValues {
  employee_id: string;
  date: string;
  is_direct_entry: boolean;
  entry_time: string;
  exit_time: string;
  direct_hours: string;
  notes: string;
}

const schema = yup.object({
  employee_id: yup.string().required('El empleado es requerido'),
  date: yup.string().required('La fecha es requerida'),
  is_direct_entry: yup.boolean().required(),
  entry_time: yup.string().when('is_direct_entry', {
    is: false,
    then: (s) => s.required('La hora de entrada es requerida'),
  }),
  exit_time: yup.string().when('is_direct_entry', {
    is: false,
    then: (s) => s.required('La hora de salida es requerida'),
  }),
  direct_hours: yup.string().when('is_direct_entry', {
    is: true,
    then: (s) =>
      s
        .required('Las horas trabajadas son requeridas')
        .test('positive', 'Debe ser mayor a 0', (v) => !!v && parseFloat(v) > 0),
  }),
  notes: yup.string(),
});

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const defaultValues: WorkRecordFormValues = {
  employee_id: '',
  date: today(),
  is_direct_entry: false,
  entry_time: '08:00',
  exit_time: '17:00',
  direct_hours: '8',
  notes: '',
};

export function useWorkRecordForm(employeeId: string) {
  const queryClient = useQueryClient();
  const [justSaved, setJustSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WorkRecordFormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<WorkRecordFormValues>,
    defaultValues: { ...defaultValues, employee_id: employeeId },
  });

  const isDirectEntry = watch('is_direct_entry');
  const entryTime = watch('entry_time');
  const exitTime = watch('exit_time');
  const directHours = watch('direct_hours');
  const date = watch('date');

  const computedHours = isDirectEntry
    ? (directHours && parseFloat(directHours) > 0 ? parseFloat(directHours).toFixed(2) : null)
    : (entryTime && exitTime ? calcHours(entryTime, exitTime) : null);

  const weekDays = getWeekDates(date);
  const monthLabel = formatMonthYear(date);

  // Switching to a different employee starts a fresh entry for them.
  useEffect(() => {
    if (employeeId) reset({ ...defaultValues, employee_id: employeeId });
  }, [employeeId, reset]);

  const createMutation = useMutation({
    mutationFn: (values: WorkRecordFormValues) => {
      const record: Omit<WorkRecord, 'id' | 'created_at'> = {
        employee_id: Number(values.employee_id),
        date: values.date,
        is_direct_entry: values.is_direct_entry ? 1 : 0,
        entry_time: values.is_direct_entry ? null : values.entry_time,
        exit_time: values.is_direct_entry ? null : values.exit_time,
        direct_hours: values.is_direct_entry ? parseFloat(values.direct_hours) : null,
        notes: values.notes || null,
      };
      return addWorkRecord(record);
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['workRecords'] });
      // Keep the same employee and advance one day so a full week can be
      // entered back-to-back without re-touching employee/date each time.
      reset({
        ...defaultValues,
        employee_id: values.employee_id,
        date: addDays(values.date, 1),
        is_direct_entry: values.is_direct_entry,
      });
      setFocus(values.is_direct_entry ? 'direct_hours' : 'entry_time');
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

  const submitError = createMutation.isError ? 'Error al guardar registro' : null;

  const selectDay = (iso: string) => setValue('date', iso, { shouldValidate: true });
  const shiftWeek = (dir: 1 | -1) => setValue('date', addDays(date, dir * 7), { shouldValidate: true });
  const jumpToDate = (iso: string) => setValue('date', iso, { shouldValidate: true });
  const applyHoursPreset = (hours: number) => setValue('direct_hours', String(hours), { shouldValidate: true });
  const applyEntryPreset = (time: string) => setValue('entry_time', time, { shouldValidate: true });
  const applyExitDurationPreset = (hours: number) =>
    setValue('exit_time', addHoursToTime(entryTime || '08:00', hours), { shouldValidate: true });

  return {
    register,
    onSubmit,
    errors,
    isDirectEntry,
    setValue,
    date,
    weekDays,
    monthLabel,
    selectDay,
    shiftWeek,
    jumpToDate,
    computedHours,
    applyHoursPreset,
    applyEntryPreset,
    applyExitDurationPreset,
    justSaved,
    isSubmitting: isSubmitting || createMutation.isPending,
    submitError,
  };
}
