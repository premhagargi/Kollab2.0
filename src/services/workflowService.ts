
// src/services/workflowService.ts
// Renamed from boardService.ts
import { db } from '@/lib/firebase';
import type { Workflow, Column, Task, TaskPriority } from '@/types'; 
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
// import { addDays, addWeeks, formatISO } from 'date-fns'; // No longer needed for CRON

const WORKFLOWS_COLLECTION = 'boards'; 
const TASKS_COLLECTION = 'tasks';

// --- Caching Logic ---
const workflowCache = new Map<string, { data: any, expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache<T>(key: string): T | undefined {
  const entry = workflowCache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  workflowCache.delete(key); 
  return undefined;
}

function setCache(key: string, data: any) {
  workflowCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

function invalidateCache(key?: string, prefix?: string) {
  if (key) {
    workflowCache.delete(key);
  }
  if (prefix) {
    for (const k of workflowCache.keys()) {
      if (k.startsWith(prefix)) {
        workflowCache.delete(k);
      }
    }
  }
}
// --- End Caching Logic ---

const mapTimestampToISO = (timestampField: any): string | undefined => {
  if (timestampField instanceof Timestamp) {
    return timestampField.toDate().toISOString();
  }
  if (typeof timestampField === 'string') {
    return timestampField;
  }
  return undefined;
};

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
  clientName?: string; // Added for potential sample data
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
     case 'Freelance Project':
      return [
        { title: "Initial client consultation call", targetColumnName: 'Backlog', priority: 'high', clientName: "New Client Co." },
        { title: "Draft project proposal & quote", targetColumnName: 'Proposal/Quote', priority: 'high', clientName: "New Client Co." },
        { title: "Design homepage mockup", targetColumnName: 'Active Work', priority: 'medium', clientName: "New Client Co." },
        { title: "Submit homepage mockup for review", targetColumnName: 'Client Review', priority: 'medium', clientName: "New Client Co." },
      ];
    default:
      return [];
  }
};


export const createWorkflow = async (userId: string, workflowName: string, templateName?: string): Promise<Workflow> => {
  const batch = writeBatch(db);
  const workflowDocRef = doc(collection(db, WORKFLOWS_COLLECTION));
  const initialColumns = getColumnsByTemplate(templateName);
  const columnsWithTaskIds = JSON.parse(JSON.stringify(initialColumns)) as Column[]; 
  let workflowClientName = ''; // Initialize workflow-level clientName

  const newWorkflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'> = {
    name: workflowName,
    ownerId: userId,
    columns: columnsWithTaskIds,
    template: templateName || 'Blank Workflow',
    clientName: '', // Default clientName for the workflow
  };

  const sampleTaskDefinitions = getSampleTaskDefinitionsForTemplate(templateName);
  if (sampleTaskDefinitions.length > 0) {
    // If sample tasks define a client name, use the first one for the workflow, or prioritize Freelance Project template
    const freelanceProjectClientSample = templateName === 'Freelance Project' ? sampleTaskDefinitions.find(s => s.clientName) : undefined;
    if (freelanceProjectClientSample) {
        workflowClientName = freelanceProjectClientSample.clientName!;
    } else {
        const firstTaskWithClientName = sampleTaskDefinitions.find(s => s.clientName);
        if (firstTaskWithClientName) {
            workflowClientName = firstTaskWithClientName.clientName!;
        }
    }
    newWorkflowData.clientName = workflowClientName;


    for (const sampleDef of sampleTaskDefinitions) {
      const taskDocRef = doc(collection(db, TASKS_COLLECTION)); 
      const targetColumn = columnsWithTaskIds.find(c => c.name === sampleDef.targetColumnName);
      if (targetColumn) {
        const taskDataForDb = {
          title: sampleDef.title, description: sampleDef.description || '',
          priority: sampleDef.priority || 'medium' as TaskPriority,
          subtasks: [], comments: [], workflowId: workflowDocRef.id, 
          columnId: targetColumn.id, creatorId: userId, ownerId: userId,
          isCompleted: false, isBillable: false, // clientName from sampleDef is not stored on task now
          deliverables: [],
          isArchived: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        };
        batch.set(taskDocRef, taskDataForDb);
        targetColumn.taskIds.push(taskDocRef.id);
      }
    }
    newWorkflowData.columns = columnsWithTaskIds;
  }
  batch.set(workflowDocRef, { ...newWorkflowData, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});

  try {
    await batch.commit();
    invalidateCache(undefined, `workflows_owner_${userId}`); // Invalidate list cache
    const now = new Date().toISOString();
    const returnedWorkflow: Workflow = {
      id: workflowDocRef.id,
      name: newWorkflowData.name,
      ownerId: newWorkflowData.ownerId,
      columns: newWorkflowData.columns,
      template: newWorkflowData.template,
      clientName: newWorkflowData.clientName,
      createdAt: now, 
      updatedAt: now,
    };
    return returnedWorkflow;
  } catch (error) {
    console.error("Error creating workflow with sample tasks:", error);
    throw error;
  }
};

