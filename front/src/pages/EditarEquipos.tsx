import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import imageCompression from 'browser-image-compression';
import {
  actualizarEquipo,
  buscarEquipoPorCodigo,
  anadirImagenesReporte,
} from "../services/api";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";

/* ===============================
   TIPOS
================================ */
interface Equipo {
  _id: string;
  codigoEquipo: string;
  metrologo: string;
  observaciones?: string;
}

interface BloqueData {
  _id: string;
  nombreCliente: string;
  departamento: string;
}

/* ===============================
   COMPONENTE
================================ */
export function GestionEquipos() {
  /* ---------- URL ---------- */
  const [searchParams] = useSearchParams();
  const codigoEquipoFromURL = searchParams.get("codigoEquipo");

  /* ---------- STATES ---------- */
  const [codigoEquipo, setCodigoEquipo] = useState("");
  const [metrologo, setMetrologo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  const [bloqueData, setBloqueData] = useState<BloqueData | null>(null);
  const [equipoData, setEquipoData] = useState<Equipo | null>(null);

  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [imagenes, setImagenes] = useState<FileList | null>(null);
  const [imagenesPreview, setImagenesPreview] = useState<string[]>([]);
  
  const [imagenesActuales, setImagenesActuales] = useState<Array<{url: string, public_id: string}>>([]);
  const [imagenesAEliminar, setImagenesAEliminar] = useState<string[]>([]);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ===============================
     EFECTO: leer código desde URL
  ================================ */
  useEffect(() => {
    if (!codigoEquipoFromURL) return;

    setCodigoEquipo(codigoEquipoFromURL);
    buscarEquipo(codigoEquipoFromURL);
  }, [codigoEquipoFromURL]);

  /* ===============================
     BUSCAR EQUIPO (BACKEND)
  ================================ */
  const buscarEquipo = async (codigo: string) => {
    try {
      setLoading(true);
      setError(null);

      const { bloque, reporte } = await buscarEquipoPorCodigo(codigo);

      // Equipo encontrado → modo actualización
      setIsUpdateMode(true);
      setBloqueData({
        _id: bloque._id,
        nombreCliente: bloque.nombreCliente,
        departamento: bloque.departamento
      });
      setEquipoData(reporte as Equipo);
      setMetrologo(reporte.metrologo);
      setObservaciones(reporte.observaciones || "");
      setImagenesActuales(reporte.imagenesEquipo || []);
      setImagenesAEliminar([]);
    } catch (err: any) {
      console.error(err);
      setIsUpdateMode(false);
      setBloqueData(null);
      setEquipoData(null);
      setMetrologo("");
      setObservaciones("");
      setImagenesActuales([]);
      setImagenesAEliminar([]);
      
      setError(` Equipo con código "${codigo}" no encontrado. Verifica el código e intenta de nuevo.`);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     HANDLERS
  ================================ */
  const handleCodigoEquipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoValor = e.target.value;
    setCodigoEquipo(nuevoValor);
    setIsUpdateMode(false);
    setBloqueData(null);
    setEquipoData(null);
    setError(null);
  };

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoEquipo.trim()) {
      setError("Por favor ingresa un código de equipo");
      return;
    }
    await buscarEquipo(codigoEquipo);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) => {
    setter(e.target.value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const filesFromInput = Array.from(e.target.files);
    setError(null);

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
    };

    try {
      const compressedFilesPromises = filesFromInput.map(file => {
        console.log(`Original: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        return imageCompression(file, options);
      });

      const compressedBlobs = await Promise.all(compressedFilesPromises);
      const newPreviews: string[] = [];
      const newFileList = new DataTransfer();

      if (imagenes) {
        for (const imagen of Array.from(imagenes)) {
          newFileList.items.add(imagen);
        }
      }

      compressedBlobs.forEach((blob, index) => {
        const originalFile = filesFromInput[index];
        const compressedFile = new File([blob], originalFile.name, {
          type: blob.type,
          lastModified: Date.now(),
        });
        console.log(`Comprimido: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);
        newFileList.items.add(compressedFile);
        newPreviews.push(URL.createObjectURL(blob));
      });

      setImagenes(newFileList.files);
      setImagenesPreview(prev => [...prev, ...newPreviews]);

    } catch (err: any) {
      console.error("Error detallado de compresión:", err);
      let errorMessage = 'Error al comprimir las imágenes.';
      if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    if (imagenes) {
      const newFileList = new DataTransfer();
      const filesArray = Array.from(imagenes);
      URL.revokeObjectURL(imagenesPreview[index]);
      filesArray.splice(index, 1);
      filesArray.forEach(file => newFileList.items.add(file));
      setImagenes(newFileList.files);
      setImagenesPreview(prev => prev.filter((_, i) => i !== index));
    }
  };

  const eliminarImagenActual = (publicId: string) => {
    setImagenesAEliminar(prev => {
      if (prev.includes(publicId)) {
        return prev.filter(id => id !== publicId);
      } else {
        return [...prev, publicId];
      }
    });
  };

  useEffect(() => {
    return () => {
      imagenesPreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagenesPreview]);

  /* ===============================
     SUBMIT
  ================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);

      if (isUpdateMode && bloqueData && equipoData) {
        // MODO ACTUALIZACIÓN
        const datosActualizar = {
          codigoEquipo: codigoEquipo !== equipoData.codigoEquipo ? codigoEquipo : undefined,
          metrologo: metrologo !== equipoData.metrologo ? metrologo : undefined,
          observaciones: observaciones !== (equipoData.observaciones || "") ? observaciones : undefined,
        };

        // Filtrar campos undefined
        const datosLimpios = Object.fromEntries(
          Object.entries(datosActualizar).filter(([_, v]) => v !== undefined)
        );

        // Actualizar datos si hay cambios
        if (Object.keys(datosLimpios).length > 0) {
          await actualizarEquipo(bloqueData._id, equipoData._id, datosLimpios);
        }

        // Eliminar imágenes si hay
        if (imagenesAEliminar.length > 0) {
          const formDataDelete = new FormData();
          imagenesAEliminar.forEach(publicId => {
            formDataDelete.append("imagenesAEliminar", publicId);
          });
          formDataDelete.append("codigoEquipo", codigoEquipo);
          
          await anadirImagenesReporte(formDataDelete);
          setImagenesActuales(prev => 
            prev.filter(img => !imagenesAEliminar.includes(img.public_id))
          );
          setImagenesAEliminar([]);
        }

        // Agregar imágenes si hay
        if (imagenes && imagenes.length > 0) {
          const formData = new FormData();
          for (let i = 0; i < imagenes.length; i++) {
            formData.append("imagenesEquipo", imagenes[i]);
          }
          formData.append("codigoEquipo", codigoEquipo); // Usar el código actual (actualizado o no)
          
          await anadirImagenesReporte(formData);
          setImagenes(null);
          setImagenesPreview([]);
        }

        setSuccess(Object.keys(datosLimpios).length > 0 || (imagenes && imagenes.length > 0) || imagenesAEliminar.length > 0 ? "Equipo actualizado correctamente" : "No hay cambios para guardar");
        
        // Actualizar el estado local
        if (datosActualizar.codigoEquipo) setCodigoEquipo(datosActualizar.codigoEquipo);
        if (datosActualizar.metrologo) setMetrologo(datosActualizar.metrologo);
        if (datosActualizar.observaciones) setObservaciones(datosActualizar.observaciones);

      } else {
        setError("Error: El equipo no se cargó correctamente.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.msg || "Error al guardar el equipo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-start p-6 bg-white">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle>
            Editar Equipo
          </CardTitle>
          <CardDescription>
            Busca y edita los datos de un equipo existente
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          {/* SECCIÓN DE BÚSQUEDA */}
          <form onSubmit={handleBuscar} className="space-y-4 mb-6 pb-6 border-b">
            <div className="space-y-2">
              <Label htmlFor="codigoEquipo">Código de Equipo</Label>
              <div className="flex gap-2">
                <Input
                  id="codigoEquipo"
                  value={codigoEquipo}
                  onChange={handleCodigoEquipoChange}
                  placeholder="Ej: 2121"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  disabled={loading || !codigoEquipo.trim()}
                  className="whitespace-nowrap"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Buscar
                </Button>
              </div>
            </div>

            {isUpdateMode && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Equipo encontrado</AlertTitle>
                <AlertDescription className="text-green-700">
                  Ahora puedes editar los datos del equipo
                </AlertDescription>
              </Alert>
            )}
          </form>

          {/* SECCIÓN DE EDICIÓN - SOLO SI ENCONTRÓ EQUIPO */}
          {isUpdateMode && (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Información del Bloque */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-semibold text-gray-700">Cliente: <span className="text-gray-900">{bloqueData?.nombreCliente}</span></p>
                <p className="text-sm text-gray-700">Departamento: <span className="text-gray-900">{bloqueData?.departamento}</span></p>
              </div>

              {/* Código de Equipo */}
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de Equipo</Label>
                <Input
                  id="codigo"
                  value={codigoEquipo}
                  onChange={(e) => setCodigoEquipo(e.target.value)}
                  required
                />
              </div>

              {/* Metrólogo */}
              <div className="space-y-2">
                <Label htmlFor="metrologo">Metrológo</Label>
                <Input
                  id="metrologo"
                  value={metrologo}
                  onChange={(e) => handleInputChange(e, setMetrologo)}
                  required
                  placeholder="Ej: RV, Renzo Vera, etc."
                />
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ingrese observaciones del equipo..."
                  rows={4}
                />
              </div>

              <Separator />

              {/* Imágenes Actuales */}
              {imagenesActuales.length > 0 && (
                <div className="space-y-3">
                  <Label>Fotografías Actuales</Label>
                  <p className="text-sm text-gray-600">Haz clic en una imagen para marcarla para eliminar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {imagenesActuales.map((imagen) => (
                      <div
                        key={imagen.public_id}
                        onClick={() => eliminarImagenActual(imagen.public_id)}
                        className={`relative group aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-all ${
                          imagenesAEliminar.includes(imagen.public_id)
                            ? 'border-red-500 opacity-50 bg-red-50'
                            : 'border-gray-300 hover:border-red-500'
                        }`}
                      >
                        <img 
                          src={imagen.url} 
                          alt="Equipo" 
                          className="w-full h-full object-cover" 
                        />
                        {imagenesAEliminar.includes(imagen.public_id) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <X className="w-6 h-6 text-red-500" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {imagenesAEliminar.length > 0 && (
                    <p className="text-sm text-red-600 font-semibold">
                      {imagenesAEliminar.length} imagen{imagenesAEliminar.length !== 1 ? 'es' : ''} marcada{imagenesAEliminar.length !== 1 ? 's' : ''} para eliminar
                    </p>
                  )}
                </div>
              )}

              <Separator />

              {/* Agregar más Imágenes */}
              <div className="space-y-3">
                <Label>Agregar más Fotografías</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2 border-dashed border-2 hover:border-solid hover:bg-blue-50 hover:text-blue-600 hover:border-blue-500 transition-all"
                    onClick={() => document.getElementById('input-camera-edit')?.click()}
                    disabled={loading}
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Tomar Foto</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-2 border-dashed border-2 hover:border-solid hover:bg-blue-50 hover:text-blue-600 hover:border-blue-500 transition-all"
                    onClick={() => document.getElementById('input-gallery-edit')?.click()}
                    disabled={loading}
                  >
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-xs">Galería</span>
                  </Button>

                  {/* Inputs Ocultos */}
                  <input id="input-camera-edit" type="file" className="hidden" accept="image/*" multiple capture="environment" onChange={handleFileChange} disabled={loading} />
                  <input id="input-gallery-edit" type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} disabled={loading} />
                </div>
              </div>

              {/* Previsualización de nuevas imágenes */}
              {imagenesPreview.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Nuevas imágenes a agregar ({imagenesPreview.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {imagenesPreview.map((preview, index) => (
                      <div key={preview} className="relative group aspect-square rounded-md overflow-hidden border shadow-sm">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
                {loading ? 'Guardando...' : imagenesPreview.length > 0 ? 'Guardar Cambios e Imágenes' : 'Guardar Cambios'}
              </Button>
            </form>
          )}

          {/* MENSAJE SI NO ENCONTRÓ EQUIPO */}
          {!isUpdateMode && codigoEquipo && !loading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Equipo no encontrado</AlertTitle>
              <AlertDescription>
                {error || "No hay un equipo registrado con este código. Intenta con otro código."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>

        {(success || error) && isUpdateMode && (
          <CardFooter>
            {success && (
              <Alert className="bg-green-50 border-green-500">
                <CheckCircle2 />
                <AlertTitle>Éxito</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
