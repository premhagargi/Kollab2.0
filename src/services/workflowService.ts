
// src/services/workflowService.ts
// Renamed from boardService.ts
import { db } from '@/lib/firebase';
import type { Workflow, Column, Task, TaskPriority } from '@/types'; // Renamed Board to Workflow, added TaskPriority
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
        { id: `col-${now}-fp1`, name: 'Backlog', taskIds: [] },
        { id: `col-${now}-fp2`, name: 'Proposal/Quote', taskIds: [] },
        { id: `col-${now}-fp3`, name: 'Active Work', taskIds: [] },
        { id: `col-${now}-fp4`, name: 'Client Review', taskIds: [] },
        { id: `col-${now}-fp5`, name: 'Revisions', taskIds: [] },
        { id: `col-${now}-fp6`, name: 'Final Delivery', taskIds: [] },
        { id: `col-${now}-fp7`, name: 'Paid', taskIds: [] },
      ];
    case 'Content Creation':
      return [
        { id: `col-${now}-cc1`, name: 'Ideas', taskIds: [] },
        { id: `col-${now}-cc2`, name: 'Researching', taskIds: [] },
        { id: `col-${now}-cc3`, name: 'Drafting', taskIds: [] },
        { id: `col-${now}-cc4`, name: 'Review', taskIds: [] },
        { id: `col-${now}-cc5`, name: 'Ready to Publish', taskIds: [] },
        { id: `col-${now}-cc6`, name: 'Published', taskIds: [] },
      ];
    case 'Social Media Content Calendar':
      return [
        { id: `col-${now}-sm1`, name: 'Ideas/Brainstorm', taskIds: [] },
        { id: `col-${now}-sm2`, name: 'To Draft (Content/Copy)', taskIds: [] },
        { id: `col-${now}-sm3`, name: 'Visuals Needed/Creating', taskIds: [] },
        { id: `col-${now}-sm4`, name: 'Scheduled', taskIds: [] },
        { id: `col-${now}-sm5`, name: 'Published', taskIds: [] },
        { id: `col-${now}-sm6`, name: 'Analyzing Performance', taskIds: [] },
      ];
    case 'Weekly Solo Sprint':
      return [
        { id: `col-${now}-ws1`, name: 'Sprint Goals', taskIds: [] },
        { id: `col-${now}-ws2`, name: 'Sprint Backlog', taskIds: [] },
        { id: `col-${now}-ws3`, name: 'Monday', taskIds: [] },
        { id: `col-${now}-ws4`, name: 'Tuesday', taskIds: [] },
        { id: `col-${now}-ws5`, name: 'Wednesday', taskIds: [] },
        { id: `col-${now}-ws6`, name: 'Thursday', taskIds: [] },
        { id: `col-${now}-ws7`, name: 'Friday', taskIds: [] },
        { id: `col-${now}-ws8`, name: 'Completed This Week', taskIds: [] },
        { id: `col-${now}-ws9`, name: 'Blocked/Needs Review', taskIds: [] },
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

interface SampleTaskDefinition {
  title: string;
  description?: string;
  priority?: TaskPriority;
  targetColumnName: string;
}

const getSampleTaskDefinitionsForTemplate = (templateName?: string): SampleTaskDefinition[] => {
  switch (templateName) {
    case 'Social Media Content Calendar':
      return [
        { title: "Finalize Q3 Content Strategy Doc", targetColumnName: 'Ideas/Brainstorm', priority: 'high', description: "Review analytics and outline main themes for Q3." },
        { title: "Brainstorm 5 TikTok video ideas for new feature", targetColumnName: 'Ideas/Brainstorm', description: "Focus on engaging and short-form content." },
        { title: "Write copy: Instagram Product Launch Announcement", targetColumnName: 'To Draft (Content/Copy)', priority: 'urgent', description: "Include key features, benefits, and a call to action." },
        { title: "Design carousel images for IG launch (3-5 slides)", targetColumnName: 'Visuals Needed/Creating', priority: 'urgent', description: "Ensure visuals align with brand guidelines." },
        { title: "Schedule all approved posts for w/c Mon July 29th", targetColumnName: 'Scheduled', description: "Use scheduling tool to ensure timely posting." },
        { title: "Track engagement on last week's campaign", targetColumnName: 'Analyzing Performance', priority: 'medium' },
      ];
    case 'Weekly Solo Sprint':
      return [
        { title: "Define Top 3 Sprint Objectives", targetColumnName: 'Sprint Goals', priority: 'high', description: "What are the must-achieve items for this week?" },
        { title: "Client Alpha - Follow-up Email on Proposal", targetColumnName: 'Sprint Backlog', description: "Send by EOD Tuesday." },
        { title: "Develop User Authentication for Project Beta", targetColumnName: 'Sprint Backlog', priority: 'medium', description: "Implement email/password and Google Sign-In." },
        { title: "Morning: Code Review for Project Gamma", targetColumnName: 'Monday' },
        { title: "Afternoon: Outline Blog Post - 'Time Management for Freelancers'", targetColumnName: 'Monday' },
        { title: "Ship feature: User Authentication for Project Beta", targetColumnName: 'Completed This Week', priority: 'high' },
        { title: "Waiting for client feedback on design mockups", targetColumnName: 'Blocked/Needs Review' },
      ];
    default:
      return [];
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
  const batch = writeBatch(db);
  const workflowDocRef = doc(collection(db, WORKFLOWS_COLLECTION));

  const initialColumns = getColumnsByTemplate(templateName);
  const columnsWithTaskIds = JSON.parse(JSON.stringify(initialColumns)) as Column[]; // Deep copy for modification

  const newWorkflowData = {
    name: workflowName,
    ownerId: userId,
    columns: columnsWithTaskIds, // Will be used as is if no sample tasks
    template: templateName || 'Blank Workflow',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const sampleTaskDefinitions = getSampleTaskDefinitionsForTemplate(templateName);

  if (sampleTaskDefinitions.length > 0) {
    for (const sampleDef of sampleTaskDefinitions) {
      const taskDocRef = doc(collection(db, TASKS_COLLECTION)); // Firestore generates ID
      const targetColumn = columnsWithTaskIds.find(c => c.name === sampleDef.targetColumnName);

      if (targetColumn) {
        const taskDataForDb = {
          title: sampleDef.title,
          description: sampleDef.description || '',
          priority: sampleDef.priority || 'medium' as TaskPriority,
          subtasks: [],
          comments: [],
          workflowId: workflowDocRef.id, // Link to the new workflow
          columnId: targetColumn.id,
          creatorId: userId,
          ownerId: userId, // Denormalized ownerId
          isCompleted: false,
          isBillable: false,
          clientName: '',
          deliverables: [],
          isArchived: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(taskDocRef, taskDataForDb);
        targetColumn.taskIds.push(taskDocRef.id); // Add new task ID to the column
      }
    }
    // Update newWorkflowData with columns that now include task IDs
    newWorkflowData.columns = columnsWithTaskIds;
  }

  batch.set(workflowDocRef, newWorkflowData); // Add workflow creation to batch

  try {
    await batch.commit();
    const now = new Date().toISOString();
    return {
      id: workflowDocRef.id,
      name: newWorkflowData.name,
      ownerId: newWorkflowData.ownerId,
      columns: newWorkflowData.columns, // These now include IDs of sample tasks if any
      template: newWorkflowData.template,
      createdAt: now, // Approximate client-side timestamp
      updatedAt: now, // Approximate client-side timestamp
    };
  } catch (error) {
    console.error("Error creating workflow with sample tasks:", error);
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

