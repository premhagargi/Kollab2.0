
// src/services/boardService.ts
import { db } from '@/lib/firebase';
import type { Board, Column } from '@/types';
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
  writeBatch,
  collectionGroup
} from 'firebase/firestore';

const BOARDS_COLLECTION = 'boards';
const TASKS_COLLECTION = 'tasks'; // For deleting tasks associated with a board

const mapTimestampToISO = (timestampField: any): string | undefined => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  return undefined;
};

// Default columns for a new board
export const getDefaultColumns = (): Column[] => [
  { id: `col-${Date.now()}-1`, name: 'To Do', taskIds: [] },
  { id: `col-${Date.now()}-2`, name: 'In Progress', taskIds: [] },
  { id: `col-${Date.now()}-3`, name: 'Done', taskIds: [] },
];

/**
 * Creates a new board in Firestore for a given user.
 * @param userId The UID of the user creating the board.
 * @param boardName The name of the new board.
 * @returns The created board object with its Firestore ID.
 */
export const createBoard = async (userId: string, boardName: string): Promise<Board> => {
  try {
    const newBoardData = {
      name: boardName,
      ownerId: userId,
      columns: getDefaultColumns(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, BOARDS_COLLECTION), newBoardData);
    return {
      id: docRef.id,
      ...newBoardData,
      createdAt: new Date().toISOString(), // Approximate client-side timestamp
      updatedAt: new Date().toISOString(), // Approximate client-side timestamp
      columns: newBoardData.columns, // Ensure columns are part of the returned object
    } as Board;
  } catch (error) {
    console.error("Error creating board:", error);
    throw error;
  }
};

/**
 * Fetches all boards owned by a specific user.
 * @param userId The UID of the user.
 * @returns A promise that resolves to an array of Board objects.
 */
export const getBoardsByOwner = async (userId: string): Promise<Board[]> => {
  try {
    const q = query(collection(db, BOARDS_COLLECTION), where('ownerId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: mapTimestampToISO(docSnap.data().createdAt),
      updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
    } as Board));
  } catch (error) {
    console.error("Error fetching boards by owner:", error);
    throw error;
  }
};

/**
 * Fetches a single board by its ID.
 * @param boardId The ID of the board to fetch.
 * @returns A promise that resolves to the Board object if found, otherwise null.
 */
export const getBoardById = async (boardId: string): Promise<Board | null> => {
  try {
    const docRef = doc(db, BOARDS_COLLECTION, boardId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: mapTimestampToISO(docSnap.data().createdAt),
        updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
      } as Board;
    }
    return null;
  } catch (error) {
    console.error("Error fetching board by ID:", error);
    throw error;
  }
};

/**
 * Updates an existing board in Firestore.
 * @param boardId The ID of the board to update.
 * @param updates An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export const updateBoard = async (boardId: string, updates: Partial<Omit<Board, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const boardDocRef = doc(db, BOARDS_COLLECTION, boardId);
    await updateDoc(boardDocRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating board:", error);
    throw error;
  }
};

/**
 * Deletes a board and all its associated tasks from Firestore.
 * @param boardId The ID of the board to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteBoard = async (boardId: string): Promise<void> => {
  const batch = writeBatch(db);
  try {
    // Delete the board document
    const boardDocRef = doc(db, BOARDS_COLLECTION, boardId);
    batch.delete(boardDocRef);

    // Query and delete all tasks associated with this board
    const tasksQuery = query(collection(db, TASKS_COLLECTION), where('boardId', '==', boardId));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
      batch.delete(taskDoc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error deleting board and its tasks:", error);
    throw error;
  }
};
