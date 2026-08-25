import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addEmployee } from '../lib/api/employees';
import { queryKeys } from '../lib/query-keys';

interface EmployeeFormValues {
  name: string;
}

const schema = yup.object({
  name: yup.string().trim().required('El nombre es requerido'),
});

const defaultValues: EmployeeFormValues = { name: '' };

export function useEmployeeForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: (values: EmployeeFormValues) => addEmployee(values.name.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.list });
      reset(defaultValues);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createMutation.mutateAsync(values);
    } catch {
      // surfaced below via createMutation.error / submitError
    }
  });

  const submitError = createMutation.isError ? 'Error al agregar empleado' : null;

  return {
    register,
    onSubmit,
    errors,
    isSubmitting: isSubmitting || createMutation.isPending,
    submitError,
  };
}
