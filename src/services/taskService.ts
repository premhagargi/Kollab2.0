
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

// --- Caching Logic ---
const taskCache = new Map<string, { data: any, expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache<T>(key: string): T | undefined {
  const entry = taskCache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  taskCache.delete(key);
  return undefined;
}

function setCache(key: string, data: any) {
  taskCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function invalidateCache(key?: string, prefix?: string) {
  if (key) {
    taskCache.delete(key);
  }
  if (prefix) {
    for (const k of taskCache.keys()) {
      if (k.startsWith(prefix)) {
        taskCache.delete(k);
      }
    }
  }
}
// --- End Caching Logic ---

const mapTimestampToISO = (timestampField: any): string => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  return typeof timestampField === 'string' ? timestampField : new Date().toISOString();
};

// Task type no longer has clientName, it's on Workflow
export const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted' | 'isBillable' | 'deliverables' | 'ownerId'> & Partial<Pick<Task, 'deliverables' | 'isBillable'>>): Promise<Task> => {
  try {
    const newTaskData = {
      ...taskData, ownerId: taskData.creatorId, isCompleted: false,
      isBillable: taskData.isBillable || false, 
      deliverables: taskData.deliverables || [], isArchived: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, TASKS_COLLECTION), newTaskData);
    
    invalidateCache(undefined, `tasks_workflow_${taskData.workflowId}_owner_${newTaskData.ownerId}`);
    invalidateCache(undefined, `tasks_all_owner_${newTaskData.ownerId}`);

    const now = new Date().toISOString();
    return {
      id: docRef.id, ...taskData, ownerId: newTaskData.ownerId,
      isCompleted: false, isBillable: newTaskData.isBillable,
      deliverables: newTaskData.deliverables,
      isArchived: false, createdAt: now, updatedAt: now, 
    };
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

export const getTasksByWorkflow = async (workflowId: string, userId: string): Promise<Task[]> => {
  if (!workflowId || !userId) return [];
  const cacheKey = `tasks_workflow_${workflowId}_owner_${userId}`;
  const cachedData = getCache<Task[]>(cacheKey);
  if (cachedData) return cachedData;

  try {
    const q = query(
      collection(db, TASKS_COLLECTION), 
      where('workflowId', '==', workflowId),
      where('ownerId', '==', userId),
      where('isArchived', '==', false)
    );
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id, ...docSnap.data(),
      isCompleted: docSnap.data().isCompleted || false,
      isBillable: docSnap.data().isBillable || false,
      deliverables: docSnap.data().deliverables || [],
      createdAt: mapTimestampToISO(docSnap.data().createdAt),
      updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
    } as Task));
    setCache(cacheKey, tasks);
    return tasks;
  } catch (error) {
    console.error("Error fetching tasks by workflow:", error);
    throw error;
  }
};

export const getAllTasksByOwner = async (userId: string): Promise<Task[]> => {
  if (!userId) return [];
  const cacheKey = `tasks_all_owner_${userId}`;
  const cachedData = getCache<Task[]>(cacheKey);
  if (cachedData) return cachedData;

  try {
    const q = query(
      collection(db, TASKS_COLLECTION),
      where('ownerId', '==', userId),
      where('isArchived', '==', false)
    );
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(docSnap => ({
      id: docSnap.id, ...docSnap.data(),
      isCompleted: docSnap.data().isCompleted || false,
      isBillable: docSnap.data().isBillable || false,
      deliverables: docSnap.data().deliverables || [],
      createdAt: mapTimestampToISO(docSnap.data().createdAt),
      updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
    } as Task));
    setCache(cacheKey, tasks);
    return tasks;
  } catch (error) {
    console.error("Error fetching all tasks by owner:", error);
    throw error;
  }
};

export const getTaskById = async (taskId: string): Promise<Task | null> => {
  const cacheKey = `task_${taskId}`;
  const cachedData = getCache<Task | null>(cacheKey);
  if (cachedData !== undefined) return cachedData;

  try {
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const task = {
        id: docSnap.id, ...data,
        isCompleted: data.isCompleted || false,
        isBillable: data.isBillable || false,
        deliverables: data.deliverables || [],
        createdAt: mapTimestampToISO(data.createdAt),
        updatedAt: mapTimestampToISO(data.updatedAt),
      } as Task;
      setCache(cacheKey, task);
      return task;
    }
    setCache(cacheKey, null);
    return null;
  } catch (error) {
    console.error("Error fetching task by ID:", error);
    throw error;
  }
};

export const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'workflowId' | 'creatorId' | 'ownerId'>>): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    const dataToUpdate = { ...updates };
    if (updates.isBillable === false) dataToUpdate.isBillable = false;
    if (updates.isCompleted === false) dataToUpdate.isCompleted = false;
    if (updates.isArchived === false) dataToUpdate.isArchived = false;

    await updateDoc(taskDocRef, { ...dataToUpdate, updatedAt: serverTimestamp() });

    const task = await getTaskById(taskId); // Re-fetch to get workflowId and ownerId for invalidation
    if (task) {
      invalidateCache(`task_${taskId}`);
      invalidateCache(undefined, `tasks_workflow_${task.workflowId}_owner_${task.ownerId}`);
      invalidateCache(undefined, `tasks_all_owner_${task.ownerId}`);
    }
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

export const archiveTask = async (taskId: string): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      isArchived: true, archivedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    const task = await getTaskById(taskId); 
    if (task) {
      invalidateCache(`task_${taskId}`);
      invalidateCache(undefined, `tasks_workflow_${task.workflowId}_owner_${task.ownerId}`);
      invalidateCache(undefined, `tasks_all_owner_${task.ownerId}`);
    }
  } catch (error) {
    console.error("Error archiving task:", error);
    throw error;
  }
};

export const unarchiveTask = async (taskId: string): Promise<void> => {
  try {
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await updateDoc(taskDocRef, {
      isArchived: false, archivedAt: deleteField(), updatedAt: serverTimestamp(),
    });
     const task = await getTaskById(taskId); 
    if (task) {
      invalidateCache(`task_${taskId}`);
      invalidateCache(undefined, `tasks_workflow_${task.workflowId}_owner_${task.ownerId}`);
      invalidateCache(undefined, `tasks_all_owner_${task.ownerId}`);
    }
  } catch (error) {
    console.error("Error unarchiving task:", error);
    throw error;
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const task = await getTaskById(taskId); // Get details before deleting for cache invalidation
    const taskDocRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskDocRef);
    if (task) {
      invalidateCache(`task_${taskId}`);
      invalidateCache(undefined, `tasks_workflow_${task.workflowId}_owner_${task.ownerId}`);
      invalidateCache(undefined, `tasks_all_owner_${task.ownerId}`);
    }
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};
