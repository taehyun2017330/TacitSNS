import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  UploadTaskSnapshot
} from "firebase/storage";
import { storage } from "./config";

// Upload file to Firebase Storage
export const uploadFile = async (
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const storageRef = ref(storage, path);

    if (onProgress) {
      // Use resumable upload with progress tracking
      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          }
        );
      });
    } else {
      // Simple upload without progress tracking
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Upload image with automatic path generation
export const uploadImage = async (
  folder: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const path = `${folder}/${fileName}`;

  return uploadFile(path, file, onProgress);
};

// Upload user profile image
export const uploadProfileImage = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return uploadImage(`users/${userId}/profile`, file, onProgress);
};

// Upload post image
export const uploadPostImage = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return uploadImage(`users/${userId}/posts`, file, onProgress);
};

// Delete file from Firebase Storage
export const deleteFile = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Get download URL for a file
export const getFileURL = async (path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// List all files in a folder
export const listFiles = async (path: string) => {
  try {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);

    const files = await Promise.all(
      result.items.map(async (itemRef) => ({
        name: itemRef.name,
        fullPath: itemRef.fullPath,
        url: await getDownloadURL(itemRef)
      }))
    );

    return files;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
