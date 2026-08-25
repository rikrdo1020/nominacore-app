import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteEmployee, getEmployees, updateEmployee } from '../lib/api/employees';
import { queryKeys } from '../lib/query-keys';
import type { Employee } from '../types/api';

interface EditEmployeeFormValues {
  name: string;
}

const editSchema = yup.object({
  name: yup.string().trim().required('El nombre es requerido'),
});

export function useEmployees() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.list });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateEmployee(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.list });
      setEditingId(null);
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditEmployeeFormValues>({
    resolver: yupResolver(editSchema),
    defaultValues: { name: '' },
  });

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    resetEdit({ name: emp.name });
  };

  const onEditSubmit = handleEditSubmit((values) => {
    if (editingId == null) return;
    updateMutation.mutate({ id: editingId, name: values.name.trim() });
  });

  const removeEmployee = (id: number) => {
    if (!window.confirm('¿Desactivar este empleado?')) return;
    deleteMutation.mutate(id);
  };

  return {
    employees: employeesQuery.data ?? [],
    isLoading: employeesQuery.isLoading,
    loadError: employeesQuery.isError ? 'Error al cargar empleados' : null,
    removeEmployee,
    isDeleting: deleteMutation.isPending,
    editingId,
    editErrors,
    startEdit,
    cancelEdit: () => setEditingId(null),
    registerEdit,
    onEditSubmit,
    isEditing: updateMutation.isPending,
  };
}
