import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployees } from '../lib/api/employees';
import { deleteDeduction, getDeductions } from '../lib/api/deductions';
import { queryKeys } from '../lib/query-keys';

export function useDeductions() {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });

  const deductionsQuery = useQuery({
    queryKey: queryKeys.deductions.list(employeeId, filterStart || undefined, filterEnd || undefined),
    queryFn: () => getDeductions(Number(employeeId), filterStart || undefined, filterEnd || undefined),
    enabled: !!employeeId,
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
  const selectedEmployee = employees.find((e) => String(e.id) === employeeId) ?? null;

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, employeeSearch]);

  const selectEmployee = (id: number) => {
    setEmployeeId(String(id));
    setEmployeeSearch('');
  };

  const clearEmployee = () => {
    setEmployeeId('');
    setFilterStart('');
    setFilterEnd('');
  };

  return {
    filteredEmployees,
    employeeSearch,
    setEmployeeSearch,
    employeeId,
    selectedEmployee,
    selectEmployee,
    clearEmployee,
    deductions: deductionsQuery.data ?? [],
    isLoading: deductionsQuery.isLoading,
    loadError: deductionsQuery.isError ? 'Error al cargar descuentos' : null,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    removeDeduction,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.isError ? 'Error al eliminar' : null,
  };
}
