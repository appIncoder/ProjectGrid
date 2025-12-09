import { Component } from '@angular/core';
import { LoginBox } from '../../shared/login-box/login-box';

@Component({
  selector: 'app-public-page',
  standalone: true,
  imports: [LoginBox],
  templateUrl: './public-page.html',
  styleUrls: ['./public-page.scss']
})
export class PublicPage { }
