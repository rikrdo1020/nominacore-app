import { useLoginForm } from '../hooks/use-login-form';
import PasswordInput from '../components/PasswordInput';
import { version } from '../../package.json';
import './Login.css';

export default function Login() {
  const { register, onSubmit, errors, isSubmitting, authError } = useLoginForm();

  return (
    <div className="login-screen">
      <aside className="login-brand">
        <h1>NominaCore</h1>
        <p>Control de horas y pagos de empleados</p>
        <span className="login-version">v{version}</span>
        <div className="login-brand-accent" />
      </aside>

      <section className="login-panel">
        <form className="login-form" onSubmit={onSubmit} noValidate>
          <h2>Iniciar sesión</h2>
          <p className="login-subtitle">Ingresa tus credenciales para continuar</p>

          {authError && <div className="alert alert-error">{authError}</div>}

          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
              {...register('username')}
            />
            {errors.username && <span className="field-error">{errors.username.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              disabled={isSubmitting}
              {...register('password')}
            />
            {errors.password && <span className="field-error">{errors.password.message}</span>}
          </div>

          <button type="submit" className="btn btn-primary login-submit" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" /> : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  );
}
