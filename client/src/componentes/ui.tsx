import { ReactNode } from 'react';

// Pequeños componentes de interfaz reutilizables con la identidad SENA

export function Tarjeta({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

export function Boton({
  children,
  tipo = 'primario',
  ...props
}: {
  children: ReactNode;
  tipo?: 'primario' | 'secundario' | 'peligro' | 'fantasma';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const estilos = {
    primario:
      'bg-sena hover:bg-sena-oscuro text-white font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
    secundario:
      'bg-azul hover:bg-azul/90 text-white font-semibold shadow-sm disabled:opacity-50',
    peligro:
      'bg-white hover:bg-red-50 text-red-700 border border-red-300 font-medium disabled:opacity-50',
    fantasma: 'bg-white hover:bg-gray-50 text-azul border border-gray-300 font-medium',
  };
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer ${estilos[tipo]} ${props.className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function Insignia({
  children,
  color = 'verde',
}: {
  children: ReactNode;
  color?: 'verde' | 'amarillo' | 'azul' | 'gris' | 'celeste';
}) {
  const estilos = {
    verde: 'bg-green-100 text-green-800',
    amarillo: 'bg-amber-100 text-amber-800',
    azul: 'bg-azul text-white',
    gris: 'bg-gray-200 text-gray-700',
    celeste: 'bg-celeste/40 text-azul',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${estilos[color]}`}>
      {children}
    </span>
  );
}

export function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{etiqueta}</span>
      {children}
    </label>
  );
}

export const claseInput =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sena focus:border-sena bg-white';

export function MensajeError({ mensaje }: { mensaje: string }) {
  if (!mensaje) return null;
  return (
    <div role="alert" className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
      {mensaje}
    </div>
  );
}

export function MensajeExito({ mensaje }: { mensaje: string }) {
  if (!mensaje) return null;
  return (
    <div role="status" className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
      {mensaje}
    </div>
  );
}

export function Cargando() {
  return <p className="text-gray-500 text-sm py-8 text-center">Cargando...</p>;
}
