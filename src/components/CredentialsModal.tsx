import { useState } from 'react';
import './CredentialsModal.css';

interface CredentialsModalProps {
  title: string;
  username: string;
  password: string;
  onClose: () => void;
}

export default function CredentialsModal({ title, username, password, onClose }: CredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<'username' | 'password' | 'both' | null>(null);

  const copy = async (field: 'username' | 'password' | 'both', text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-panel" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="modal-subtitle">
          Copia estas credenciales y compártelas con el usuario. Deberá cambiar la contraseña
          la primera vez que inicie sesión.
        </p>

        <div className="form-group">
          <label>Usuario</label>
          <div className="credential-row">
            <input type="text" readOnly value={username} className="custom-input" />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy('username', username)}>
              {copiedField === 'username' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Contraseña temporal</label>
          <div className="credential-row">
            <input type="text" readOnly value={password} className="custom-input" />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => copy('password', password)}>
              {copiedField === 'password' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => copy('both', `usuario: ${username}\ncontraseña: ${password}`)}
          >
            {copiedField === 'both' ? 'Copiado' : 'Copiar todo'}
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
