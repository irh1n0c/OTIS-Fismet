import React, { useState, useEffect } from 'react';
import { obtenerReportes } from '../services/api';

interface Reporte {
  _id: string;
  departamento: string;
  nombreCliente: string;
  metrologo: string;
  codigoEquipo: string;
  imagenesEquipo: Array<{
    url: string;
    public_id: string;
  }>;
  fecha: string;
}

export const ListadoReportes: React.FC = () => {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [filtroMetrologo, setFiltroMetrologo] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarReportes();
  }, []);

  const cargarReportes = async () => {
    try {
      setLoading(true);
      const data = await obtenerReportes();
      setReportes(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los reportes: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Descarga las imágenes de un reporte en una carpeta elegida por el usuario
  const handleDownloadReporte = async (reporte: Reporte) => {
    setDownloadStatus(prev => ({ ...prev, [reporte._id]: 'downloading' }));
    try {
      // Preferir File System Access API cuando esté disponible
  const hasDirPicker = typeof (globalThis as any).showDirectoryPicker === 'function';
      const folderName = `${reporte.metrologo}_${reporte.codigoEquipo}`;

      if (hasDirPicker) {
        // El usuario elige una carpeta raíz donde nosotros creamos una subcarpeta
        // Nota: API solo funciona en navegadores que la soporten (Chromium desktop/Android en versiones recientes)
  // @ts-ignore
  const rootHandle: FileSystemDirectoryHandle = await (globalThis as any).showDirectoryPicker();
        const targetDir = await rootHandle.getDirectoryHandle(folderName, { create: true });

        let idx = 0;
        for (const imagen of reporte.imagenesEquipo) {
          idx++;
          setDownloadStatus(prev => ({ ...prev, [reporte._id]: `Guardando ${idx}/${reporte.imagenesEquipo.length}` }));
          const resp = await fetch(imagen.url);
          if (!resp.ok) throw new Error(`Error al descargar ${imagen.url}`);
          const blob = await resp.blob();
          const mime = blob.type || 'image/jpeg';
          const ext = mime.split('/')[1] || 'jpg';
          const fileName = `${reporte.codigoEquipo}_${idx}.${ext}`;

          const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
        setDownloadStatus(prev => ({ ...prev, [reporte._id]: 'completado' }));

      } else {
        // Fallback: forzar descargas individuales. No es posible crear carpetas automáticamente
        // desde todos los navegadores; colocamos nombres claros para que el usuario los agrupe.
        let idx = 0;
        for (const imagen of reporte.imagenesEquipo) {
          idx++;
          setDownloadStatus(prev => ({ ...prev, [reporte._id]: `Descargando ${idx}/${reporte.imagenesEquipo.length}` }));
          const extGuess = (imagen.url.split('?')[0].split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
          const fileName = `${reporte.codigoEquipo}_${idx}.${extGuess}`;
          const a = document.createElement('a');
          a.href = imagen.url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          // pequeña pausa para no saturar el navegador
          await new Promise(r => setTimeout(r, 200));
        }
        setDownloadStatus(prev => ({ ...prev, [reporte._id]: 'completado (descargas individuales)' }));
      }

    } catch (err) {
      setDownloadStatus(prev => ({ ...prev, [reporte._id]: 'error: ' + ((err as Error).message || err) }));
    } finally {
      // dejar mensaje visible un par de segundos
      setTimeout(() => setDownloadStatus(prev => ({ ...prev, [reporte._id]: 'idle' })), 3500);
    }
  };

  const reportesFiltrados = reportes.filter(reporte => 
    filtroMetrologo === '' || 
    reporte.metrologo.toLowerCase().includes(filtroMetrologo.toLowerCase())
  );

  return (
    <div className="listado-reportes" style={{ padding: '20px' }}>
      <h2>Listado de Reportes</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="filtroMetrologo" style={{ marginRight: '10px' }}>
          Buscar por Metrólogo:
        </label>
        <input
          id="filtroMetrologo"
          type="text"
          value={filtroMetrologo}
          onChange={(e) => setFiltroMetrologo(e.target.value)}
          placeholder="Ingrese nombre del metrólogo"
          style={{ padding: '5px' }}
        />
      </div>

      {loading && <p>Cargando reportes...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!loading && !error && (
        <div style={{ 
          display: 'grid', 
          gap: '20px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
        }}>
          {reportesFiltrados.map(reporte => (
            <div 
              key={reporte._id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <h3 style={{ marginTop: 0 }}>Equipo: {reporte.codigoEquipo}</h3>
              <p><strong>Metrólogo:</strong> {reporte.metrologo}</p>
              <p><strong>Departamento:</strong> {reporte.departamento}</p>
              <p><strong>Cliente:</strong> {reporte.nombreCliente}</p>
              <p><strong>Fecha:</strong> {new Date(reporte.fecha).toLocaleDateString()}</p>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '10px',
                marginTop: '10px'
              }}>
                {reporte.imagenesEquipo.map((imagen, index) => (
                  <button
                    key={imagen.public_id}
                    type="button"
                    onClick={() => window.open(imagen.url, '_blank')}
                    aria-label={`Abrir imagen ${index + 1} del equipo ${reporte.codigoEquipo}`}
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <img
                      src={imagen.url}
                      alt={`Imagen ${index + 1} del equipo ${reporte.codigoEquipo}`}
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px'
                      }}
                    />
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleDownloadReporte(reporte)}
                  disabled={!!downloadStatus[reporte._id] && downloadStatus[reporte._id] !== 'idle'}
                >
                  {downloadStatus[reporte._id] === 'downloading' ? 'Descargando...' : 'Descargar carpeta'}
                </button>
                {downloadStatus[reporte._id] && downloadStatus[reporte._id] !== 'idle' && (
                  <small>{downloadStatus[reporte._id]}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && reportesFiltrados.length === 0 && (
        <p>No se encontraron reportes {filtroMetrologo && 'para el metrólogo especificado'}.</p>
      )}
    </div>
  );
};

export default ListadoReportes;