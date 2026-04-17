import { Routes } from '@angular/router';
import { AffectationComponent } from './affectation/affectation.component';

export const routes: Routes = [
  { path: '', redirectTo: '/affectation', pathMatch: 'full' },
  { path: 'affectation', component: AffectationComponent }
];
