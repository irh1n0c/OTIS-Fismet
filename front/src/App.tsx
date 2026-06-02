// frontend/src/App.tsx
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { FormularioEnvio } from './pages/Formulario';
import { ListadoReportes } from './pages/ListadoReportes';
import { GestionEquipos } from './pages/EditarEquipos';
import { BuscarEquipo } from './pages/BuscarEquipo';
import { Login } from './pages/Login';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import './App.css';

import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { FileText, ListChecks } from 'lucide-react';

function AppContent() {
  const { user, logout } = useAuth();

  return (
      <div className="App min-h-screen bg-white-100">
        {/* HEADER: ELIMINAMOS max-w-7xl y mx-auto */}
        <header className="sticky top-0 z-50 bg-white shadow-sm py-4">
          {/* La navegación ocupa el 100% del ancho con padding horizontal */}
          <nav className="flex flex-col md:flex-row md:items-center md:justify-between px-4 sm:px-6 lg:px-8">
            <ul className="flex flex-col sm:flex-row justify-center sm:space-x-6 space-y-2 sm:space-y-0">

              <li className="w-full sm:w-auto">
                <Button asChild variant="ghost" className="w-full text-base text-cyan-900 hover:bg-blue-50/50">
                  <Link to="/">
                    <FileText className="mr-2 h-4 w-4" />
                    Nuevo Reporte
                  </Link>
                </Button>
              </li>

              <Separator orientation="vertical" className="hidden sm:block h-8 bg-gray-300" />

              <li className="w-full sm:w-auto">
                <Button asChild variant="ghost" className="w-full text-base text-gray-600 hover:bg-gray-50/50">
                  <Link to="/reportes">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Ver Reportes
                  </Link>
                </Button>
              </li>
              <Separator orientation="vertical" className="hidden sm:block h-8 bg-gray-300" />

              <li className="w-full sm:w-auto">
                <Button asChild variant="ghost" className="w-full text-base text-gray-600 hover:bg-gray-50/50">
                  <Link to="buscar-equipo">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Editar un Reporte
                  </Link>
                </Button>
              </li>
            </ul>
            <div className="mt-4 flex flex-col items-center justify-end gap-2 sm:mt-0 sm:flex-row">
              {user ? (
                <>
                  <span className="flex items-center gap-2 text-sm text-slate-700">
                    Holi,  {user.name}
                  </span>
                  <Button onClick={logout} variant="outline">
                    Cerrar sesión
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline">
                  <Link to="/login">Iniciar sesión</Link>
                </Button>
              )}
            </div>
          </nav>
        </header>

        {/* MAIN: ELIMINAMOS max-w-7xl y mx-auto */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><FormularioEnvio /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute><ListadoReportes /></ProtectedRoute>} />
            <Route path="/editar-reportes" element={<ProtectedRoute><GestionEquipos /></ProtectedRoute>} />
            <Route path="/buscar-equipo" element={<ProtectedRoute><BuscarEquipo /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
          </Routes>
        </main>
      </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;