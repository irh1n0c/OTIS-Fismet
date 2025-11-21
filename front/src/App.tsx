// frontend/src/App.tsx
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { FormularioEnvio } from './pages/Formulario';
import { ListadoReportes } from './pages/ListadoReportes';
import './App.css';

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText, ListChecks } from "lucide-react"; 

function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-white-100">
        
        {/* HEADER: ELIMINAMOS max-w-7xl y mx-auto */}
        <header className="sticky top-0 z-50 bg-white shadow-sm py-4">
          {/* La navegación ocupa el 100% del ancho con padding horizontal */}
          <nav className="px-4 sm:px-6 lg:px-8">
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
            </ul>
          </nav>
        </header>
        
        {/* MAIN: ELIMINAMOS max-w-7xl y mx-auto */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<FormularioEnvio />} />
            <Route path="/reportes" element={<ListadoReportes />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;