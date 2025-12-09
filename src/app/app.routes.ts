import { Routes } from '@angular/router';
import { HomePage } from './pages/home-page/home-page';
import { PrivatePage } from './pages/private-page/private-page';
import { LoginPage } from './pages/login-page/login-page';
import { SettingsPage } from './pages/settings-page/settings-page';
import { DashboardPage } from './pages/dashboard-page/dashboard-page';
import { AccountPage } from './pages/account-page/account-page';
import { ProjectsPage } from './pages/projects-page/projects-page';
import { ProjectPage } from './pages/project-page/project-page';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    title: 'Accueil'
  },
  {
    path: 'login',
    component: LoginPage,
    title: 'Connexion'
  },
  {
    path: 'projects',
    component: PrivatePage,
    title: 'Mes projets'
  },
  {
    path: 'settings',
    component: SettingsPage,
    title: 'Mes paramètres'
  },
  {
    path: 'dashboard',
    component: DashboardPage,
    title: 'Mon tableau de bord'
  },
  {
    path: 'account',
    component: AccountPage,
    title: 'Mon compte'
  },
  {
    path: 'projects',
    component: ProjectsPage,
    title: 'Mes projets'
  },
  { path: 'project/:id', 
    component: ProjectPage ,
    title: 'Détail du projet'
},
];
