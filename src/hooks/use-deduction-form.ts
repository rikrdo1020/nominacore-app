import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDeduction } from '../lib/api/deductions';

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

const defaultValues: DeductionFormValues = {
  employee_id: '',
  date: new Date().toISOString().split('T')[0],
  type: 'Comida',
  amount: '',
  description: '',
};

export function useDeductionForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeductionFormValues>({
    resolver: yupResolver(schema) as unknown as Resolver<DeductionFormValues>,
    defaultValues,
  });

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
      reset({ ...defaultValues, employee_id: values.employee_id });
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

  return {
    register,
    onSubmit,
    errors,
    isSubmitting: isSubmitting || createMutation.isPending,
    submitError,
  };
}
