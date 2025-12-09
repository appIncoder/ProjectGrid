import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-box',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-box.html',
  styleUrls: ['./login-box.scss']
})
export class LoginBox {
  model = {
    username: '',
    password: ''
  };

  onSubmit() {
    console.log('Tentative de connexion', this.model);
    // À brancher sur AuthService + backend plus tard
  }
}
