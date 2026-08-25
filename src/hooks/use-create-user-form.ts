import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '../lib/api/users';
import { queryKeys } from '../lib/query-keys';
import type { UserRole } from '../types/api';

interface CreateUserFormValues {
  username: string;
  role: UserRole;
}

const schema = yup.object({
  username: yup.string().trim().min(3, 'Mínimo 3 caracteres').required('El usuario es requerido'),
  role: yup
    .mixed<UserRole>()
    .oneOf(['SUPER_ADMIN', 'ADMIN'])
    .required('El rol es requerido'),
});

const defaultValues: CreateUserFormValues = { username: '', role: 'ADMIN' };

export function useCreateUserForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateUserFormValues) =>
      createUser({ username: values.username.trim(), role: values.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list });
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

  const submitError = createMutation.isError
    ? createMutation.error instanceof Error && createMutation.error.message.includes('409')
      ? 'Ese nombre de usuario ya existe'
      : 'No se pudo crear el usuario'
    : null;

  return {
    register,
    onSubmit,
    errors,
    isSubmitting: isSubmitting || createMutation.isPending,
    submitError,
    credentials: createMutation.data ?? null,
    clearCredentials: () => createMutation.reset(),
  };
}
