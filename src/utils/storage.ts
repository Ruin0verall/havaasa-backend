/**
 * Storage utility functions for handling file uploads to Supabase Storage
 */

import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Storage bucket configuration
 */
const STORAGE_BUCKET = 'article-images';
const PUBLIC_URL_EXPIRY = 365 * 24 * 60 * 60; // 1 year in seconds

/**
 * Interface for upload response
 */
interface UploadResponse {
  url: string;
  path: string;
}

/**
 * Uploads a file to Supabase storage
 * @param file - File buffer to upload
 * @param originalName - Original filename
 * @param token - Authentication token (not used with service role key)
 * @returns Promise with the upload response
 * @throws Error if upload fails
 */
export const uploadFile = async (
  file: Buffer,
  originalName: string,
  token?: string
): Promise<UploadResponse> => {
  try {
    // Generate unique filename
    const fileExt = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;

    console.log('Attempting to upload file:', {
      bucket: STORAGE_BUCKET,
      path: filePath,
      size: file.length,
      type: `image/${fileExt}`
    });

    // Upload file to Supabase Storage using service role key
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        contentType: `image/${fileExt}`,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    console.log('File uploaded successfully:', uploadData);

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to generate public URL for uploaded file');
    }

    return {
      url: publicUrlData.publicUrl,
      path: filePath
    };
  } catch (error: any) {
    console.error('Error in uploadFile:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Deletes a file from Supabase storage
 * @param filePath - Path of the file to delete
 * @param token - Authentication token (not used with service role key)
 * @throws Error if deletion fails
 */
export const deleteFile = async (filePath: string, token?: string): Promise<void> => {
  try {
    const { error: deleteError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      throw new Error(`Failed to delete file: ${deleteError.message}`);
    }
  } catch (error: any) {
    console.error('Error in deleteFile:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};
