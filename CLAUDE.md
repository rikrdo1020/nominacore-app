# NominaCore App — Frontend Conventions

Electron + React renderer. These rules apply to every feature added under
`src/` in this project.

## Hard rules

1. **No raw `window.api` (or `fetch`) calls inside components.** Every call
   to the Electron bridge is wrapped in a function under `src/lib/api/`.
2. **No `useState` for form state.** React Hook Form owns form state via
   `useForm`. Validation is a Yup schema resolved with `yupResolver`.
3. **No TanStack Query calls (`useQuery`/`useMutation`) directly inside a
   page or component.** They live in a `hooks/use-*.ts` hook. Pages only
   compose hooks and render.

## Layer stack (bottom to top)

```
src/lib/api/<resource>.ts      thin wrapper functions around window.api.*
src/lib/query-keys.ts          central registry of TanStack Query keys
src/hooks/use-<resource>.ts    useQuery + useMutation, invalidates on success
src/hooks/use-<resource>-form.ts   useForm + yupResolver + useMutation
src/pages/<Page>.tsx           composes the hooks above, renders only
```

Canonical reference implementation — copy this shape for any new resource:
- [src/lib/api/users.ts](src/lib/api/users.ts)
- [src/lib/query-keys.ts](src/lib/query-keys.ts)
- [src/hooks/use-users.ts](src/hooks/use-users.ts)
- [src/hooks/use-create-user-form.ts](src/hooks/use-create-user-form.ts)
- [src/pages/Users.tsx](src/pages/Users.tsx)

## Minimal example (condensed from the users slice)

```ts
// lib/api/things.ts
export function getThings(): Promise<Thing[]> {
  return window.api.getThings();
}
export function createThing(dto: { name: string }): Promise<{ id: number }> {
  return window.api.createThing(dto);
}
```

```ts
// lib/query-keys.ts
export const queryKeys = {
  things: { list: ['things', 'list'] as const },
};
```

```ts
// hooks/use-things.ts
export function useThings() {
  const query = useQuery({ queryKey: queryKeys.things.list, queryFn: getThings });
  return { things: query.data ?? [], isLoading: query.isLoading };
}
```

```ts
// hooks/use-create-thing-form.ts
const schema = yup.object({ name: yup.string().trim().required('El nombre es requerido') });

export function useCreateThingForm() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm({ resolver: yupResolver(schema), defaultValues: { name: '' } });

  const createMutation = useMutation({
    mutationFn: createThing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.things.list });
      reset();
    },
  });

  const onSubmit = handleSubmit((values) => createMutation.mutateAsync(values));
  return { register, onSubmit, errors, isSubmitting: isSubmitting || createMutation.isPending };
}
```

```tsx
// pages/Things.tsx
export default function Things() {
  const { things, isLoading } = useThings();
  const { register, onSubmit, errors, isSubmitting } = useCreateThingForm();
  // render only — no useState, no window.api, no useQuery/useMutation here
}
```

## Notes

- Query keys that vary by filter params use a factory function, e.g.
  `workRecords: { list: (empId, start?, end?) => ['workRecords', empId, start, end] as const }`.
  Invalidate the whole family with the key prefix:
  `queryClient.invalidateQueries({ queryKey: ['workRecords'] })`.
- Validation error messages are in Spanish, matching existing copy
  (e.g. `'El usuario es requerido'`, `'Mínimo 3 caracteres'`).
- An inline-editable table with no discrete submit button (see
  `RateRules.tsx`, `EmployeeRates.tsx`) doesn't need a Yup schema — wire the
  `useQuery`/`useMutation` pair directly, still through a `hooks/use-*.ts` hook.
