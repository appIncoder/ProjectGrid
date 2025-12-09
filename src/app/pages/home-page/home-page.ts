import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PublicPage } from '../public-page/public-page';
import { PrivatePage } from '../private-page/private-page';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, PublicPage, PrivatePage],
  templateUrl: './home-page.html'
})
export class HomePage {
  constructor(public auth: AuthService) { }
}
