import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEmployees } from '../lib/api/employees';
import { deleteWorkRecord, getWorkRecords, getWorkRecordsAll } from '../lib/api/work-records';
import { queryKeys } from '../lib/query-keys';

export function useWorkRecords() {
  const queryClient = useQueryClient();
  const [filterEmp, setFilterEmp] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.list,
    queryFn: getEmployees,
  });

  const recordsQuery = useQuery({
    queryKey: queryKeys.workRecords.list(filterEmp, filterStart || undefined, filterEnd || undefined),
    queryFn: () =>
      filterEmp
        ? getWorkRecords(Number(filterEmp), filterStart || undefined, filterEnd || undefined)
        : getWorkRecordsAll(filterStart || undefined, filterEnd || undefined),
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
  const empName = (id: number) => employees.find((e) => e.id === id)?.name || `ID:${id}`;

  return {
    employees,
    records: recordsQuery.data ?? [],
    isLoading: recordsQuery.isLoading,
    loadError: recordsQuery.isError ? 'Error al cargar registros' : null,
    filterEmp,
    setFilterEmp,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    empName,
    removeRecord,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.isError ? 'Error al eliminar' : null,
  };
}
