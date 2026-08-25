import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import type { Resolver } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addWorkRecord } from '../lib/api/work-records';
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

const defaultValues: WorkRecordFormValues = {
  employee_id: '',
  date: new Date().toISOString().split('T')[0],
  is_direct_entry: false,
  entry_time: '08:00',
  exit_time: '17:00',
  direct_hours: '8',
  notes: '',
};

export function useWorkRecordForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WorkRecordFormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<WorkRecordFormValues>,
    defaultValues,
  });

  const isDirectEntry = watch('is_direct_entry');

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
      reset({ ...defaultValues, employee_id: values.employee_id, date: values.date });
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

  return {
    register,
    onSubmit,
    errors,
    setValue,
    isDirectEntry,
    isSubmitting: isSubmitting || createMutation.isPending,
    submitError,
  };
}
