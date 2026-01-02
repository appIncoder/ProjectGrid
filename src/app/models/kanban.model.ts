export type KanbanStatus = 'todo' | 'inprogress' | 'waiting' | 'done';
export type LaneId = string;

export type KanbanResource = {
  id: string;
  name: string;
  kind?: 'person' | 'team';
  avatarUrl?: string;
};

export type KanbanCard = {
  id: string;
  title: string;
  description?: string;
  assignees?: KanbanResource[];
  status: KanbanStatus;
  laneId: LaneId;
};

export type SprintInfo = {
  name: string;
  goal?: string;
  start?: string;
  end?: string;
};

export type Lane = { id: LaneId; label: string };
