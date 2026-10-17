import React, { useState, useEffect } from 'react';

import {
  subirReporte,
  obtenerBloquesRecientes,
  anadirImagenesReporte,
  crearNuevoBloque,
  actualizarEquipo,
  buscarEquipoPorCodigo,
  eliminarEquipo,
  type IBloque
} from '../services/api';
import imageCompression from 'browser-image-compression';
import { useAuth } from '@/contexts/AuthContext';
import { isHeicImage, normalizeImageFile } from '@/lib/utils';

// --- UI IMPORTS (SHADCN & LUCIDE) ---
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  UploadCloud,
  MapPin,
  User,
  Trash2,
  MoreVertical,
  Search
} from "lucide-react";

// --- INTERFACES ---
interface ISelectedBlock {
  departamento: string;
  nombreCliente: string;
}

interface IEquipoData {
  _id: string;
  codigoEquipo: string;
  metrologo: string;
  observaciones?: string;
}

interface IBloqueData {
  _id: string;
  nombreCliente: string;
  departamento: string;
}

export const FormularioEnvio: React.FC = () => {
  const { user } = useAuth();

  // --- ESTADOS VISTA 1: SELECCIÓN DE BLOQUE ---
  const [selectedBlock, setSelectedBlock] = useState<ISelectedBlock | null>(null);
  const [existingBlocks, setExistingBlocks] = useState<IBloque[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);

  // --- ESTADOS VISTA 2: GESTIÓN DE EQUIPO (LÓGICA EDITAREQUIPOS) ---
  const [codigoEquipo, setCodigoEquipo] = useState('');
  const [metrologo, setMetrologo] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [bloqueData, setBloqueData] = useState<IBloqueData | null>(null);
  const [equipoData, setEquipoData] = useState<IEquipoData | null>(null);

  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [imagenes, setImagenes] = useState<FileList | null>(null);
  const [imagenesPreview, setImagenesPreview] = useState<string[]>([]);

  const [imagenesActuales, setImagenesActuales] = useState<Array<{ url: string, public_id: string }>>([]);
  const [imagenesAEliminar, setImagenesAEliminar] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- EFECTO: inicializar metrólogo con el usuario actual ---
  useEffect(() => {
    if (user?.name) {
      setMetrologo(valorActual => valorActual || user.name);
    }
  }, [user?.name]);

  // --- EFECTO: cargar bloques recientes para la droplist (últimos 5) ---
  useEffect(() => {
    const loadExistingBlocks = async () => {
      try {
        setIsLoadingBlocks(true);
        const response = await obtenerBloquesRecientes(5);
        setExistingBlocks(response.slice(0, 5));
      } catch (err: any) {
        setError((err as Error).message || 'Error al cargar los bloques existentes.');
      } finally {
        setIsLoadingBlocks(false);
      }
    };
    loadExistingBlocks();
  }, []);

  // --- EFECTO: limpiar object URLs al desmontar ---
  useEffect(() => {
    return () => {
      imagenesPreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagenesPreview]);

  /* ===============================
     LÓGICA VISTA 1: CREAR / SELECCIONAR BLOQUE
  ================================ */
  const handleCreateNewBlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const rawDepartamento = (e.target as any).departamento.value;
    const rawNombreCliente = (e.target as any).nombreCliente.value;

    const sanitizeInput = (str: string): string => {
      return str
        .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const newDepartamento = sanitizeInput(rawDepartamento);
    const newNombreCliente = sanitizeInput(rawNombreCliente);

    if (!newDepartamento || !newNombreCliente) {
      setError('El departamento y el nombre del cliente son obligatorios.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const nuevoBloque = await crearNuevoBloque(newDepartamento, newNombreCliente);
      setExistingBlocks(prev => [nuevoBloque, ...prev.filter(b => b._id !== nuevoBloque._id)].slice(0, 5));
      setSelectedBlock({
        departamento: nuevoBloque.departamento,
        nombreCliente: nuevoBloque.nombreCliente
      });
      resetFormEquipo();
    } catch (err: any) {
      console.error(err);
      setError('Error al crear el bloque.');
    } finally {
      setLoading(false);
    }
  };

  const changeBlock = async () => {
    setIsLoadingBlocks(true);
    try {
      const bloquesActualizados = await obtenerBloquesRecientes(5);
      setExistingBlocks(bloquesActualizados.slice(0, 5));
    } catch (err) {
      console.error("Error al refrescar bloques:", err);
    } finally {
      setIsLoadingBlocks(false);
      setSelectedBlock(null);
      resetFormEquipo();
    }
  };

  const resetFormEquipo = () => {
    setCodigoEquipo('');
    setMetrologo(user?.name || '');
    setObservaciones('');
    setBloqueData(null);
    setEquipoData(null);
    setIsUpdateMode(false);
    setImagenes(null);
    setImagenesPreview([]);
    setImagenesActuales([]);
    setImagenesAEliminar([]);
    setError(null);
    setSuccess(null);
  };

  /* ===============================
     LÓGICA VISTA 2: BÚSQUEDA Y EDICIÓN (OPTIMIZADA)
  ================================ */
  const buscarEquipo = async (codigo: string) => {
    const codigoLimpio = codigo.trim();
    if (!codigoLimpio) return;

    try {
      setIsSearching(true);
      setError(null);

      const { bloque, reporte } = await buscarEquipoPorCodigo(codigoLimpio);

      // Equipo encontrado -> Activar modo edición completa con los datos guardados en el servidor
      setIsUpdateMode(true);
      setBloqueData({
        _id: bloque._id,
        nombreCliente: bloque.nombreCliente,
        departamento: bloque.departamento
      });
      setEquipoData(reporte as IEquipoData);
      setCodigoEquipo(reporte.codigoEquipo);
      setMetrologo(reporte.metrologo);
      setObservaciones(reporte.observaciones || '');
      setImagenesActuales(reporte.imagenesEquipo || []);
      setImagenesAEliminar([]);
    } catch {
      // Equipo no encontrado -> Modo nuevo equipo para este bloque
      setIsUpdateMode(false);
      setBloqueData(null);
      setEquipoData(null);
      setImagenesActuales([]);
      setImagenesAEliminar([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCodigoEquipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoValor = e.target.value;
    setCodigoEquipo(nuevoValor);

    // Si borra el código, reseteamos a nuevo
    if (!nuevoValor.trim()) {
      setIsUpdateMode(false);
      setBloqueData(null);
      setEquipoData(null);
      setMetrologo(user?.name || '');
      setObservaciones('');
      setImagenesActuales([]);
      setImagenesAEliminar([]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleBuscarClick = async () => {
    if (!codigoEquipo.trim()) {
      setError('Por favor ingrese un código de equipo para buscar.');
      return;
    }
    await buscarEquipo(codigoEquipo);
  };

  const handleCodigoBlur = async () => {
    // Si el usuario escribió un código y aún no está en modo edición con ese mismo código
    if (codigoEquipo.trim() && (!equipoData || equipoData.codigoEquipo !== codigoEquipo.trim())) {
      await buscarEquipo(codigoEquipo);
    }
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

  const removeNewImage = (index: number) => {
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

  const toggleEliminarImagenActual = (publicId: string) => {
    setImagenesAEliminar(prev => {
      if (prev.includes(publicId)) {
        return prev.filter(id => id !== publicId);
      } else {
        return [...prev, publicId];
      }
    });
  };

  const handleEliminarReporte = async () => {
    const codigo = codigoEquipo.trim();
    if (!codigo) return;

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      const { bloque, reporte } = await buscarEquipoPorCodigo(codigo);
      await eliminarEquipo(bloque._id, reporte._id);
      setSuccess(`Reporte del equipo "${codigo}" eliminado correctamente.`);
      resetFormEquipo();
      // Actualizar lista de bloques recientes
      obtenerBloquesRecientes(5).then(response => setExistingBlocks(response.slice(0, 5)));
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
     GUARDAR CAMBIOS (NUEVO O ACTUALIZACIÓN)
  ================================ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedBlock) {
      setError('No se ha seleccionado ningún bloque.');
      return;
    }

    const codigoActual = codigoEquipo.trim();
    if (!codigoActual) {
      setError('El código de equipo es obligatorio.');
      return;
    }

    try {
      setLoading(true);

      if (isUpdateMode && bloqueData && equipoData) {
        // ========== MODO EDICIÓN (Lógica de EditarEquipos) ==========
        const nuevoCodigo = codigoActual !== equipoData.codigoEquipo ? codigoActual : undefined;
        const datosActualizar = {
          codigoEquipo: nuevoCodigo,
          metrologo: metrologo !== equipoData.metrologo ? metrologo : undefined,
          observaciones: observaciones !== (equipoData.observaciones || '') ? observaciones : undefined,
        };

        const datosLimpios = Object.fromEntries(
          Object.entries(datosActualizar).filter(([_, v]) => v !== undefined)
        );

        const huboCambiosTexto = Object.keys(datosLimpios).length > 0;
        const huboCambiosImagenes = imagenesAEliminar.length > 0 || (imagenes && imagenes.length > 0);

        // 1. Actualizar campos de texto si cambiaron
        if (huboCambiosTexto) {
          await actualizarEquipo(bloqueData._id, equipoData._id, datosLimpios);
        }

        // 2. Gestionar imágenes (eliminar y/o agregar nuevas)
        if (huboCambiosImagenes) {
          const formDataImages = new FormData();

          imagenesAEliminar.forEach(publicId => {
            formDataImages.append("imagenesAEliminar", publicId);
          });

          if (imagenes && imagenes.length > 0) {
            for (let i = 0; i < imagenes.length; i++) {
              formDataImages.append("imagenesEquipo", imagenes[i]);
            }
          }

          formDataImages.append("codigoEquipo", nuevoCodigo || equipoData.codigoEquipo);

          await anadirImagenesReporte(formDataImages);
        }

        // Limpiar inputs de nuevas imágenes y marcas de eliminación
        setImagenes(null);
        setImagenesPreview([]);
        setImagenesAEliminar([]);

        // RECARGAR Y MOSTRAR EL ÚLTIMO ESTADO GUARDADO DEL EQUIPO
        const codigoFinal = nuevoCodigo || equipoData.codigoEquipo;
        await buscarEquipo(codigoFinal);

        setSuccess(
          huboCambiosTexto || huboCambiosImagenes
            ? `Equipo "${codigoFinal}" actualizado y guardado correctamente.`
            : "No hay cambios para guardar."
        );

        // Refrescar bloques recientes
        obtenerBloquesRecientes(5).then(response => setExistingBlocks(response.slice(0, 5)));

      } else {
        // ========== MODO CREACIÓN NUEVO REPORTE ==========
        if (!imagenes || imagenes.length === 0) {
          setError('Debes seleccionar al menos una imagen para crear un nuevo reporte.');
          setLoading(false);
          return;
        }

        const metrologoAsignado = metrologo.trim() || user?.name || '';
        if (!metrologoAsignado) {
          setError('El nombre del metrólogo es obligatorio.');
          setLoading(false);
          return;
        }

        const formData = new FormData();
        for (let i = 0; i < imagenes.length; i++) {
          formData.append('imagenesEquipo', imagenes[i]);
        }
        formData.append('departamento', selectedBlock.departamento);
        formData.append('nombreCliente', selectedBlock.nombreCliente);
        formData.append('metrologo', metrologoAsignado);
        formData.append('codigoEquipo', codigoActual);
        formData.append('observaciones', observaciones);

        await subirReporte(formData);

        // Limpiar archivos locales recién subidos
        setImagenes(null);
        setImagenesPreview([]);
        setImagenesAEliminar([]);

        // RECARGAR Y MOSTRAR EL ÚLTIMO ESTADO GUARDADO DEL EQUIPO
        await buscarEquipo(codigoActual);

        setSuccess(`¡Reporte del equipo "${codigoActual}" guardado exitosamente!`);

        // Refrescar bloques recientes
        obtenerBloquesRecientes(5).then(response => setExistingBlocks(response.slice(0, 5)));
      }
    } catch (err: any) {
      console.error("Error del servidor:", err);
      if (err.response && err.response.data && err.response.data.msg) {
        setError(err.response.data.msg);
      } else {
        setError(err.message || 'Ocurrió un error al procesar el equipo.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ===================================================================
  // VISTA 1: SELECCIÓN DE BLOQUE
  // ===================================================================
  if (!selectedBlock) {
    return (
      <div className="w-full flex justify-center py-1 sm:py-4">
        <Card className="w-full max-w-xl shadow-sm sm:shadow-lg border-slate-200">
          <CardHeader className="px-3.5 py-4 sm:p-6 text-center">
            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-800">Gestión de Reportes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Seleccione o cree un bloque de trabajo</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-5 sm:px-6 sm:pb-6 space-y-4 sm:space-y-6">

            {/* Selector de Bloque Existente (limitado a los 5 últimos creados) */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Seleccionar Bloque Existente</Label>
              <Select onValueChange={(val: any) => {
                const [dep, nom] = val.split('|');
                setSelectedBlock({ departamento: dep, nombreCliente: nom });
                resetFormEquipo();
              }}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder={isLoadingBlocks ? "Cargando..." : "Seleccione un bloque"} />
                </SelectTrigger>
                <SelectContent>
                  {existingBlocks.slice(0, 5).map((bloque) => (
                    <SelectItem key={bloque._id} value={`${bloque.departamento}|${bloque.nombreCliente}`}>
                      <span className="font-medium">{bloque.nombreCliente}</span>
                      <span className="text-xs text-slate-500 ml-2">({bloque.departamento})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative my-2 sm:my-3">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500 font-medium">O crear nuevo</span></div>
            </div>

            {/* Formulario Crear Nuevo Bloque */}
            <form onSubmit={handleCreateNewBlock} className="space-y-3.5 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs text-slate-500">Solo se permiten letras y números.</p>
                <Label htmlFor="departamento" className="text-xs sm:text-sm font-medium">Lugar / Departamento</Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input id="departamento" className="pl-8 h-10 text-sm" placeholder="Ej: Lima" required />
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="nombreCliente" className="text-xs sm:text-sm font-medium">Cliente / Clínica</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-3 h-4 w-4 text-slate-400" />
                  <Input id="nombreCliente" className="pl-8 h-10 text-sm" placeholder="Ej: Clínica San Pablo" required />
                </div>
              </div>
              <Button type="submit" className="w-full h-10 text-sm font-medium" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear y Continuar
              </Button>
            </form>

            {error && (
              <Alert variant="destructive" className="py-2.5 px-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-xs sm:text-sm">Error</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

          </CardContent>
        </Card>
      </div>
    );
  }

  // ===================================================================
  // VISTA 2: GESTIÓN DE EQUIPO (CON LA UI Y LÓGICA DE EDITAREQUIPOS)
  // ===================================================================
  return (
    <div className="w-full flex justify-center py-1 sm:py-4">
      <Card className="w-full max-w-2xl shadow-sm sm:shadow-lg border-slate-200">

        {/* Cabecera del Bloque */}
        <CardHeader className="bg-stone-50/70 border-b px-3.5 py-3 sm:px-6 sm:py-4">
          <div className="flex justify-between items-center sm:items-start gap-2">
            <div className="min-w-0 flex-1">
              <CardDescription className="text-xs text-slate-500 font-medium">Trabajando en:</CardDescription>
              <CardTitle className="text-base sm:text-xl text-slate-800 truncate leading-snug mt-0.5">{selectedBlock.nombreCliente}</CardTitle>
              <p className="text-xs sm:text-sm text-slate-500 flex items-center mt-0.5 truncate">
                <MapPin className="w-3.5 h-3.5 mr-1 shrink-0 text-slate-400" /> {selectedBlock.departamento}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={changeBlock} className="text-xs h-7 sm:h-8 px-2.5 sm:px-3 shrink-0 whitespace-nowrap">
              Cambiar Bloque
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 py-3.5 sm:px-6 sm:py-6">
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-5">

            {/* Código de Equipo con botón de búsqueda integrado */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="codigoEquipo" className="text-xs sm:text-sm font-medium">Código de Equipo</Label>
              <div className="flex gap-2">
                <Input
                  id="codigoEquipo"
                  value={codigoEquipo}
                  onChange={handleCodigoEquipoChange}
                  onBlur={handleCodigoBlur}
                  placeholder="Ej: 2121"
                  disabled={loading}
                  className="text-sm h-9 sm:h-10"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBuscarClick}
                  disabled={loading || isSearching || !codigoEquipo.trim()}
                  className="whitespace-nowrap h-9 sm:h-10 px-3 sm:px-4 text-xs sm:text-sm"
                >
                  {isSearching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
                  Buscar
                </Button>
              </div>

              {/* Indicador de estado del equipo */}
              {isUpdateMode ? (
                <Alert className="bg-green-50 border-green-200 py-2 px-2.5 sm:px-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="ml-2">
                    <AlertTitle className="text-green-800 text-xs sm:text-sm font-semibold">Equipo existente encontrado</AlertTitle>
                    <AlertDescription className="text-green-700 text-xs">
                      Modo edición activado. Puedes modificar los datos, observaciones, fotos o eliminar el reporte.
                    </AlertDescription>
                  </div>
                </Alert>
              ) : (
                codigoEquipo.trim() && !isSearching && (
                  <Alert className="bg-blue-50 border-blue-200 py-2 px-2.5 sm:px-3">
                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
                    <div className="ml-2">
                      <AlertTitle className="text-blue-800 text-xs sm:text-sm font-semibold">Nuevo equipo</AlertTitle>
                      <AlertDescription className="text-blue-700 text-xs">
                        El código no existe en la base de datos. Se registrará un nuevo reporte bajo este bloque.
                      </AlertDescription>
                    </div>
                  </Alert>
                )
              )}
            </div>

            {/* Metrólogo (completamente editable con permisos completos) */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="metrologo" className="text-xs sm:text-sm font-medium">Metrólogo</Label>
              <Input
                id="metrologo"
                value={metrologo}
                onChange={(e) => setMetrologo(e.target.value)}
                required
                placeholder={user?.name || "Nombre del metrólogo"}
                disabled={loading}
                className="text-sm h-9 sm:h-10"
              />
            </div>

            {/* Observaciones (completamente editable) */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="observaciones" className="text-xs sm:text-sm font-medium">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ingrese observaciones del equipo, estado, condiciones, etc."
                rows={3}
                disabled={loading}
                className="text-sm resize-none"
              />
            </div>

            <Separator />

            {/* Fotografías Actuales (sólo visible si está en modo edición y tiene fotos) */}
            {isUpdateMode && imagenesActuales.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs sm:text-sm font-medium">Fotografías Actuales ({imagenesActuales.length})</Label>
                  {imagenesAEliminar.length > 0 && (
                    <span className="text-xs text-red-600 font-semibold">
                      {imagenesAEliminar.length} marcada{imagenesAEliminar.length !== 1 ? 's' : ''} para eliminar
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Haz clic en una imagen para marcarla para eliminar</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {imagenesActuales.map((imagen) => (
                    <div
                      key={imagen.public_id}
                      onClick={() => toggleEliminarImagenActual(imagen.public_id)}
                      className={`relative group aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-all ${
                        imagenesAEliminar.includes(imagen.public_id)
                          ? 'border-red-500 opacity-60 bg-red-50 ring-2 ring-red-400'
                          : 'border-gray-200 hover:border-red-400'
                      }`}
                    >
                      <img
                        src={imagen.url}
                        alt="Equipo"
                        className="w-full h-full object-cover"
                      />
                      {imagenesAEliminar.includes(imagen.public_id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <X className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Botones de Agregar Fotos (Cámara nativa y Galería) */}
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium">{isUpdateMode ? 'Agregar más Fotografías' : 'Fotografías del Equipo'}</Label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-2.5 sm:py-3.5 flex flex-col gap-1 sm:gap-1.5 border-dashed border-2 hover:border-solid hover:bg-blue-50 hover:text-blue-600 hover:border-blue-500 transition-all text-xs sm:text-sm"
                  onClick={() => document.getElementById('input-camera-form')?.click()}
                  disabled={loading}
                >
                  <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                  <span>Tomar Foto</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-2.5 sm:py-3.5 flex flex-col gap-1 sm:gap-1.5 border-dashed border-2 hover:border-solid hover:bg-blue-50 hover:text-blue-600 hover:border-blue-500 transition-all text-xs sm:text-sm"
                  onClick={() => document.getElementById('input-gallery-form')?.click()}
                  disabled={loading}
                >
                  <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
                  <span>Galería</span>
                </Button>

                {/* Inputs Ocultos */}
                <input
                  id="input-camera-form"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <input
                  id="input-gallery-form"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Previsualización de nuevas imágenes */}
            {imagenesPreview.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs sm:text-sm font-semibold text-gray-700">
                  Nuevas imágenes a agregar ({imagenesPreview.length})
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {imagenesPreview.map((preview, index) => (
                    <div key={preview} className="relative group aspect-square rounded-md overflow-hidden border shadow-sm">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Fila de Botón Guardar y Menú de Acciones */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="submit"
                className="flex-1 h-10 sm:h-11 text-sm font-medium"
                disabled={loading || (!isUpdateMode && (!imagenes || imagenes.length === 0))}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                )}
                {loading
                  ? 'Guardando...'
                  : isUpdateMode
                    ? (imagenesPreview.length > 0 ? 'Guardar Cambios e Imágenes' : 'Guardar Cambios')
                    : 'Guardar Reporte'
                }
              </Button>

              {/* Menú de acciones del reporte (sólo visible en modo edición) */}
              {isUpdateMode && (
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
                              handleEliminarReporte();
                            }}
                          >
                            {loading ? "Eliminando..." : "Sí, eliminar reporte"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

          </form>
        </CardContent>

        {/* Footer con Alertas de Éxito / Error */}
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
};
