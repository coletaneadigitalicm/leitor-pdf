import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GitSubmoduleService {
  private readonly isGitSubmoduleSubject = new BehaviorSubject<boolean>(false);
  
  readonly isGitSubmodule$ = this.isGitSubmoduleSubject.asObservable();
  
  get isGitSubmodule(): boolean {
    return this.isGitSubmoduleSubject.value;
  }
  
  setGitSubmoduleMode(isGitSubmodule: boolean): void {
    this.isGitSubmoduleSubject.next(isGitSubmodule);
  }
  
  parseGitSubmoduleParam(value: string | null): boolean {
    if (!value) return false;
    
    // Accept: 1, "1", true, "true" as true
    // Accept: 0, "0", false, "false" as false
    const normalizedValue = value.toString().toLowerCase().trim();
    return normalizedValue === '1' || normalizedValue === 'true';
  }
}
