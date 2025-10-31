// frontend/src/pages/FormularioEnvio.tsx
import React, { useState } from 'react';
import { subirReporte } from '../services/api';

export const FormularioEnvio: React.FC = () => {
  // Estados para los campos de texto
  const [departamento, setDepartamento] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [metrologo, setMetrologo] = useState('');
  const [codigoEquipo, setCodigoEquipo] = useState('');
  
  // Estado para las previsualizaciones de imágenes
  const [imagenesPreview, setImagenesPreview] = useState<string[]>([]);
  
  // Estado para los archivos
  const [imagenes, setImagenes] = useState<FileList | null>(null);

  // Estados para la UI (carga y errores)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Manejador para los inputs de texto
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(e.target.value);
  };

  // Manejador para el input de archivos (de galería O cámara nativa)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Crear previsualizaciones para los archivos nuevos
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setImagenesPreview(prev => [...prev, ...newPreviews]); // Combina con las previews existentes

      // Combinar los archivos nuevos con los existentes (si los hay)
      const newFileList = new DataTransfer();
      
      // 1. Agregar las imágenes existentes (de la cámara o galería)
      if (imagenes) {
        for (const imagen of Array.from(imagenes)) {
          newFileList.items.add(imagen);
        }
      }
      
      // 2. Agregar las imágenes nuevas
      newFiles.forEach(file => newFileList.items.add(file));
      
      setImagenes(newFileList.files);
    }
  };

  // Función para eliminar una imagen
  const removeImage = (index: number) => {
    if (imagenes) {
      const newFileList = new DataTransfer();
      const filesArray = Array.from(imagenes);
      
      // Revocar la URL de la imagen que se va a eliminar
      URL.revokeObjectURL(imagenesPreview[index]);

      filesArray.splice(index, 1);
      filesArray.forEach(file => newFileList.items.add(file));
      setImagenes(newFileList.files);
      
      // Eliminar preview
      setImagenesPreview(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Limpiar los recursos al desmontar el componente
  React.useEffect(() => {
    return () => {
      // Limpia todas las URLs de previsualización para evitar fugas de memoria
      imagenesPreview.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imagenesPreview]);

  // Manejador del envío del formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Evita que la página se recargue
    
    if (!imagenes || imagenes.length === 0) {
      setError('Debes seleccionar al menos una imagen.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    // 1. Creamos el FormData
    const formData = new FormData();
    formData.append('departamento', departamento);
    formData.append('nombreCliente', nombreCliente);
    formData.append('metrologo', metrologo);
    formData.append('codigoEquipo', codigoEquipo);
    
    // 2. Adjuntamos TODAS las imágenes
    for (let i = 0; i < imagenes.length; i++) {
      formData.append('imagenesEquipo', imagenes[i]);
    }

    try {
      
      await subirReporte(formData);
      setSuccess('¡Reporte enviado con éxito!');
      
      setDepartamento('');
      setNombreCliente('');
      setMetrologo('');
      setCodigoEquipo('');
      setImagenes(null);
      setImagenesPreview([]); 
      (e.target as HTMLFormElement).reset(); // Resetea el input de archivos

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error desconocido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Nuevo Reporte de Equipo</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="departamento">Lugar / Departamento: </label>
          <input 
            id="departamento"
            type="text" 
            value={departamento} 
            onChange={(e) => handleInputChange(e, setDepartamento)} 
            required 
          />
        </div>
        <div>
          <label htmlFor="nombreCliente">Cliente / Clinica: </label>
          <input 
            id="nombreCliente"
            type="text" 
            value={nombreCliente} 
            onChange={(e) => handleInputChange(e, setNombreCliente)} 
            required 
          />
        </div>
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
            capture="camera" 
          />
          {/* Todos los botones y el <video> de la cámara en vivo han sido eliminados */}
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
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'red',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading || imagenesPreview.length === 0} // Condición actualizada
          style={{ marginTop: '1rem' }}
        >
          {loading ? 'Enviando...' : 'Enviar Reporte'}
        </button>

        {/* Mensajes de estado */}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
      </form>
    </div>
  );
};