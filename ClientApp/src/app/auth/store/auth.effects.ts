import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Actions, Effect, ofType} from '@ngrx/effects';
import {merge, Observable, of, throwError} from 'rxjs/index';

import * as authActions from './auth.actions';
import * as authReducer from './auth.reducers';
import {LoginViewModel} from '../login/login-view-model';
import {catchError, map, mergeMap, retryWhen, switchMap} from 'rxjs/internal/operators';
import {ActivatedRoute, ActivatedRouteSnapshot, Params, Router} from '@angular/router';
import {GetTokenService} from '../../sources/shared/getToken.service';
import {SignupViewmodel} from '../signup/sign-up-view-model';
import {Action, Store} from '@ngrx/store';
import {LoginWithEmail, LoginWithFacebook, SendForgotEmail, SignupWithEmail} from './auth.actions';

@Injectable()
export class UserEffects {


  @Effect()
  logInWithEmail$: Observable<Action> = this.actions$.pipe(
    ofType<LoginWithEmail>('LOGIN_WITH_EMAIL'),
    mergeMap((action) => {
        this.store.dispatch(new authActions.AuthSpinnerShow());
        this.store.dispatch(new authActions.IncorrectAuthHide());
        console.log('action: ' + action.payload);
        return this.httpClient.post('https://localhost:44312/api/auth/login', action.payload, {
          observe: 'body',
          responseType: 'json'
        }).pipe(
          // If successful, dispatch success action with result
          mergeMap(data => {
            this.gts.routeAfterLogIn();
            return [
               {type: 'SET_TOKEN', payload: data },
               {type: 'AUTH_SPINNER_HIDE'},
               {type: 'INCORRECT_AUTH_HIDE'},
             ];
            }
          ),
          // If request fails, dispatch failed action
          // catchError(() => of({ type: 'LOGIN_FAILED' }, {type: 'AUTH_SPINNER_HIDE'}))
          catchError(() => [{type: 'AUTH_SPINNER_HIDE'}, {type: 'INCORRECT_AUTH_SHOW'}]) // SIGN_UP_FAILED
        );
      }
    )
  );

  @Effect()
  logInWithFacebook$: Observable<Action> = this.actions$.pipe(
    ofType<LoginWithFacebook>('LOGIN_WITH_FACEBOOK'),
    mergeMap((action) => {
        this.store.dispatch(new authActions.AuthSpinnerShow());
        this.store.dispatch(new authActions.IncorrectAuthHide());
        this.store.dispatch(new authActions.SetFbToken(action.payload.accessToken));
        return this.httpClient.post('https://localhost:44312/api/facebooklogin', action.payload, {
          observe: 'body',
          responseType: 'json'
        }).pipe(
          mergeMap(data => {
            if (data['notFound']) {
              return [
                {type: 'FB_EMAIL_SHOW'},
                {type: 'AUTH_SPINNER_HIDE'},
                {type: 'INCORRECT_AUTH_HIDE'},
              ];
            }
            this.gts.routeAfterLogIn();
            this.store.dispatch(new authActions.SetFbToken(''));
            return [
               {type: 'SET_TOKEN', payload: data },
               {type: 'AUTH_SPINNER_HIDE'},
               {type: 'INCORRECT_AUTH_HIDE'},
             ];
            }
          ),
          catchError(() => [{type: 'AUTH_SPINNER_HIDE'}, {type: 'INCORRECT_AUTH_SHOW'}])
        );
      }
    )
  );

  @Effect()
  logInWithFbEmail$: Observable<Action> = this.actions$.pipe(
    ofType<LoginWithFacebook>('FB_EMAIL_LOGIN'),
    mergeMap((action) => {
      this.store.dispatch(new authActions.AuthSpinnerShow());
      this.store.dispatch(new authActions.FbEmailHide());
      this.store.dispatch(new authActions.IncorrectAuthHide());
      this.store.dispatch(new authActions.SetFbToken(''));
        return this.httpClient.post('https://localhost:44312/api/facebookloginemail', action.payload, {
          observe: 'body',
          responseType: 'json'
        }).pipe(
          mergeMap(data => {
            this.gts.routeAfterLogIn();
            this.store.dispatch(new authActions.SetFbToken(''));
            return [
               {type: 'SET_TOKEN', payload: data },
               {type: 'AUTH_SPINNER_HIDE'},
               {type: 'INCORRECT_AUTH_HIDE'},
             ];
            }
          ),
          catchError(() => [{type: 'AUTH_SPINNER_HIDE'}, {type: 'INCORRECT_AUTH_SHOW'}])
        );
      }
    )
  );

  @Effect()
  sendForgotEmail$: Observable<Action> = this.actions$.pipe(
    ofType<SendForgotEmail>('SEND_FORGOT_EMAIL'),
    mergeMap((action) => {
        this.store.dispatch(new authActions.AuthSpinnerShow());
        this.store.dispatch(new authActions.IncorrectAuthHide());
        return this.httpClient.post('https://localhost:44312/api/accounts/resetpassword', action.payload, {
          observe: 'body',
          responseType: 'text'
        }).pipe(
          mergeMap(data => {
            return [
               {type: 'AUTH_SPINNER_HIDE'},
               {type: 'INCORRECT_AUTH_HIDE'},
               {type: 'FORGOT_EMAIL_SENT_SHOW'},
             ];
            }
          ),
          catchError(() => [
            {type: 'AUTH_SPINNER_HIDE'},
            {type: 'INCORRECT_AUTH_SHOW'},
            {type: 'FORGOT_EMAIL_SENT_HIDE'},
          ])
        );
      }
    )
  );


