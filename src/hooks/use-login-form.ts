import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../context/AuthContext';

interface LoginFormValues {
  username: string;
  password: string;
}

const schema = yup.object({
  username: yup.string().trim().required('El usuario es requerido'),
  password: yup.string().required('La contraseña es requerida'),
});

export function useLoginForm() {
  const { login } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setAuthError(null);
    try {
      await login(values.username.trim(), values.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setAuthError(
        message.includes('401')
          ? 'Usuario o contraseña incorrectos'
          : 'No se pudo iniciar sesión. Verifica tu conexión.'
      );
    }
  });

  return { register, onSubmit, errors, isSubmitting, authError };
}
