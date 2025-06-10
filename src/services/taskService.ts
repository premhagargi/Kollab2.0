
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
  Timestamp
} from 'firebase/firestore';

const TASKS_COLLECTION = 'tasks';

const mapTimestampToISO = (timestampField: any): string => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  // Fallback for client-side optimistic updates or if already a string
  return typeof timestampField === 'string' ? timestampField : new Date().toISOString();
};


/**
 * Creates a new task in Firestore.
 * @param taskData The data for the new task, including boardId, columnId, and creatorId.
 * @returns The created task object with its Firestore ID.
 */
export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
  try {
    const newTaskData = {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTaskData);
    
    // For optimistic updates, we create an approximate Task object for immediate UI feedback
    const now = new Date().toISOString();
    return {
      id: docRef.id,
      ...taskData,
      createdAt: now, // Use client-side timestamp for immediate UI update
      updatedAt: now, // Use client-side timestamp for immediate UI update
    };
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

/**
 * Fetches all tasks for a specific board.
 * @param boardId The ID of the board.
 * @returns A promise that resolves to an array of Task objects.
 */
export const getTasksByBoard = async (boardId: string): Promise<Task[]> => {
  try {
    const q = query(collection(db, TASKS_COLLECTION), where('boardId', '==', boardId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: mapTimestampToISO(docSnap.data().createdAt),
      updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
    } as Task));
  } catch (error) {
    console.error("Error fetching tasks by board:", error);
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
export const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'boardId' | 'creatorId'>>): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating task:", error);
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
