
import React, { useState, useEffect } from 'react';
import {
  subirReporte,
  obtenerReportes,
  anadirImagenesReporte,
  type IBloque,
  type IReporteIndividual
} from '../services/api'; //vienen de api.ts
import imageCompression from 'browser-image-compression';

// --- INTERFAZ PARA TUS BLOQUES ---


interface ISelectedBlock {
  departamento: string;
  nombreCliente: string;
}

export const FormularioEnvio: React.FC = () => {

  const [selectedBlock, setSelectedBlock] = useState<ISelectedBlock | null>(null);
  const [existingBlocks, setExistingBlocks] = useState<IBloque[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [metrologo, setMetrologo] = useState('');
  const [codigoEquipo, setCodigoEquipo] = useState('');
  const [imagenesPreview, setImagenesPreview] = useState<string[]>([]);
  //imagenes como FileList
  const [imagenes, setImagenes] = useState<FileList | null>(null);
  //para actuzalizar imagenes en reporte existente
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  //estado de compresion de imagenes
  const [isCompressing, setIsCompressing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files) {
  //     const newFiles = Array.from(e.target.files);
  //     const newPreviews = newFiles.map(file => URL.createObjectURL(file));
  //     setImagenesPreview(prev => [...prev, ...newPreviews]);

  //     const newFileList = new DataTransfer();
  //     if (imagenes) {
  //       for (const imagen of Array.from(imagenes)) {
  //         newFileList.items.add(imagen);
  //       }
  //     }
  //     newFiles.forEach(file => newFileList.items.add(file));
  //     setImagenes(newFileList.files);
  //   }
  // };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

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
      // 1. Comprimimos (igual que antes)
      const compressedFilesPromises = filesFromInput.map(file => {
        console.log(`Original: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        return imageCompression(file, options);
      });

      // 2. Renombramos la variable para que sea más clara
      const compressedBlobs = await Promise.all(compressedFilesPromises);

      const newPreviews: string[] = [];
      const newFileList = new DataTransfer();

      // 3. Añadimos los archivos existentes (igual que antes)
      if (imagenes) {
        for (const imagen of Array.from(imagenes)) {
          newFileList.items.add(imagen);
        }
      }

      // --- 4. ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
      // Iteramos sobre los blobs comprimidos, usando el 'index'
      // para encontrar el nombre del archivo original.
      compressedBlobs.forEach((blob, index) => {
        const originalFile = filesFromInput[index]; // Obtenemos el archivo original

        // Creamos un nuevo objeto 'File' desde el 'Blob'
        const compressedFile = new File([blob], originalFile.name, {
          type: blob.type,
          lastModified: Date.now(),
        });

        console.log(`Comprimido: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);

        // ¡Ahora sí añadimos un 'File' válido!
        newFileList.items.add(compressedFile);

        // Creamos la preview desde el 'blob' (o el 'compressedFile', es igual)
        newPreviews.push(URL.createObjectURL(blob));
      });
      // --- FIN DE LA CORRECCIÓN ---

      // 5. Actualizamos los estados (igual que antes)
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

  //para actualizar imagenes en reporte existente
  const handleCodigoEquipoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCodigo = e.target.value.trim();
    setCodigoEquipo(newCodigo);

    if (!selectedBlock) return; // Sal si no hay bloque

    // 1. Encontrar el bloque actual en el que estamos
    const currentBlock = existingBlocks.find(
      b => b.departamento === selectedBlock.departamento && b.nombreCliente === selectedBlock.nombreCliente
    );

    if (!currentBlock) return; // El bloque no está cargado (raro, pero seguro)

    // 2. Buscar si el código ya existe DENTRO de ese bloque
    const existingReport = currentBlock.reportes.find(
      (r: IReporteIndividual) => r.codigoEquipo === newCodigo
    );

    if (existingReport) {
      // --- ¡MODO ACTUALIZACIÓN! ---
      console.log("Modo Actualización: Reporte encontrado.");
      setIsUpdateMode(true);
      setMetrologo(existingReport.metrologo); // Auto-rellena y deshabilita
    } else {
      // --- ¡MODO CREACIÓN! ---
      console.log("Modo Creación: Código nuevo.");
      setIsUpdateMode(false);
      setMetrologo(''); // Limpia por si acaso
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

  // Limpiar URLs al desmontar
  useEffect(() => {
    return () => {
      imagenesPreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagenesPreview]);


  // --- LÓGICA DE NAVEGACIÓN DE PASOS ---

  // 1. Cuando el usuario selecciona un BLOQUE EXISTENTE del <select>
  const handleBlockSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue) {
      const [departamento, nombreCliente] = selectedValue.split('|');
      setSelectedBlock({ departamento, nombreCliente });
    }
  };

  // 2. Cuando el usuario CREA UN NUEVO BLOQUE
  const handleCreateNewBlock = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Tomamos los valores de los inputs del formulario "Paso 1"
    const newDepartamento = (e.target as any).departamento.value;
    const newNombreCliente = (e.target as any).nombreCliente.value;

    if (newDepartamento && newNombreCliente) {
      setSelectedBlock({ departamento: newDepartamento, nombreCliente: newNombreCliente });
    }
  };

  // 3. Botón para volver al "Paso 1"
  const changeBlock = () => {
    setSelectedBlock(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validaciones (se quedan igual)
    if (!selectedBlock) {
      setError('No se ha seleccionado ningún bloque.');
      return;
    }
    if (!imagenes || imagenes.length === 0) {
      setError('Debes seleccionar al menos una imagen.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // 1. Creamos el FormData vacío
    const formData = new FormData();

    // 2. Las imágenes son comunes para ambos modos, las añadimos UNA SOLA VEZ
    for (let i = 0; i < imagenes.length; i++) {
      formData.append('imagenesEquipo', imagenes[i]);
    }

    try {
      if (isUpdateMode) {
        // --- LÓGICA DE ACTUALIZACIÓN ---
        // El modo 'update' SOLO necesita el código y las imágenes
        formData.append('codigoEquipo', codigoEquipo);

        await anadirImagenesReporte(formData);
        setSuccess(`¡Imágenes añadidas exitosamente al equipo ${codigoEquipo}!`);

      } else {
        // --- LÓGICA DE CREACIÓN ---
        // El modo 'create' necesita TODOS los datos (además de las imágenes)
        formData.append('departamento', selectedBlock!.departamento);
        formData.append('nombreCliente', selectedBlock!.nombreCliente);
        formData.append('metrologo', metrologo);
        formData.append('codigoEquipo', codigoEquipo);

        await subirReporte(formData);
        setSuccess('¡Reporte nuevo añadido al bloque exitosamente!');
      }

      // --- Lógica de éxito (común) ---
      setMetrologo('');
      setCodigoEquipo('');
      setImagenes(null);
      setImagenesPreview([]);
      (e.target as HTMLFormElement).reset();
      setIsUpdateMode(false); // Resetea el modo

      // Recarga los bloques
      obtenerReportes().then(response => setExistingBlocks(response));

    } catch (err: any) {
      console.error("Error del servidor:", err.response); // Para depurar
      if (err.response && err.response.data && err.response.data.msg) {
        setError(err.response.data.msg);
      } else {
        setError(err.message || 'Ocurrió un error desconocido.');
      }
    } finally {
      setLoading(false);
    }
  };
  // VISTA 1: El usuario NO ha seleccionado un bloque
  if (!selectedBlock) {
    return (
      <div>
        <h2>Paso 1: Seleccione o Cree un Bloque</h2>
        {isLoadingBlocks && <p>Cargando bloques existentes...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}

        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="select-bloque">Seleccionar Bloque Existente:</label>
          <select id="select-bloque" onChange={handleBlockSelect} defaultValue="">
            <option value="" disabled>-- Elija un bloque --</option>
            {existingBlocks.map((bloque) => (
              <option key={bloque._id} value={`${bloque.departamento}|${bloque.nombreCliente}`}>
                {bloque.departamento} / {bloque.nombreCliente} ({bloque.reportes.length} reportes)
              </option>
            ))}
          </select>
        </div>

        <hr />

        <div>
          <h3>...O Crear un Nuevo Bloque:</h3>
          <form onSubmit={handleCreateNewBlock}>
            <div>
              <label htmlFor="departamento">Lugar / Departamento:</label>
              <input id="departamento" type="text" required />
            </div>
            <div>
              <label htmlFor="nombreCliente">Cliente / Clínica:</label>
              <input id="nombreCliente" type="text" required />
            </div>
            <button type="submit" style={{ marginTop: '1rem' }}>
              Continuar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // VISTA 2: El usuario YA seleccionó un bloque
  return (
    <div>
      <div style={{ background: '#eee', padding: '1rem', borderRadius: '8px' }}>
        <h4>Añadiendo reporte a:</h4>
        <h3>{selectedBlock.departamento} / {selectedBlock.nombreCliente}</h3>
        <button type-="button" onClick={changeBlock}>
          (Cambiar Bloque)
        </button>
      </div>

      <h2 style={{ marginTop: '2rem' }}>Paso 2: Añadir Nuevo Reporte</h2>

      {/* Este es tu formulario original, pero sin los campos de bloque */}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="codigoEquipo">Código de Equipo:</label>
          <input
            id="codigoEquipo"
            type="text"
            value={codigoEquipo}
            onChange={handleCodigoEquipoChange}
            //onChange={(e) => handleInputChange(e, setCodigoEquipo)}
            required
          />
          {/* Ayuda visual para el usuario */}
          {isUpdateMode && (
            <>
              <br />
              <small style={{ color: 'green' }}>
                Añadiendo imágenes a un equipo existente.
              </small>
              <br />
            </>
          )}
        </div>
        <div>
          <label htmlFor="metrologo">Metrólogo:</label>
          <br />
          <input
            id="metrologo"
            type="text"
            value={metrologo}
            onChange={(e) => handleInputChange(e, setMetrologo)}
            required
            disabled={isUpdateMode} // <-- ¡CAMBIO! Deshabilita en modo update
            style={{ background: isUpdateMode ? '#f0f0f0' : '#fff' }} // Estilo visual
          />
        </div>

        {/* imagenes galeria y camera y compresion */}
        <div>
          <label>Imágenes del Equipo:</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
            {/* --- Botón 1: TOMAR FOTO --- */}
            {/* Usamos un <label> que parece un botón */}
            <label
              htmlFor="input-camera"
              style={{
                padding: '10px 15px', background: '#007bff', color: 'white', borderRadius: '5px', cursor: 'pointer', opacity: isCompressing ? 0.5 : 1,
                pointerEvents: isCompressing ? 'none' : 'auto'
              }}
            >
              Tomar Foto(s)
            </label>
            <input
              id="input-camera"
              type="file"
              onChange={handleFileChange} // Llama a la MISMA función
              accept="image/*"
              multiple
              capture="environment"
              style={{ display: 'none' }} // El input real está oculto
              disabled={isCompressing}
            />

            {/* --- Botón 2: SUBIR DE GALERÍA --- */}
            <label
              htmlFor="input-gallery"
              style={{
                padding: '10px 15px', background: '#6c757d', color: 'white', borderRadius: '5px', cursor: 'pointer', opacity: isCompressing ? 0.5 : 1,
                pointerEvents: isCompressing ? 'none' : 'auto'
              }}
            >
              Subir de Galería
            </label>
            <input
              id="input-gallery"
              type="file"
              onChange={handleFileChange} // Llama a la MISMA función
              accept="image/*"
              multiple
              style={{ display: 'none' }} // El input real está oculto
              disabled={isCompressing}
            />
          </div>
          {isCompressing && <p style={{ color: 'blue', fontWeight: 'bold' }}>Comprimiendo imágenes...</p>}
        </div>

        {/* Previsualización de imágenes */}
        {imagenesPreview.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {imagenesPreview.map((preview, index) => (
              <div key={preview} style={{ position: 'relative' }}>
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                />
                <button type="button" onClick={() => removeImage(index)} style={{ /* ...tus estilos... */ }}>×</button>
              </div>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || imagenesPreview.length === 0}
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Enviando...' : 'Añadir Reporte al Bloque'}
        </button>

        {/* Mensajes de estado */}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
      </form>
    </div>
  );
};