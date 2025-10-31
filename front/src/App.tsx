// frontend/src/App.tsx
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { FormularioEnvio } from './pages/Formulario';
import { ListadoReportes } from './pages/ListadoReportes';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav style={{ 
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            marginBottom: '2rem'
          }}>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              gap: '2rem',
              justifyContent: 'center'
            }}>
              <li>
                <Link to="/" style={{ 
                  textDecoration: 'none',
                  color: '#007bff',
                  fontWeight: 'bold'
                }}>
                  Nuevo Reporte
                </Link>
              </li>
              <li>
                <Link to="/reportes" style={{ 
                  textDecoration: 'none',
                  color: '#007bff',
                  fontWeight: 'bold'
                }}>
                  Ver Reportes
                </Link>
              </li>
            </ul>
          </nav>
        </header>
        <main>
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