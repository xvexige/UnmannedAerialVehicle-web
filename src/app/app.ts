import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthService } from './core/auth/auth.service';
import { AuthActions } from './store/auth/auth.actions';
import { WsService } from './core/websocket/ws.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet/>`,
})
export class App implements OnInit {
  private auth = inject(AuthService);
  private store = inject(Store);
  private ws = inject(WsService);

  ngOnInit() {
    const user = this.auth.getCurrentUser();
    if (user) {
      this.store.dispatch(AuthActions.restoreSession({ user }));
      this.ws.connect();
    }
  }
}
