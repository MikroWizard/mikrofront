// your.component.ts or service.ts
import { Injectable } from '@angular/core';
import {jwtDecode} from 'jwt-decode';

interface JwtPayload {
  // Define keys you expect from the JWT payload
  sub?: string;
  name?: string;
  email?: string;
  exp?: number;
  [key: string]: any; // to allow additional keys
}

export class MikroWizardUtils {

    public static decodeJWT(token: any) {
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            console.log('Decoded JWT:', decoded);
            console.log('User email:', decoded['unique_name']);
            return decoded;
        } catch (error) {
            console.error('Invalid JWT token:', error);
            return null;
        }
	}
}
