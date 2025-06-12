
// src/services/workflowService.ts
// Renamed from boardService.ts
import { db } from '@/lib/firebase';
import type { Workflow, Column } from '@/types'; // Renamed Board to Workflow
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
} from 'firebase/firestore';

const WORKFLOWS_COLLECTION = 'boards'; // Firestore collection name remains 'boards' for now to avoid data migration
const TASKS_COLLECTION = 'tasks';

const mapTimestampToISO = (timestampField: any): string | undefined => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  return undefined;
};

// Default columns for different workflow templates
export const getColumnsByTemplate = (templateName?: string): Column[] => {
  const now = Date.now();
  switch (templateName) {
    case 'Freelance Project':
      return [
        { id: `col-${now}-1`, name: 'Backlog', taskIds: [] },
        { id: `col-${now}-2`, name: 'Proposal/Quote', taskIds: [] },
        { id: `col-${now}-3`, name: 'Active Work', taskIds: [] },
        { id: `col-${now}-4`, name: 'Client Review', taskIds: [] },
        { id: `col-${now}-5`, name: 'Revisions', taskIds: [] },
        { id: `col-${now}-6`, name: 'Final Delivery', taskIds: [] },
        { id: `col-${now}-7`, name: 'Paid', taskIds: [] },
      ];
    case 'Content Creation':
      return [
        { id: `col-${now}-1`, name: 'Ideas', taskIds: [] },
        { id: `col-${now}-2`, name: 'Researching', taskIds: [] },
        { id: `col-${now}-3`, name: 'Drafting', taskIds: [] },
        { id: `col-${now}-4`, name: 'Review', taskIds: [] },
        { id: `col-${now}-5`, name: 'Ready to Publish', taskIds: [] },
        { id: `col-${now}-6`, name: 'Published', taskIds: [] },
      ];
    case 'Social Media Content Calendar':
      return [
        { id: `col-${now}-s1`, name: 'Ideas/Brainstorm', taskIds: [] },
        { id: `col-${now}-s2`, name: 'To Draft (Content/Copy)', taskIds: [] },
        { id: `col-${now}-s3`, name: 'Visuals Needed/Creating', taskIds: [] },
        { id: `col-${now}-s4`, name: 'Scheduled', taskIds: [] },
        { id: `col-${now}-s5`, name: 'Published', taskIds: [] },
        { id: `col-${now}-s6`, name: 'Analyzing Performance', taskIds: [] },
      ];
    case 'Weekly Solo Sprint':
      return [
        { id: `col-${now}-w1`, name: 'Sprint Goals', taskIds: [] },
        { id: `col-${now}-w2`, name: 'Sprint Backlog', taskIds: [] },
        { id: `col-${now}-w3`, name: 'Monday', taskIds: [] },
        { id: `col-${now}-w4`, name: 'Tuesday', taskIds: [] },
        { id: `col-${now}-w5`, name: 'Wednesday', taskIds: [] },
        { id: `col-${now}-w6`, name: 'Thursday', taskIds: [] },
        { id: `col-${now}-w7`, name: 'Friday', taskIds: [] },
        { id: `col-${now}-w8`, name: 'Completed This Week', taskIds: [] },
        { id: `col-${now}-w9`, name: 'Blocked/Needs Review', taskIds: [] },
      ];
    case 'Blank Workflow':
    default:
      return [
        { id: `col-${now}-b1`, name: 'To Do', taskIds: [] },
        { id: `col-${now}-b2`, name: 'In Progress', taskIds: [] },
        { id: `col-${now}-b3`, name: 'Done', taskIds: [] },
      ];
  }
};

/**
 * Creates a new workflow in Firestore for a given user.
 * @param userId The UID of the user creating the workflow.
 * @param workflowName The name of the new workflow.
 * @param templateName Optional name of the template to use for columns.
 * @returns The created workflow object with its Firestore ID.
 */
export const createWorkflow = async (userId: string, workflowName: string, templateName?: string): Promise<Workflow> => {
  try {
    const newWorkflowData = {
      name: workflowName,
      ownerId: userId,
      columns: getColumnsByTemplate(templateName),
      template: templateName || 'Blank Workflow',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, WORKFLOWS_COLLECTION), newWorkflowData);
    return {
      id: docRef.id,
      ...newWorkflowData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      columns: newWorkflowData.columns,
    } as Workflow;
  } catch (error) {
    console.error("Error creating workflow:", error);
    throw error;
  }
};

/**
 * Fetches all workflows owned by a specific user.
 * @param userId The UID of the user.
 * @returns A promise that resolves to an array of Workflow objects.
 */
export const getWorkflowsByOwner = async (userId: string): Promise<Workflow[]> => {
  try {
    const q = query(collection(db, WORKFLOWS_COLLECTION), where('ownerId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: mapTimestampToISO(docSnap.data().createdAt),
      updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
    } as Workflow));
  } catch (error) {
    console.error("Error fetching workflows by owner:", error);
    throw error;
  }
};

/**
 * Fetches a single workflow by its ID.
 * @param workflowId The ID of the workflow to fetch.
 * @returns A promise that resolves to the Workflow object if found, otherwise null.
 */
export const getWorkflowById = async (workflowId: string): Promise<Workflow | null> => {
  try {
    const docRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: mapTimestampToISO(docSnap.data().createdAt),
        updatedAt: mapTimestampToISO(docSnap.data().updatedAt),
      } as Workflow;
    }
    return null;
  } catch (error) {
    console.error("Error fetching workflow by ID:", error);
    throw error;
  }
};

/**
 * Updates an existing workflow in Firestore.
 * @param workflowId The ID of the workflow to update.
 * @param updates An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export const updateWorkflow = async (workflowId: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const workflowDocRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
    await updateDoc(workflowDocRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating workflow:", error);
    throw error;
  }
};

/**
 * Deletes a workflow and all its associated tasks from Firestore.
 * @param workflowId The ID of the workflow to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteWorkflow = async (workflowId: string): Promise<void> => {
  const batch = writeBatch(db);
  try {
    const workflowDocRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
    batch.delete(workflowDocRef);

    // Query and delete all tasks associated with this workflow (using 'workflowId' field in tasks)
    const tasksQuery = query(collection(db, TASKS_COLLECTION), where('workflowId', '==', workflowId));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => {
      batch.delete(taskDoc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error deleting workflow and its tasks:", error);
    throw error;
  }
};
