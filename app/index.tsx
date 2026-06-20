import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert, 
  ScrollView 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { decode } from 'base64-arraybuffer'; // Opcional, o puedes subir usando File / Blob alternativo
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/storageClient';

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [document, setDocument] = useState<DocumentPicker.DocumentPickerResult | null>(null);
  const [uploading, setUploading] = useState(false);

  // 1. Seleccionar imagen de la galería
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // 2. Seleccionar archivo arbitrario
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Cualquier tipo de archivo
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      setDocument(result);
    }
  };

  // Función auxiliar para transformar URI local a ArrayBuffer compatible con Supabase Storage
  const uploadToSupabase = async (uri: string, fileName: string, mimeType: string) => {
    // Leer el archivo local en base64 usando FileSystem de Expo
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Convertir base64 a ArrayBuffer usando base64-arraybuffer (o una función nativa)
    const arrayBuffer = decode(base64);

    const { data, error } = await supabase.storage
      .from('uploads') // Nombre del bucket creado en Supabase
      .upload(fileName, arrayBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) throw error;
    return data;
  };

  // 3. Lógica asíncrona para subir al servicio
  const handleUpload = async () => {
    if (!imageUri && !document) {
      Alert.alert('Atención', 'Por favor selecciona al menos una imagen o un archivo.');
      return;
    }

    setUploading(true);

    try {
      // Subir Imagen si existe
      if (imageUri) {
        const fileExt = imageUri.split('.').pop();
        const fileName = `image_${Date.now()}.${fileExt}`; // Timestamp para nombre único
        await uploadToSupabase(imageUri, fileName, `image/${fileExt}`);
      }

      // Subir Documento si existe
      if (document && document.assets && document.assets[0]) {
        const doc = document.assets[0];
        const fileExt = doc.name.split('.').pop();
        const fileName = `doc_${Date.now()}.${fileExt}`; // Timestamp para nombre único
        await uploadToSupabase(doc.uri, fileName, doc.mimeType || 'application/octet-stream');
      }

      Alert.alert('¡Éxito!', 'Contenido cargado correctamente a la nube.');
      // Limpiar campos tras éxito
      setImageUri(null);
      setDocument(null);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', `Hubo un fallo en la subida: ${error.message || error}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Almacenamiento en la Nube</Text>
      
      {/* Sección Imagen */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>📸 Seleccionar Imagen</Text>
        </TouchableOpacity>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.thumbnail} />
        )}
      </View>

      {/* Sección Documento */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.button} onPress={pickDocument}>
          <Text style={styles.buttonText}>📄 Seleccionar Archivo</Text>
        </TouchableOpacity>
        {document && document.assets && (
          <Text style={styles.fileName}>
            Seleccionado: {document.assets[0].name}
          </Text>
        )}
      </View>

      {/* Botón de Enviar */}
      <TouchableOpacity 
        style={[styles.uploadButton, uploading && styles.disabledButton]} 
        onPress={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>🚀 Subir al Servicio</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  thumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginTop: 15,
    resizeMode: 'cover',
  },
  fileName: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a3e635',
  },
});