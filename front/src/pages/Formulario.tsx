// frontend/src/pages/FormularioEnvio.tsx
import React, { useState, useEffect } from 'react';
import { subirReporte, obtenerReportes } from '../services/api';

// --- INTERFAZ PARA TUS BLOQUES ---
interface IBloque {
  _id: string; // ID de MongoDB
  departamento: string;
  nombreCliente: string;
  reportes: any[]; // No necesitamos los detalles, solo la longitud
}

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
  const [imagenes, setImagenes] = useState<FileList | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadExistingBlocks = async () => {
      try {
        setIsLoadingBlocks(true);
        const response = await obtenerReportes(); // 'response' es IBloque[]

        // --- ¡LÍNEA CORREGIDA! ---
        setExistingBlocks(response); // 'response' ya es el array

      } catch (err: any) { // <-- He añadido :any
        // También es buena idea mostrar el error real
        setError((err as Error).message || 'Error al cargar los bloques existentes.');
      } finally {
        setIsLoadingBlocks(false);
      }
    };

    loadExistingBlocks();
  }, []);

  // --- MANEJADORES DE INPUTS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagenesPreview(prev => [...prev, ...newPreviews]);

      const newFileList = new DataTransfer();
      if (imagenes) {
        for (const imagen of Array.from(imagenes)) {
          newFileList.items.add(imagen);
        }
      }
      newFiles.forEach(file => newFileList.items.add(file));
      setImagenes(newFileList.files);
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


  // --- MANEJADOR DE ENVÍO DEL REPORTE (PASO 2) ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validaciones
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

    const formData = new FormData();
    // AÑADE LOS DATOS DEL BLOQUE (del estado)
    formData.append('departamento', selectedBlock.departamento);
    formData.append('nombreCliente', selectedBlock.nombreCliente);

    // AÑADE LOS DATOS DEL REPORTE (del formulario)
    formData.append('metrologo', metrologo);
    formData.append('codigoEquipo', codigoEquipo);

    for (let i = 0; i < imagenes.length; i++) {
      formData.append('imagenesEquipo', imagenes[i]);
    }

    try {
      await subirReporte(formData);
      setSuccess('¡Reporte añadido al bloque exitosamente!');

      // LIMPIAMOS SOLO EL FORMULARIO DE REPORTE
      // NO limpiamos el bloque seleccionado
      setMetrologo('');
      setCodigoEquipo('');
      setImagenes(null);
      setImagenesPreview([]);
      (e.target as HTMLFormElement).reset();

      // Opcional: Recargar la lista de bloques en segundo plano
      obtenerReportes().then(response => setExistingBlocks(response));

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error desconocido.');
    } finally {
      setLoading(false);
    }
  };


  // --- RENDERIZADO CONDICIONAL ---

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
          <label htmlFor="metrologo">Metrólogo:</label>
          <input
            id="metrologo"
            type="text"
            value={metrologo}
            onChange={(e) => handleInputChange(e, setMetrologo)}
            required
          />
        </div>
        <div>
          <label htmlFor="codigoEquipo">Código de Equipo:</label>
          <input
            id="codigoEquipo"
            type="text"
            value={codigoEquipo}
            onChange={(e) => handleInputChange(e, setCodigoEquipo)}
            required
          />
        </div>

        <div>
          <label htmlFor="imagenes">Imágenes del Equipo:</label>
          <input
            id="imagenes"
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            multiple
            capture="environment" //camera
          />
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