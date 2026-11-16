import React from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Modal({ title, children, onClose, footer }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn danger" onClick={onConfirm}>
            Delete
          </button>
        </>
      }
    >
      <div className="confirm-copy">{message}</div>
    </Modal>
  );
}

export function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`}>
      <span>{toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span>
      <div>{toast.message}</div>
      <button onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={28} />}
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
