import dotenv from 'dotenv';
import { uploadToR2 } from './config/r2.js';

dotenv.config();

const testUpload = async () => {
  try {
    console.log('🧪 Probando conexión con R2...\n');
    console.log('📋 Configuración:');
    console.log('   Account ID:', process.env.R2_ACCOUNT_ID);
    console.log('   Bucket:', process.env.R2_BUCKET_NAME);
    console.log('   Public URL:', process.env.R2_PUBLIC_URL);
    console.log('   Access Key:', process.env.R2_ACCESS_KEY_ID ? '✓ Configurado' : '✗ Falta');
    console.log('   Secret Key:', process.env.R2_SECRET_ACCESS_KEY ? '✓ Configurado' : '✗ Falta');
    console.log('');
    
    // Crear un buffer de prueba
    const testBuffer = Buffer.from('TEST IMAGE DATA - Prueba de subida a R2 desde backend');
    
    console.log('📤 Subiendo archivo de prueba...');
    const url = await uploadToR2(testBuffer, 'test-prueba.txt', 'text/plain');
    
    console.log('\n✅ ¡ÉXITO! Archivo subido correctamente');
    console.log('🔗 URL:', url);
    console.log('\n💡 Copia esta URL y pégala en tu navegador para verificar que funciona');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n🔍 Posibles causas:');
    console.error('  1. Credenciales incorrectas en .env');
    console.error('  2. Bucket no existe o nombre incorrecto');
    console.error('  3. Dominio personalizado no está activo todavía');
    console.error('  4. Permisos del API token insuficientes');
    process.exit(1);
  }
};

testUpload();