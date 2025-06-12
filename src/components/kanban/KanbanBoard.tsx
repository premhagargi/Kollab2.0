
// src/components/kanban/KanbanBoard.tsx
"use client";
import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KanbanColumn } from './KanbanColumn';
import type { Column, Task, UserProfile } from '@/types';
import { Card } from '@/components/ui/card';

interface KanbanBoardProps {
  workflowColumns: Column[]; // Renamed from boardColumns
  allTasksForWorkflow: Task[]; // Renamed from allTasksForBoard
  creatorProfiles: Record<string, UserProfile | null>;
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
  onAddColumn: (columnName: string) => void;
  onTaskDrop: (taskId: string, sourceColumnId: string, destinationColumnId: string, targetTaskId?: string) => void;
  isAddingColumn: boolean;
  setIsAddingColumn: (isAdding: boolean) => void;
  onUpdateColumnName: (columnId: string, newName: string) => void;
  onToggleTaskCompleted: (taskId: string, completed: boolean) => void;
}

export function KanbanBoard({
  workflowColumns, // Renamed
  allTasksForWorkflow, // Renamed
  creatorProfiles,
  onTaskClick,
  onAddTask,
  onAddColumn,
  onTaskDrop,
  isAddingColumn,
  setIsAddingColumn,
  onUpdateColumnName,
  onToggleTaskCompleted,
}: KanbanBoardProps) {
  const [newColumnNameInput, setNewColumnNameInput] = useState('');

  const getTasksForColumn = (column: Column): Task[] => {
    const tasksInColumn = column.taskIds
      .map(taskId => allTasksForWorkflow.find(t => t.id === taskId)) // Renamed
      .filter(Boolean) as Task[];

    return tasksInColumn.sort((a, b) => {
      return column.taskIds.indexOf(a.id) - column.taskIds.indexOf(b.id);
    });
  };

  const handleDragTaskStart = (event: React.DragEvent<HTMLDivElement>, taskId: string, sourceColumnId: string) => {
    event.dataTransfer.setData('application/json', JSON.stringify({ taskId, sourceColumnId }));
    event.dataTransfer.effectAllowed = "move";
  };

  const handleConfirmAddColumn = () => {
    if (newColumnNameInput.trim()) {
      onAddColumn(newColumnNameInput.trim());
      setNewColumnNameInput('');
    }
  };

  const handleCancelAddColumn = () => {
    setNewColumnNameInput('');
    setIsAddingColumn(false);
  };

  return (
    <div className="flex gap-4 p-4 h-full">
      {workflowColumns.map((column: Column) => ( // Renamed
        <KanbanColumn
          key={column.id}
          column={column}
          tasks={getTasksForColumn(column)}
          creatorProfiles={creatorProfiles}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
          onTaskDrop={onTaskDrop}
          onDragTaskStart={handleDragTaskStart}
          onUpdateColumnName={onUpdateColumnName}
          onToggleTaskCompleted={onToggleTaskCompleted}
        />
      ))}
      <div className="w-72 flex-shrink-0">
        {isAddingColumn ? (
          <Card className="p-3 bg-card rounded-lg shadow-sm">
            <Input
              autoFocus
              placeholder="Enter column name..."
              value={newColumnNameInput}
              onChange={(e) => setNewColumnNameInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmAddColumn();
                }
              }}
              className="mb-2 text-sm"
            />
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleConfirmAddColumn}
                disabled={!newColumnNameInput.trim()}
                size="sm"
              >
                Add Column
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelAddColumn}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ) : (
          <div className="pt-1">
            <Button
              variant="ghost"
              className="w-full h-10 border-2 border-dashed border-border hover:border-primary/70 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors duration-150 ease-in-out"
              onClick={() => setIsAddingColumn(true)}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add another column
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
