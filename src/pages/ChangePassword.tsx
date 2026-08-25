import { useChangePasswordForm } from '../hooks/use-change-password-form';
import PasswordInput from '../components/PasswordInput';
import './Login.css';

export default function ChangePassword() {
  const { register, onSubmit, errors, isSubmitting, submitError } = useChangePasswordForm();

  return (
    <div className="login-screen">
      <aside className="login-brand">
        <h1>NominaCore</h1>
        <p>Control de horas y pagos de empleados</p>
        <div className="login-brand-accent" />
      </aside>

      <section className="login-panel">
        <form className="login-form" onSubmit={onSubmit} noValidate>
          <h2>Cambia tu contraseña</h2>
          <p className="login-subtitle">
            Por seguridad, debes elegir una nueva contraseña antes de continuar.
          </p>

          {submitError && <div className="alert alert-error">{submitError}</div>}

          <div className="form-group">
            <label htmlFor="currentPassword">Contraseña actual</label>
            <PasswordInput
              id="currentPassword"
              autoComplete="current-password"
              autoFocus
              disabled={isSubmitting}
              {...register('currentPassword')}
            />
            {errors.currentPassword && <span className="field-error">{errors.currentPassword.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">Nueva contraseña</label>
            <PasswordInput
              id="newPassword"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register('newPassword')}
            />
            {errors.newPassword && <span className="field-error">{errors.newPassword.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              disabled={isSubmitting}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword.message}</span>}
          </div>

          <button type="submit" className="btn btn-primary login-submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" /> : 'Cambiar contraseña'}
          </button>
        </form>
      </section>
    </div>
  );
}
