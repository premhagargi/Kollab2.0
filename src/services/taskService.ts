
// src/services/taskService.ts
import { db } from '@/lib/firebase';
import type { Task } from '@/types';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  deleteField
} from 'firebase/firestore';

const TASKS_COLLECTION = 'tasks';

const mapTimestampToISO = (timestampField: any): string => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  return typeof timestampField === 'string' ? timestampField : new Date().toISOString();
};

/**
 * Creates a new task in Firestore.
 * @param taskData The data for the new task, including workflowId, columnId, and creatorId.
 * @returns The created task object with its Firestore ID.
 */
export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted' | 'isBillable' | 'clientName' | 'deliverables' | 'ownerId'> & Partial<Pick<Task, 'clientName' | 'deliverables' | 'isBillable'>>): Promise<Task> => {
  try {
    const newTaskData = {
      ...taskData,
      ownerId: taskData.creatorId, // Denormalize ownerId from creatorId (assuming workflow owner is creator)
      isCompleted: false,
      isBillable: taskData.isBillable || false,
      clientName: taskData.clientName || '',
      deliverables: taskData.deliverables || [],
      isArchived: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTaskData);
    
    const now = new Date().toISOString();
    return {
      id: docRef.id,
      ...taskData,
      ownerId: newTaskData.ownerId,
      isCompleted: false,
      isBillable: newTaskData.isBillable,
      clientName: newTaskData.clientName,
      deliverables: newTaskData.deliverables,
      isArchived: false,
      createdAt: now, 
      updatedAt: now, 
    };
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

/**
 * Fetches all tasks for a specific workflow, ensuring the user owns them.
 * @param workflowId The ID of the workflow.
 * @param userId The ID of the authenticated user.
 * @returns A promise that resolves to an array of Task objects.
 */
export const getTasksByWorkflow = async (workflowId: string, userId: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, TASKS_COLLECTION), 
      where('workflowId', '==', workflowId),
      where('ownerId', '==', userId) // Ensure tasks belong to the user
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      isCompleted: docSnap.data().isCompleted || false,
      isBillable: docSnap.data().isBillable || false,
      clientName: docSnap.data().clientName || '',
      deliverables: docSnap.data().deliverables || [],
      createdAt: mapTimestampToISO(docSnap.data().createdAt),
      updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
    } as Task));
  } catch (error) {
    console.error("Error fetching tasks by workflow:", error);
    throw error;
  }
};

/**
 * Fetches a single task by its ID.
 * @param taskId The ID of the task to fetch.
 * @returns A promise that resolves to the Task object if found, otherwise null.
 */
export const getTaskById = async (taskId: string): Promise<Task | null> => {
  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        isCompleted: data.isCompleted || false,
        isBillable: data.isBillable || false,
        clientName: data.clientName || '',
        deliverables: data.deliverables || [],
        createdAt: mapTimestampToISO(data.createdAt),
        updatedAt: mapTimestampToISO(data.updatedAt),
      } as Task;
    }
    return null;
  } catch (error) {
    console.error("Error fetching task by ID:", error);
    throw error;
  }
};

/**
 * Updates an existing task in Firestore.
 * @param taskId The ID of the task to update.
 * @param updates An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'workflowId' | 'creatorId' | 'ownerId'>>): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    const dataToUpdate = { ...updates };
    if (updates.isBillable === false) dataToUpdate.isBillable = false;
    if (updates.isCompleted === false) dataToUpdate.isCompleted = false;
    if (updates.isArchived === false) dataToUpdate.isArchived = false;

    await updateDoc(taskDocRef, {
      ...dataToUpdate,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

/**
 * Archives a task by setting its isArchived flag to true and adding an archivedAt timestamp.
 * @param taskId The ID of the task to archive.
 */
export const archiveTask = async (taskId: string): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      isArchived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error archiving task:", error);
    throw error;
  }
};

/**
 * Unarchives a task by setting its isArchived flag to false and removing the archivedAt timestamp.
 * @param taskId The ID of the task to unarchive.
 */
export const unarchiveTask = async (taskId: string): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      isArchived: false,
      archivedAt: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error unarchiving task:", error);
    throw error;
  }
};

/**
 * Deletes a task from Firestore.
 * @param taskId The ID of the task to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};
