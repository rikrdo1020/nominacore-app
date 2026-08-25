import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteUser, getUsers } from '../lib/api/users';
import { queryKeys } from '../lib/query-keys';
import { useAuth } from '../context/AuthContext';

export function useUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list,
    queryFn: getUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.list });
    },
  });

  const removeUser = (id: number, username: string) => {
    if (!window.confirm(`¿Desactivar al usuario "${username}"?`)) return;
    deleteMutation.mutate(id);
  };

  return {
    users: usersQuery.data ?? [],
    isLoading: usersQuery.isLoading,
    loadError: usersQuery.isError
      ? usersQuery.error instanceof Error
        ? usersQuery.error.message
        : 'Error al cargar usuarios'
      : null,
    currentUserId: currentUser?.id ?? null,
    removeUser,
    isDeleting: deleteMutation.isPending,
    deletingId: (deleteMutation.variables as number | undefined) ?? null,
    deleteError: deleteMutation.isError
      ? deleteMutation.error instanceof Error
        ? deleteMutation.error.message
        : 'No se pudo desactivar el usuario'
      : null,
  };
}
