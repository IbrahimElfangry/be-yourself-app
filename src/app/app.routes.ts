import { Routes } from '@angular/router';
import { MainDashboardComponent } from './features/main-dashboard/main-dashboard.component';
import { LiveCompanionComponent } from './features/live-companion/live-companion.component';

export const routes: Routes = [
  {
    path: '',
    component: MainDashboardComponent,
    title: 'Be Yourself | High-Performance Discipline Suite'
  },
  {
    path: 'live-stream',
    component: LiveCompanionComponent,
    title: 'Live Companion Stream | Be Yourself'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