  @Effect()
  signupWithEmail$: Observable<Action> = this.actions$.pipe(
    ofType<SignupWithEmail>('SIGNUP_WITH_EMAIL'),
    mergeMap ((action) => {
        this.store.dispatch(new authActions.RegSpinnerShow());
        this.store.dispatch(new authActions.EmailExistsAlertHide());
        return this.httpClient.post('https://localhost:44312/api/accounts', action.payload, {
          observe: 'body',
          responseType: 'text'
        }).pipe(
          mergeMap((tmp) => {
            const logInInfo: LoginViewModel = {username: action.payload['email'], password: action.payload['password']};
            return [{
                type: authActions.LOGIN_WITH_EMAIL,
                payload: logInInfo
              },
              {type: 'REG_SPINNER_HIDE'},
              {type: 'EMAIL_EXISTS_ALERT_HIDE'}
              ];
          }),
          // catchError(() => of([{ type: 'LOGIN_FAILED' }, {type: 'REG_SPINNER_HIDE'}]))
          catchError(() => [{type: 'REG_SPINNER_HIDE'}, {type: 'EMAIL_EXISTS_ALERT_SHOW'}]) // SIGN_UP_FAILED
          );
      }
    )

    );




  // @Effect()
  // logInWithEmail = this.actions$.pipe(
  //   ofType(authActions.LOGIN_WITH_EMAIL).pipe(
  //     switchMap ((action: authActions.LoginWithEmail) => {
  //           return this.httpClient.post<LoginViewModel>('https://localhost:44312/api/auth/login', action.payload, {
  //             observe: 'body',
  //             responseType: 'json'
  //           }).pipe(
  //             map(tmp => {
  //               // console.log(JSON.stringify(tmp));
  //               localStorage.setItem('access_token', tmp['auth_token']);
  //               localStorage.setItem('ref_token', tmp['ref_token']);
  //               this.gts.routeAfterLogIn();
  //               this.store.dispatch(new authActions.AuthSpinnerHide());
  //               return {
  //                 type: authActions.SET_TOKEN,
  //                 payload: tmp
  //               };
  //             })
  //             , catchError(() =>
  //               // this.store.dispatch(new authActions.AuthSpinnerHide());
  //               of(new EffectError())
  //             )
  //           );
  //         }
  //       )
  //     // ,
  //     // catchError()
  //   ));
  //
  //
  // @Effect()
  // signupWithEmail = this.actions$.pipe(
  //   ofType(authActions.SIGNUP_WITH_EMAIL).pipe(
  //     switchMap ((action: authActions.SignupWithEmail) => {
  //         return this.httpClient.post('https://localhost:44312/api/accounts', action.payload, {
  //           observe: 'body',
  //           responseType: 'text'
  //         }).pipe(
  //           map((tmp) => {
  //             console.log(tmp);
  //             console.log('asd');
  //             const logInInfo: LoginViewModel = {username: action.payload['email'], password: action.payload['password']};
  //             console.log(logInInfo);
  //             this.store.dispatch(new authActions.RegSpinnerHide());
  //             return {
  //               type: authActions.LOGIN_WITH_EMAIL,
  //               payload: logInInfo
  //             };
  //           })
  //           // , catchError(() =>
  //           //   // this.store.dispatch(new authActions.RegSpinnerHide());
  //           //   of(new EffectError())
  //           // )
  //           , catchError(err => {
  //             console.log(1);
  //             this.store.dispatch(new authActions.RegSpinnerHide());
  //             return this.errorHandler(err);
  //             // return throwError(err);
  //             }
  //           )
  //         );
  //       }
  //     )
  //
  //   ));






  // @Effect()
  // signupWithEmail = this.actions$
  //   .ofType(authActions.SIGNUP_WITH_EMAIL).pipe(
  //     switchMap ((action: authActions.SignupWithEmail) => {
  //         return this.httpClient.post<SignupViewmodel>('https://localhost:44312/api/accounts', action.payload, {
  //           observe: 'body',
  //           responseType: 'json'
  //         });
  //       }
  //     ),
  //     // ეგრევე ამეორებს მეორეჯერ და სუ ესაა
  //     // , retryWhen (
  //     //   actn => {
  //     //     console.log(actn);
  //     //
  //     //     return this.httpClient.post<SignupViewmodel>('https://localhost:44312/api/accounts', actn, {
  //     //       observe: 'body',
  //     //       responseType: 'json'
  //     //     });
  //     //   }
  //     // ),
  //     map(tmp => {
  //       // console.log(JSON.stringify(tmp));
  //
  //       console.log(tmp);
  //       // localStorage.setItem('access_token', tmp['auth_token']);
  //       // localStorage.setItem('ref_token', tmp['ref_token']);
  //       // this.gts.routeAfterLogIn();
  //
  //       return {
  //         type: authActions.SET_TOKEN,
  //         payload: tmp
  //       };
  //     })
  //     , catchError(() => of(new EffectError()))
  //   );
  //

  constructor(private actions$: Actions,
              private httpClient: HttpClient,
              private gts: GetTokenService,
              private store: Store<authReducer.UserState>) {}
}