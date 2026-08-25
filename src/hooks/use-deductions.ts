import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployees } from '../lib/api/employees';
import { deleteDeduction, getDeductions } from '../lib/api/deductions';
import { queryKeys } from '../lib/query-keys';

export function useDeductions() {
  const queryClient = useQueryClient();
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });

  const deductionsQuery = useQuery({
    queryKey: queryKeys.deductions.list(filterEmp, filterStart || undefined, filterEnd || undefined),
    queryFn: () => getDeductions(filterEmp ? Number(filterEmp) : null, filterStart || undefined, filterEnd || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDeduction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deductions'] });
    },
  });

  const removeDeduction = (id: number) => {
    if (!window.confirm('¿Eliminar este descuento?')) return;
    deleteMutation.mutate(id);
  };

  const employees = employeesQuery.data ?? [];
  const empName = (id: number) => employees.find((e) => e.id === id)?.name || `ID:${id}`;

  return {
    employees,
    deductions: deductionsQuery.data ?? [],
    isLoading: deductionsQuery.isLoading,
    loadError: deductionsQuery.isError ? 'Error al cargar descuentos' : null,
    filterEmp,
    setFilterEmp,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    empName,
    removeDeduction,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.isError ? 'Error al eliminar' : null,
  };
}
