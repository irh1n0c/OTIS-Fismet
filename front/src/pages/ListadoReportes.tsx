import React, { useState, useEffect } from 'react';
// Importa las funciones y las NUEVAS interfaces desde tu api.ts
import { obtenerReportes, type IBloque} from '../services/api';

// (La interfaz 'Reporte' local ya no es necesaria, usamos las de api.ts)

export const ListadoReportes: React.FC = () => {
  // 1. El estado principal ahora almacena Bloques, no Reportes
  const [bloques, setBloques] = useState<IBloque[]>([]);
  const [filtroMetrologo, setFiltroMetrologo] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<Record<string, string>>({}); // La clave será el bloque._id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarBloques();
  }, []);

  const cargarBloques = async () => {
    try {
      setLoading(true);
      const data = await obtenerReportes(); // Esto devuelve IBloque[]
      setBloques(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar los reportes: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 2. NUEVA FUNCIÓN DE DESCARGA (por Bloque)
  const handleDownloadBloque = async (bloque: IBloque) => {
    setDownloadStatus(prev => ({ ...prev, [bloque._id]: 'Iniciando...' }));
    
    try {
      const hasDirPicker = typeof (globalThis as any).showDirectoryPicker === 'function';

      if (hasDirPicker) {
        // --- MÉTODO MODERNO (con carpetas y subcarpetas) ---
        // @ts-ignore
        const rootHandle: FileSystemDirectoryHandle = await (globalThis as any).showDirectoryPicker();
        
        // 1. Crear carpeta padre (Cliente)
        const parentDir = await rootHandle.getDirectoryHandle(bloque.nombreCliente, { create: true });

        // 2. Iterar sobre cada REPORTE dentro del bloque
        let reporteIdx = 0;
        for (const reporte of bloque.reportes) {
          reporteIdx++;
          setDownloadStatus(prev => ({ ...prev, [bloque._id]: `Procesando reporte ${reporteIdx}/${bloque.reportes.length}` }));

          // 3. Crear subcarpeta (Metrólogo_Codigo)
          const reportFolderName = `${reporte.metrologo}_${reporte.codigoEquipo}`;
          const targetDir = await parentDir.getDirectoryHandle(reportFolderName, { create: true });

          // 4. Iterar sobre cada IMAGEN y guardarla en la subcarpeta
          let imgIdx = 0;
          for (const imagen of reporte.imagenesEquipo) {
            imgIdx++;
            const resp = await fetch(imagen.url);
            if (!resp.ok) throw new Error(`Error al descargar ${imagen.url}`);
            const blob = await resp.blob();
            const ext = (imagen.url.split('?')[0].split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `${reporte.codigoEquipo}_${imgIdx}.${ext}`;

            const fileHandle = await targetDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          }
        }
        setDownloadStatus(prev => ({ ...prev, [bloque._id]: 'Completado' }));

      } else {
        // --- MÉTODO FALLBACK (Descargas individuales con nombres claros) ---
        setDownloadStatus(prev => ({ ...prev, [bloque._id]: 'Iniciando descargas individuales...' }));
        let totalImages = 0;
        bloque.reportes.forEach(r => totalImages += r.imagenesEquipo.length);
        let currentImage = 0;

        for (const reporte of bloque.reportes) {
          let imgIdx = 0;
          for (const imagen of reporte.imagenesEquipo) {
            imgIdx++;
            currentImage++;
            setDownloadStatus(prev => ({ ...prev, [bloque._id]: `Descargando ${currentImage}/${totalImages}` }));
            
            // Crear un nombre de archivo descriptivo
            const extGuess = (imagen.url.split('?')[0].split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `${bloque.nombreCliente}_${reporte.metrologo}_${reporte.codigoEquipo}_${imgIdx}.${extGuess}`;
            
            const a = document.createElement('a');
            a.href = imagen.url;
            a.download = fileName; // El nombre de archivo ahora incluye el cliente y metrólogo
            document.body.appendChild(a);
            a.click();
            a.remove();
            await new Promise(r => setTimeout(r, 300)); // Pausa más larga
          }
        }
        setDownloadStatus(prev => ({ ...prev, [bloque._id]: 'Completado (descargas individuales)' }));
      }

    } catch (err) {
      setDownloadStatus(prev => ({ ...prev, [bloque._id]: 'Error: ' + ((err as Error).message || err) }));
    } finally {
      setTimeout(() => setDownloadStatus(prev => ({ ...prev, [bloque._id]: 'idle' })), 4000);
    }
  };

  // 3. LÓGICA DE FILTRADO (Ahora filtra los reportes DENTRO de cada bloque)
  const bloquesFiltrados = bloques
    .map(bloque => {
      // Si no hay filtro, devuelve el bloque tal cual
      if (filtroMetrologo === '') {
        return bloque;
      }
      
      // Si hay filtro, filtra los reportes internos
      const reportesCoincidentes = bloque.reportes.filter(reporte =>
        reporte.metrologo.toLowerCase().includes(filtroMetrologo.toLowerCase())
      );

      // Si se encontraron reportes, devuelve el bloque CON SOLO esos reportes
      if (reportesCoincidentes.length > 0) {
        return { ...bloque, reportes: reportesCoincidentes };
      }
      
      // Si ningún reporte coincide, este bloque no se mostrará
      return null;
    })
    .filter((bloque): bloque is IBloque => bloque !== null); // Elimina los bloques nulos


  // 4. RENDERIZADO (Ahora itera sobre bloques, y LUEGO sobre reportes)
  return (
    <div className="listado-reportes" style={{ padding: '20px' }}>
      <h2>Listado de Reportes por Cliente</h2>
      
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* --- BUCLE EXTERNO (POR BLOQUE) --- */}
          {bloquesFiltrados.map(bloque => (
            <div 
              key={bloque._id}
              style={{
                border: '1px solid #005A9C', // Borde más oscuro para el bloque
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#f9f9f9'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ marginTop: 0, color: '#003366' }}>{bloque.nombreCliente}</h3>
                  <p style={{ marginTop: '-10px' }}><strong>Ubicación:</strong> {bloque.departamento}</p>
                </div>
                {/* BOTÓN DE DESCARGA POR BLOQUE */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleDownloadBloque(bloque)}
                    disabled={!!downloadStatus[bloque._id] && downloadStatus[bloque._id] !== 'idle'}
                  >
                    {downloadStatus[bloque._id] && downloadStatus[bloque._id] !== 'idle' ? 'Descargando...' : `Descargar todo (${bloque.reportes.length} reportes)`}
                  </button>
                  {downloadStatus[bloque._id] && downloadStatus[bloque._id] !== 'idle' && (
                    <small style={{ display: 'block' }}>{downloadStatus[bloque._id]}</small>
                  )}
                </div>
              </div>
              
              <hr />

              {/* --- BUCLE INTERNO (POR REPORTE INDIVIDUAL) --- */}
              <div style={{ 
                display: 'grid', 
                gap: '20px',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
              }}>
                {bloque.reportes.map(reporte => (
                  <div 
                    key={reporte._id} // Usamos el _id del reporte individual
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      padding: '15px',
                      backgroundColor: '#fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <h4 style={{ marginTop: 0 }}>Equipo: {reporte.codigoEquipo}</h4>
                    <p><strong>Metrólogo:</strong> {reporte.metrologo}</p>
                    <p><strong>Fecha:</strong> {new Date(reporte.fecha).toLocaleDateString()}</p>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', // Imágenes más pequeñas
                      gap: '10px',
                      marginTop: '10px'
                    }}>
                      {reporte.imagenesEquipo.map((imagen, index) => (
                        <button
                          key={imagen.public_id}
                          type="button"
                          onClick={() => window.open(imagen.url, '_blank')}
                          aria-label={`Abrir imagen ${index + 1} del equipo ${reporte.codigoEquipo}`}
                          style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                        >
                          <img
                            src={imagen.url}
                            alt={`Imagen ${index + 1} del equipo ${reporte.codigoEquipo}`}
                            style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        </button>
                      ))}
                    </div>
                    {/* El botón de descarga individual ya no está aquí */}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && bloquesFiltrados.length === 0 && (
        <p>No se encontraron bloques {filtroMetrologo && 'con reportes para el metrólogo especificado'}.</p>
      )}
    </div>
  );
};

export default ListadoReportes;