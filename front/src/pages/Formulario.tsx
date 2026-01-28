import React, { useState, useEffect } from 'react';

import {
  subirReporte,
  obtenerReportes,
  anadirImagenesReporte,
  crearNuevoBloque,
  type IBloque,
  type IReporteIndividual
} from '../services/api';
import imageCompression from 'browser-image-compression';

// --- UI IMPORTS (SHADCN & LUCIDE) ---
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
  User
} from "lucide-react";

// --- INTERFACES ---
interface ISelectedBlock {
  departamento: string;
  nombreCliente: string;
}

export const FormularioEnvio: React.FC = () => {
  // --- ESTADOS (Lógica original) ---
  const [selectedBlock, setSelectedBlock] = useState<ISelectedBlock | null>(null);
  const [existingBlocks, setExistingBlocks] = useState<IBloque[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [metrologo, setMetrologo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [codigoEquipo, setCodigoEquipo] = useState('');
  const [imagenesPreview, setImagenesPreview] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<FileList | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- EFECTOS Y HANDLERS (Lógica original intacta) ---
  useEffect(() => {
    const loadExistingBlocks = async () => {
      try {
        setIsLoadingBlocks(true);
        const response = await obtenerReportes();
        setExistingBlocks(response);
      } catch (err: any) {
        setError((err as Error).message || 'Error al cargar los bloques existentes.');
      } finally {
        setIsLoadingBlocks(false);
      }
    };
    loadExistingBlocks();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(e.target.value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const filesFromInput = Array.from(e.target.files);
    setIsCompressing(true);
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
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleCodigoEquipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCodigo = e.target.value.trim();
    setCodigoEquipo(newCodigo);

    if (!selectedBlock) return;

    const currentBlock = existingBlocks.find(
      b => b.departamento === selectedBlock.departamento && b.nombreCliente === selectedBlock.nombreCliente
    );

    if (!currentBlock) return;

    const existingReport = currentBlock.reportes.find(
      (r: IReporteIndividual) => r.codigoEquipo === newCodigo
    );

    if (existingReport) {
      setIsUpdateMode(true);
      setMetrologo(existingReport.metrologo);
      setObservaciones(existingReport.observaciones || '');
    } else {
      setIsUpdateMode(false);
      setMetrologo('');
      setObservaciones('');
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

  useEffect(() => {
    return () => {
      imagenesPreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagenesPreview]);

  const handleCreateNewBlock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newDepartamento = (e.target as any).departamento.value;
    const newNombreCliente = (e.target as any).nombreCliente.value;

    if (!newDepartamento || !newNombreCliente) return;
    setLoading(true);

    try {
      const nuevoBloque = await crearNuevoBloque(newDepartamento, newNombreCliente);
      setExistingBlocks(prev => [nuevoBloque, ...prev]);
      setSelectedBlock({
        departamento: nuevoBloque.departamento,
        nombreCliente: nuevoBloque.nombreCliente
      });
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
      const bloquesActualizados = await obtenerReportes();
      setExistingBlocks(bloquesActualizados);
    } catch (err) {
      console.error("Error al refrescar bloques:", err);
    } finally {
      setIsLoadingBlocks(false);
      setSelectedBlock(null);
      setError(null);
      setSuccess(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedBlock) { setError('No se ha seleccionado ningún bloque.'); return; }
    if (!imagenes || imagenes.length === 0) { setError('Debes seleccionar al menos una imagen.'); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    for (let i = 0; i < imagenes.length; i++) {
      formData.append('imagenesEquipo', imagenes[i]);
    }

    try {
      if (isUpdateMode) {
        formData.append('codigoEquipo', codigoEquipo);
        await anadirImagenesReporte(formData);
        setSuccess(`¡Imágenes añadidas al equipo ${codigoEquipo}!`);
      } else {
        formData.append('departamento', selectedBlock!.departamento);
        formData.append('nombreCliente', selectedBlock!.nombreCliente);
        formData.append('metrologo', metrologo);
        formData.append('codigoEquipo', codigoEquipo);
        formData.append('observaciones', observaciones);
        await subirReporte(formData);
        setSuccess('¡Reporte nuevo creado exitosamente!');
      }

      setMetrologo('');
      setCodigoEquipo('');
      setImagenes(null);
      setImagenesPreview([]);
      (e.target as HTMLFormElement).reset();
      setIsUpdateMode(false);
      obtenerReportes().then(response => setExistingBlocks(response));

    } catch (err: any) {
      console.error("Error del servidor:", err.response);
      if (err.response && err.response.data && err.response.data.msg) {
        setError(err.response.data.msg);
      } else {
        setError(err.message || 'Ocurrió un error desconocido.');
      }
    } finally {
      setLoading(false);
    }
  };

  // RENDERIZADO DE VISTA 1: SELECCIÓN

  if (!selectedBlock) {
    return (
      // 1. ELIMINAMOS centrado (flex items-center justify-center)
      //    Y mantenemos el padding y el min-height
      <div className="min-h-screen bg-white">

        {/* 2. ELIMINAMOS max-w-md y mx-auto para que ocupe todo el ancho */}
        <Card className="w-full max-w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-slate-800">Gestión de Reportes</CardTitle>
            <CardDescription className="text-center">Seleccione o cree un bloque de trabajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Selector */}
            <div className="space-y-2">
              <Label>Seleccionar Bloque Existente</Label>
              {/* NOTE: Select uses max-w-full by default inside a Card */}
              <Select onValueChange={(val: any) => {
                const [dep, nom] = val.split('|');
                setSelectedBlock({ departamento: dep, nombreCliente: nom });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingBlocks ? "Cargando..." : "Seleccione un bloque"} />
                </SelectTrigger>
                <SelectContent>
                  {existingBlocks.map((bloque) => (
                    <SelectItem key={bloque._id} value={`${bloque.departamento}|${bloque.nombreCliente}`}>
                      <span className="font-medium">{bloque.nombreCliente}</span>
                      <span className="text-xs text-slate-500 ml-2">({bloque.departamento})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">O crear nuevo</span></div>
            </div>

            {/* Formulario Crear Nuevo */}
            <form onSubmit={handleCreateNewBlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="departamento">Lugar / Departamento</Label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                  <Input id="departamento" className="pl-8" placeholder="Ej: Lima" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombreCliente">Cliente / Clínica</Label>
                <div className="relative">
                  <User className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                  <Input id="nombreCliente" className="pl-8" placeholder="Ej: Clínica San Pablo" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear y Continuar
              </Button>
            </form>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

          </CardContent>
        </Card>
      </div>
    );
  }

  // --- RENDERIZADO DE VISTA 2: FORMULARIO ---
  return (
    <div className="min-h-screen bg-white-50 flex flex-col items-center">
      <Card className="w-full max-w-md shadow-lg mb-6">

        {/* Cabecera del Bloque */}
        <CardHeader className="bg-stone-50 border-b pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardDescription>Trabajando en:</CardDescription>
              <CardTitle className="text-lg text-slate-800">{selectedBlock.nombreCliente}</CardTitle>
              <p className="text-sm text-slate-500 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1" /> {selectedBlock.departamento}</p>
            </div>
            <Button variant="outline" size="sm" onClick={changeBlock} className="text-xs h-8">
              Cambiar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Código de Equipo */}
            <div className="space-y-2">
              <Label htmlFor="codigoEquipo">Código de Equipo</Label>
              <div className="relative">
                <Input
                  id="codigoEquipo"
                  value={codigoEquipo}
                  onChange={handleCodigoEquipoChange}
                  placeholder="Ej: 2121"
                  required
                />
              </div>
              {isUpdateMode && (
                <Alert className="bg-blue-50 border-blue-200 py-2">
                  <AlertDescription className="text-blue-700 text-xs flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Equipo existente. Modo actualización activado.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Metrólogo */}
            <div className="space-y-2">
              <Label htmlFor="metrologo">Metrólogo</Label>
              <Input
                id="metrologo"
                value={metrologo}
                onChange={(e: any) => handleInputChange(e, setMetrologo)}
                required
                disabled={isUpdateMode}
                className={isUpdateMode ? "bg-slate-100" : ""}
                placeholder="Ej: RV, Renzo Vera, etc."
              />
            </div>

            <Separator />

            {/* Botones de Carga */}
            <div className="space-y-3">
              <Label>Fotografías del Equipo</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 border-dashed border-2 hover:border-solid hover:bg-blue-50 hover:text-blue-600 hover:border-blue-500 transition-all"
                  onClick={() => document.getElementById('input-camera')?.click()}
                  disabled={isCompressing}
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Tomar Foto</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2 border-dashed border-2 hover:border-solid hover:bg-blue-50 hover:text-blue-600 hover:border-blue-500 transition-all"
                  onClick={() => document.getElementById('input-gallery')?.click()}
                  disabled={isCompressing}
                >
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs">Galería</span>
                </Button>

                {/* Inputs Ocultos */}
                <input id="input-camera" type="file" className="hidden" accept="image/*" multiple capture="environment" onChange={handleFileChange} disabled={isCompressing} />
                <input id="input-gallery" type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} disabled={isCompressing} />
              </div>

              {isCompressing && (
                <div className="flex items-center justify-center text-sm text-blue-600 animate-pulse">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comprimiendo imágenes...
                </div>
              )}
            </div>

            {/* Previsualización Grid */}
            {imagenesPreview.length > 0 && (
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
            )}
            <Separator />
            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObservaciones(e.target.value)}
                placeholder="Ingrese observaciones del equipo, estado, condiciones, etc."
                rows={4}
                disabled={isUpdateMode} // opcional
                className={isUpdateMode ? "bg-slate-100" : ""}
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || isCompressing || imagenesPreview.length === 0}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              {loading ? 'Procesando...' : (isUpdateMode ? 'Guardar Imágenes' : 'Guardar Reporte')}
            </Button>
          </form>
        </CardContent>

        {/* Footer con Mensajes */}
        {(success || error) && (
          <CardFooter className="flex flex-col gap-2 bg-slate-50 rounded-b-lg">
            {success && (
              <Alert className="border-green-500 bg-green-50 text-green-900">
                <CheckCircle2 className="h-4 w-4 !text-green-600" />
                <AlertTitle>¡Éxito!</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
                <button onClick={() => setSuccess(null)} className="absolute right-4 top-4"><X className="h-4 w-4 text-green-700" /></button>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <button onClick={() => setError(null)} className="absolute right-4 top-4"><X className="h-4 w-4" /></button>
              </Alert>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
};