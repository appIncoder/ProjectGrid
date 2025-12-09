import { Injectable } from '@angular/core';

export interface ProjectActionPayload {
  projectId: string;
  reason?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  pauseProject(payload: ProjectActionPayload): void {
    // Ici tu mettras ton appel HTTP / Firebase / autre
    console.log('Service: pauseProject', payload);
  }

  archiveProject(payload: ProjectActionPayload): void {
    // Ici aussi un vrai appel backend plus tard
    console.log('Service: archiveProject', payload);
  }
}
