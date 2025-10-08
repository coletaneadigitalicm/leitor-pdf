import { Routes } from '@angular/router';

import { ShellComponent } from './core/layout/shell.component';
import { ViewerPageComponent } from './features/viewer/viewer-page.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        component: ViewerPageComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
