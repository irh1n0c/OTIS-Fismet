import React, { useState, useEffect } from 'react';
// Importa las funciones y las NUEVAS interfaces desde tu api.ts
import { obtenerReportes, type IBloque, type IReporteIndividual, API_URL } from '../services/api';

// --- UI IMPORTS (SHADCN & LUCIDE) ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Search,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { LayersIcon } from '@/components/icons/lucide-layers';


export const ListadoReportes: React.FC = () => {
  // 1. El estado principal ahora almacena Bloques, no Reportes
  const [bloques, setBloques] = useState<IBloque[]>([]);
  const [filtroMetrologo, setFiltroMetrologo] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});

  useEffect(() => {
    cargarBloques();
  }, []);

  const cargarBloques = async () => {
    try {
      setLoading(true);
      const data = await obtenerReportes();
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

      // ... (Toda la lógica de descarga con FileSystemAccess y Fallback se mantiene INTACTA) ...

      if (hasDirPicker) {
        // @ts-ignore
        const rootHandle: FileSystemDirectoryHandle = await (globalThis as any).showDirectoryPicker();
        const parentDir = await rootHandle.getDirectoryHandle(bloque.nombreCliente, { create: true });

        let reporteIdx = 0;
        for (const reporte of bloque.reportes) {
          reporteIdx++;
          setDownloadStatus(prev => ({ ...prev, [bloque._id]: `Procesando reporte ${reporteIdx}/${bloque.reportes.length}` }));

          const reportFolderName = `${reporte.codigoEquipo}_${reporte.metrologo}`;
          const targetDir = await parentDir.getDirectoryHandle(reportFolderName, { create: true });

          let imgIdx = 0;
          for (const imagen of reporte.imagenesEquipo) {
            imgIdx++;
            const useProxy = !!API_URL;
            const imagePath = (() => { try { return new URL(imagen.url).pathname.replace(/^\//, ''); } catch { return imagen.url; } })();
            const fetchUrl = useProxy ? `${API_URL.replace(/\/$/, '')}/images/proxy?key=${encodeURIComponent(imagePath)}` : imagen.url;
            const resp = await fetch(fetchUrl);
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
        // Fallback (Descargas individuales)
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

            const extGuess = (imagen.url.split('?')[0].split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '');
            const fileName = `${bloque.nombreCliente}_${reporte.metrologo}_${reporte.codigoEquipo}_${imgIdx}.${extGuess}`;

            const useProxy = !!API_URL;
            const imagePath = (() => { try { return new URL(imagen.url).pathname.replace(/^\//, ''); } catch { return imagen.url; } })();
            const href = useProxy ? `${API_URL.replace(/\/$/, '')}/images/proxy?key=${encodeURIComponent(imagePath)}` : imagen.url;

            const a = document.createElement('a');
            a.href = href;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            await new Promise(r => setTimeout(r, 300));
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
      if (filtroMetrologo === '') {
        return bloque;
      }

      const reportesCoincidentes = bloque.reportes.filter((reporte: IReporteIndividual) => // Aquí le damos el tipo al reporte
        reporte.metrologo.toLowerCase().includes(filtroMetrologo.toLowerCase())
      );

      if (reportesCoincidentes.length > 0) {
        // Ordenamos los reportes coincidentes por fecha
        const reportesOrdenados = reportesCoincidentes.sort((a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );
        return { ...bloque, reportes: reportesOrdenados };
      }

      return null;
    })
    .filter((bloque): bloque is IBloque => bloque !== null);


  // 4. RENDERIZADO 
  return (
    <div className="min-h-screen  bg-white-50">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Panel de Reportes</h2>

      {/* Sección de Filtro */}
      <Card className="mb-6 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-500" />
              <Label htmlFor="filtroMetrologo" className="whitespace-nowrap">
                Buscar por Metrólogo:
              </Label>
            </div>

            <Input
              id="filtroMetrologo"
              type="text"
              value={filtroMetrologo}
              onChange={(e) => setFiltroMetrologo(e.target.value)}
              placeholder="Escribe el nombre aquí"
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>


      {loading && <p className="flex items-center text-blue-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando reportes...</p>}
      {error && <p className="text-red-500 flex items-center"><AlertCircle className="mr-2 h-4 w-4" />{error}</p>}

      {!loading && !error && (
        <div className="flex flex-col gap-3">

          {/* --- BUCLE EXTERNO (POR BLOQUE: Cliente/Clínica) --- */}
          {bloquesFiltrados.map(bloque => (
            <Card
              key={bloque._id}
              className="shadow-lg border-sonte-200">
              <CardHeader className="bg-stone-50/50 border-b p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <LayersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-stone-800 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg sm:text-xl text-stone-800">{bloque.nombreCliente}</CardTitle>
                        <span className="text-gray-500">•</span>
                        <CardDescription className="text-xs sm:text-sm text-gray-600 m-0">
                          {bloque.departamento}
                        </CardDescription>
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN DE DESCARGA POR BLOQUE */}
                  <div className="flex flex-col gap-1 w-full sm:w-auto">
                    <div className="flex items-center gap-2 mb-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpanded(prev => ({ ...prev, [bloque._id]: !prev[bloque._id] }))}
                        className="text-xs sm:text-sm whitespace-nowrap mr-0 bg-stone-900 text-white px-6 py-4 rounded-1/2 hover:bg-stone-700 hover:text-white"

                      >
                        {expanded[bloque._id] ? (
                          <>
                            <ChevronUp className="mr-1 h-3 w-3" /> Ocultar Bloque
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3 w-3" /> Desplegar Bloque
                          </>
                        )}
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDownloadBloque(bloque)}
                      disabled={!!downloadStatus[bloque._id] && downloadStatus[bloque._id] !== 'idle'}
                      className="bg-white-100 hover:bg-stone-100 text-stone-700 w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
                    >
                      {downloadStatus[bloque._id] && downloadStatus[bloque._id] !== 'idle' ? (
                        <>
                          <Loader2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                          <span className="truncate">{downloadStatus[bloque._id].includes('Procesando') ? 'Procesando...' : 'Descargando'}</span>
                        </>
                      ) : (
                        <>
                          <Download className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Descargar todo ({bloque.reportes.length})</span>
                          <span className="sm:hidden">Descargar ({bloque.reportes.length})</span>
                        </>
                      )}
                    </Button>
                    {downloadStatus[bloque._id] && downloadStatus[bloque._id] !== 'idle' && (
                      <small className="text-xs text-blue-600 text-center sm:text-left truncate">{downloadStatus[bloque._id]}</small>
                    )}
                  </div>
                </div>
              </CardHeader>

              {expanded[bloque._id] && (
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {bloque.reportes.map((reporte: IReporteIndividual) => (
                      <Card key={reporte._id} className="border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-cyan-500 hover:bg-slate-800 text-sm">Equipo: {reporte.codigoEquipo}</Badge>
                              <p className="text-xs text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" /> {new Date(reporte.fecha).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                              <div className="text-xs text-gray-600">Imágenes: {reporte.imagenesEquipo.length}</div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setExpandedReports(prev => ({ ...prev, [reporte._id]: !prev[reporte._id] }))}
                                className="text-xs"
                              >
                                {expandedReports[reporte._id] ? (
                                  <>
                                    <ChevronUp className="mr-1 h-3 w-3" /> Ocultar Imágenes
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="mr-1 h-3 w-3" /> Ver Imágenes
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 font-medium flex items-center">
                            <User className="h-3 w-3 mr-1" /> {reporte.metrologo}
                          </p>

                          <Separator className="my-2" />
                          {reporte.observaciones && (
                            <div className="text-sm text-gray-600 bg-stone-50 border border-stone-200 rounded-md p-2">
                              <span className="font-semibold text-gray-700">Observaciones:</span>
                              <p className="mt-1 whitespace-pre-line">
                                {reporte.observaciones}
                              </p>
                            </div>
                          )}
                          {expandedReports[reporte._id] && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {reporte.imagenesEquipo.map((imagen, index) => (
                                <Button
                                  key={imagen.public_id}
                                  variant="ghost"
                                  onClick={() => window.open(imagen.url, '_blank')}
                                  className="h-auto p-0 rounded-md overflow-hidden"
                                >
                                  <img
                                    src={imagen.url}
                                    alt={`Img ${index + 1}`}
                                    loading="lazy"
                                    className="w-full h-20 sm:h-28 md:h-32 object-cover transition-opacity hover:opacity-75"
                                  />
                                </Button>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Mensaje de Sin Resultados */}
      {!loading && !error && bloquesFiltrados.length === 0 && (
        <p className="text-gray-500 mt-8">No se encontraron bloques {filtroMetrologo && 'con reportes para el metrólogo especificado'}.</p>
      )}
    </div>
  );
};

export default ListadoReportes;