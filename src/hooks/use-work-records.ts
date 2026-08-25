import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployees } from '../lib/api/employees';
import { deleteWorkRecord, getWorkRecords } from '../lib/api/work-records';
import { queryKeys } from '../lib/query-keys';

export function useWorkRecords() {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });

  const recordsQuery = useQuery({
    queryKey: queryKeys.workRecords.list(employeeId, filterStart || undefined, filterEnd || undefined),
    queryFn: () => getWorkRecords(Number(employeeId), filterStart || undefined, filterEnd || undefined),
    enabled: !!employeeId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWorkRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workRecords'] });
    },
  });

  const removeRecord = (id: number) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
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
    employees,
    filteredEmployees,
    employeeSearch,
    setEmployeeSearch,
    employeeId,
    selectedEmployee,
    selectEmployee,
    clearEmployee,
    records: recordsQuery.data ?? [],
    isLoading: recordsQuery.isLoading,
    loadError: recordsQuery.isError ? 'Error al cargar registros' : null,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    removeRecord,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.isError ? 'Error al eliminar' : null,
  };
}
