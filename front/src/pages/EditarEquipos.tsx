import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import imageCompression from 'browser-image-compression';
import { isHeicImage, normalizeImageFile } from '@/lib/utils';
import { eliminarEquipo } from "../services/api";

import {
  actualizarEquipo,
  buscarEquipoPorCodigo,
  anadirImagenesReporte,
} from "../services/api";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  Trash2,
  MoreVertical,
  Eraser,
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

  const [imagenesActuales, setImagenesActuales] = useState<Array<{ url: string, public_id: string }>>([]);
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
      const normalizedFiles = await Promise.all(filesFromInput.map(async (file) => {
        if (isHeicImage(file)) {
          const jpgFile = await normalizeImageFile(file);
          console.log(`HEIC/HEIF convertido: ${file.name} -> ${jpgFile.name}`);
          return jpgFile;
        }
        return file;
      }));

      const compressedFilesPromises = normalizedFiles.map(file => {
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
        const jpgFileName = originalFile.name.replace(/\.(heic|heif)$/i, '.jpg').replace(/\.[^/.]+$/, '.jpg');
        const compressedFile = new File([blob], jpgFileName, {
          type: 'image/jpeg',
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

  const handleEliminar = async () => {
    const codigo = codigoEquipo.trim();
    if (!codigo) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const { bloque, reporte } = await buscarEquipoPorCodigo(codigo);
      await eliminarEquipo(bloque._id, reporte._id);
      setSuccess(`Reporte del equipo "${codigo}" eliminado correctamente.`);
      setCodigoEquipo("");
      setIsUpdateMode(false);
      setEquipoData(null);
      setBloqueData(null);
      setMetrologo("");
      setObservaciones("");
      setImagenes(null);
      setImagenesPreview([]);
      setImagenesActuales([]);
      setImagenesAEliminar([]);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "No se pudo eliminar el reporte. Verifica el código e inténtalo nuevamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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

        // Manejar cambios de imágenes (eliminar y/o agregar)
        if (imagenesAEliminar.length > 0 || (imagenes && imagenes.length > 0)) {
          const formDataImages = new FormData();

          // Agregar imágenes a eliminar
          imagenesAEliminar.forEach(publicId => {
            formDataImages.append("imagenesAEliminar", publicId);
          });

          // Agregar nuevas imágenes
          if (imagenes && imagenes.length > 0) {
            for (let i = 0; i < imagenes.length; i++) {
              formDataImages.append("imagenesEquipo", imagenes[i]);
            }
          }

          // Agregar código para identificar el reporte
          formDataImages.append("codigoEquipo", codigoEquipo);

          // Hacer una única llamada
          const respuestaActualizacion = await anadirImagenesReporte(formDataImages);

          // SOLO actualizar estado local si la respuesta fue exitosa
          if (respuestaActualizacion) {
            // Actualizar con las imágenes del backend para asegurar sincronización
            setImagenesActuales(respuestaActualizacion.reportes[0]?.imagenesEquipo ||
              imagenesActuales.filter(img => !imagenesAEliminar.includes(img.public_id))
            );
            setImagenesAEliminar([]);
            setImagenes(null);
            setImagenesPreview([]);
          }
        }

        setSuccess(Object.keys(datosLimpios).length > 0 || imagenesAEliminar.length > 0 || (imagenes && imagenes.length > 0) ? "Equipo actualizado correctamente" : "No hay cambios para guardar");

        // Actualizar el estado local
        if (datosActualizar.codigoEquipo) setCodigoEquipo(datosActualizar.codigoEquipo);
        if (datosActualizar.metrologo) setMetrologo(datosActualizar.metrologo);
        if (datosActualizar.observaciones) setObservaciones(datosActualizar.observaciones);

      } else {
        setError("Error: El equipo no se cargó correctamente.");
      }
    } catch (err: any) {
      console.error(err);
      // Limpiar estado de imágenes si hay error
      setImagenesAEliminar([]);
      setImagenes(null);
      setImagenesPreview([]);
      setError(err.response?.data?.msg || "Error al guardar el equipo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center py-1 sm:py-4">
      <Card className="w-full max-w-2xl shadow-sm sm:shadow-lg border-slate-200">
        <CardHeader className="px-3.5 py-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl">
            Editar Equipo
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Busca y edita los datos de un equipo existente
          </CardDescription>
        </CardHeader>

        <CardContent className="px-3 py-4 sm:p-6">
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
                <div className="flex gap-2 items-stretch">
                  <Textarea
                    id="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ingrese observaciones del equipo..."
                    rows={4}
                    disabled={loading}
                    className="flex-1 resize-none text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setObservaciones('')}
                    disabled={loading || !observaciones}
                    className="h-auto px-2.5 sm:px-3 text-xs text-slate-600 hover:text-red-600 hover:border-red-200 shrink-0 flex flex-col justify-center items-center gap-1"
                    title="Limpiar observaciones"
                    aria-label="Limpiar observaciones"
                  >
                    <Eraser className="h-4 w-4" />
                    <span className="text-[11px] sm:text-xs">Limpiar</span>
                  </Button>
                </div>
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
                        className={`relative group aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-all ${imagenesAEliminar.includes(imagen.public_id)
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

              {/* Botón Guardar y Menú de Acciones */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  className="flex-1 h-10 sm:h-11 text-sm font-medium"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                  {loading
                    ? 'Guardando...'
                    : imagenesPreview.length > 0
                      ? 'Guardar Cambios e Imágenes'
                      : 'Guardar Cambios'
                  }
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 sm:h-11 px-2.5 sm:px-3 text-slate-600 hover:text-slate-900 shrink-0"
                      disabled={loading}
                      aria-label="Abrir acciones del reporte"
                      title="Más opciones"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          disabled={loading}
                          onSelect={(event) => event.preventDefault()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar reporte
                        </DropdownMenuItem>
                      </AlertDialogTrigger>

                      <AlertDialogContent className="w-[92vw] max-w-md p-4 sm:p-6 rounded-lg sm:rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-base sm:text-lg">
                            ¿Eliminar este reporte?
                          </AlertDialogTitle>

                          <AlertDialogDescription className="text-xs sm:text-sm">
                            Esta acción eliminará el reporte seleccionado.
                            Esta operación podría no ser reversible.
                            ¿Estás seguro de que deseas continuar?
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-3 sm:mt-4">
                          <AlertDialogCancel disabled={loading} className="w-full sm:w-auto text-xs sm:text-sm">
                            Cancelar
                          </AlertDialogCancel>

                          <AlertDialogAction
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-xs sm:text-sm"
                            disabled={loading}
                            onClick={(event) => {
                              event.preventDefault();
                              handleEliminar();
                            }}
                          >
                            {loading ? "Eliminando..." : "Sí, eliminar reporte"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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

        {(success || error) && (
          <CardFooter className="flex flex-col gap-2 bg-slate-50 border-t px-3 py-3 sm:px-6 sm:py-4 rounded-b-lg">
            {success && (
              <Alert className="border-green-500 bg-green-50 text-green-900 py-2.5 px-3">
                <CheckCircle2 className="h-4 w-4 !text-green-600 shrink-0" />
                <div className="ml-2 flex-1">
                  <AlertTitle className="text-xs sm:text-sm font-semibold">¡Éxito!</AlertTitle>
                  <AlertDescription className="text-xs">{success}</AlertDescription>
                </div>
                <button onClick={() => setSuccess(null)} className="ml-auto text-green-700 hover:text-green-900">
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="py-2.5 px-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <div className="ml-2 flex-1">
                  <AlertTitle className="text-xs sm:text-sm font-semibold">Error</AlertTitle>
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </div>
                <button onClick={() => setError(null)} className="ml-auto">
                  <X className="h-4 w-4" />
                </button>
              </Alert>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