const mapWorkflowDocumentToWorkflowObject = (docSnap: any): Workflow => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    ownerId: data.ownerId,
    columns: data.columns,
    template: data.template,
    clientName: data.clientName || '', // Ensure clientName defaults to empty string
    createdAt: mapTimestampToISO(data.createdAt),
    updatedAt: mapTimestampToISO(data.updatedAt),
  } as Workflow;
};


export const getWorkflowsByOwner = async (userId: string): Promise<Workflow[]> => {
  const cacheKey = `workflows_owner_${userId}`;
  const cachedData = getCache<Workflow[]>(cacheKey);
  if (cachedData) return cachedData;

  try {
    const q = query(collection(db, WORKFLOWS_COLLECTION), where('ownerId', '==', userId));
    const querySnapshot = await getDocs(q);
    const workflows = querySnapshot.docs.map(mapWorkflowDocumentToWorkflowObject);
    setCache(cacheKey, workflows);
    return workflows;
  } catch (error) {
    console.error("Error fetching workflows by owner:", error);
    throw error;
  }
};

export const getWorkflowById = async (workflowId: string): Promise<Workflow | null> => {
  const cacheKey = `workflow_${workflowId}`;
  const cachedData = getCache<Workflow | null>(cacheKey);
  if (cachedData !== undefined) return cachedData; 

  try {
    const docRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const workflow = mapWorkflowDocumentToWorkflowObject(docSnap);
      setCache(cacheKey, workflow);
      return workflow;
    }
    setCache(cacheKey, null); 
    return null;
  } catch (error) {
    console.error("Error fetching workflow by ID:", error);
    throw error;
  }
};

export const updateWorkflow = async (workflowId: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const workflowDocRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
    const dataToUpdate: any = { ...updates, updatedAt: serverTimestamp() };

    // Explicitly handle clientName if it's being set to an empty string
    if ('clientName' in updates && updates.clientName === '') {
      dataToUpdate.clientName = '';
    }


    await updateDoc(workflowDocRef, dataToUpdate);
    
    const currentWorkflowForOwnerId = await getWorkflowById(workflowId); 
    if (currentWorkflowForOwnerId) {
        invalidateCache(`workflow_${workflowId}`);
        invalidateCache(undefined, `workflows_owner_${currentWorkflowForOwnerId.ownerId}`);
    }

  } catch (error) {
    console.error("Error updating workflow:", error);
    throw error;
  }
};

export const deleteWorkflow = async (workflowId: string, ownerId: string): Promise<void> => {
  const batch = writeBatch(db);
  try {
    const workflowDocRef = doc(db, WORKFLOWS_COLLECTION, workflowId);
    batch.delete(workflowDocRef);
    const tasksQuery = query(collection(db, TASKS_COLLECTION), where('workflowId', '==', workflowId));
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.forEach(taskDoc => batch.delete(taskDoc.ref));
    await batch.commit();

    invalidateCache(`workflow_${workflowId}`);
    invalidateCache(undefined, `workflows_owner_${ownerId}`);
  } catch (error) {
    console.error("Error deleting workflow and its tasks:", error);
    throw error;
  }
};
