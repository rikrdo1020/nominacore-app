import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../lib/api/auth';
import { queryKeys } from '../lib/query-keys';

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const schema = yup.object({
  currentPassword: yup.string().required('La contraseña actual es requerida'),
  newPassword: yup.string().min(8, 'Mínimo 8 caracteres').required('La nueva contraseña es requerida'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Las contraseñas no coinciden')
    .required('Confirma la nueva contraseña'),
});

const defaultValues: ChangePasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function useChangePasswordForm() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const changeMutation = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword(values.currentPassword, values.newPassword),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      navigate('/employees', { replace: true });
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await changeMutation.mutateAsync(values);
    } catch {
      // surfaced below via submitError
    }
  });

  const submitError = changeMutation.isError
    ? changeMutation.error instanceof Error && changeMutation.error.message.includes('400')
      ? 'La contraseña actual no es correcta'
      : 'No se pudo cambiar la contraseña'
    : null;

  return {
    register,
    onSubmit,
    errors,
    isSubmitting: isSubmitting || changeMutation.isPending,
    submitError,
  };
}
